import os
import logging
import threading
from copy import deepcopy
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
from flask import Flask, jsonify, request, render_template

from app.broadcast.models import BroadcastStore
from app.broadcast.http_client import HttpClient
from app.broadcast import routes as broadcast_routes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mock_media_settings.broadcaster")

load_dotenv()

DEFAULT_AIRCRAFT_BASE_URL = os.getenv("AIRCRAFT_BASE_URL", "http://localhost:9000")
DEFAULT_REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "5.0"))
DEFAULT_AIRCRAFT_ID = os.getenv("DEFAULT_AIRCRAFT_ID", "A1")

class CampaignUpdateStore:
    def __init__(self):
        self.updates: List[Dict[str, Any]] = []
        self._id_counter = 1
        self._lock = threading.Lock()

    def log_update(self, tail_number: str, rule_id: str,
                   adload_version: str, update_type: str) -> int:
        with self._lock:
            entry = {
                "id": self._id_counter,
                "tail_number": tail_number,
                "rule_id": rule_id,
                "adload_version": adload_version,
                "update_type": update_type,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
            self.updates.append(entry)
            logger.info(f"Campaign update: {entry}")
            self._id_counter += 1
            return entry["id"]

    def get_history(self, tail_number: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock:
            if tail_number:
                return [u for u in self.updates if u["tail_number"] == tail_number]
            return self.updates.copy()

app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), "..", "templates"),
    static_folder=os.path.join(os.path.dirname(__file__), "..", "static"),
)

# Base URL of the multi-aircraft rollback service (no trailing slash)
app.config.setdefault("AIRCRAFT_BASE_URL", DEFAULT_AIRCRAFT_BASE_URL)
app.config.setdefault("REQUEST_TIMEOUT", DEFAULT_REQUEST_TIMEOUT)
app.config.setdefault("DEFAULT_AIRCRAFT_ID", DEFAULT_AIRCRAFT_ID)

store = BroadcastStore()
app.config["STORE"] = store

campaign_store = CampaignUpdateStore()
app.config["CAMPAIGN_STORE"] = campaign_store


http_client = HttpClient(
    base_url=app.config["AIRCRAFT_BASE_URL"],
    timeout=app.config["REQUEST_TIMEOUT"],
    default_aircraft_id=app.config.get("DEFAULT_AIRCRAFT_ID"),
)

# ---------------------------------------------------------------------------
# Legacy-compatible helpers that wrap HttpClient
# ---------------------------------------------------------------------------


def _aircraft_url(aircraft_id: Optional[str], path: str) -> str:
    """
    Backwards-compatible URL builder.

    Retained for clarity and to keep behaviour identical to the original module.
    """
    base = app.config["AIRCRAFT_BASE_URL"].rstrip("/")
    aid = aircraft_id or app.config.get("DEFAULT_AIRCRAFT_ID")
    if aid is None:
        raise ValueError("No aircraft_id provided and DEFAULT_AIRCRAFT_ID is not configured")
    return f"{base}/aircraft/{aid}/{path.lstrip('/')}"

# Mock User Dashboard
@app.route('/user')
def about():
    """Render a mock user dashboard (for demo purposes)."""
    return render_template('user.html')


def _headend_url(path: str) -> str:
    """
    Backwards-compatible URL builder for headend-global endpoints.
    """
    base = app.config["AIRCRAFT_BASE_URL"].rstrip("/")
    return f"{base}/{path.lstrip('/')}"


def post_to_aircraft(
    aircraft_id: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Compatibility wrapper around HttpClient.post_to_aircraft so existing
    broadcast logic can remain unchanged.
    """
    return http_client.post_to_aircraft(aircraft_id, payload)


def get_from_aircraft(aircraft_id: str, path: str) -> Dict[str, Any]:
    """
    Compatibility wrapper mirroring original get_from_aircraft behaviour.
    """
    return http_client.get_from_aircraft(aircraft_id, path)


def get_aircraft_list() -> Dict[str, Any]:
    """
    Compatibility wrapper for listing aircraft via the headend.
    """
    return http_client.get_aircraft_list()


def get_headend_ping() -> Dict[str, Any]:
    """
    Compatibility wrapper for pinging the headend.
    """
    return http_client.get_headend_ping()


# ---------------------------------------------------------------------------
# JSON / aircraft selection helpers
# ---------------------------------------------------------------------------

def _accept_json_request() -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    try:
        payload = request.get_json(force=True)
        if not isinstance(payload, dict):
            raise ValueError("payload must be an object")
        return payload, None
    except Exception as e:
        return None, str(e)


def _extract_aircraft_ids(body: Dict[str, Any]) -> List[str]:
    """
    Determine which aircraft IDs to target from a request body.

    Supported shapes:

      - { "aircraft_id": "A1", ... }
      - { "aircraft_ids": ["A1", "A2"], ... }
      - if neither is present, falls back to DEFAULT_AIRCRAFT_ID.
    """
    aircraft_ids: List[str] = []

    if "aircraft_ids" in body and isinstance(body["aircraft_ids"], list):
        aircraft_ids = [str(a) for a in body["aircraft_ids"] if a]

    elif "aircraft_id" in body and body["aircraft_id"]:
        aircraft_ids = [str(body["aircraft_id"])]

    if not aircraft_ids:
        default_id = app.config.get("DEFAULT_AIRCRAFT_ID")
        if default_id:
            aircraft_ids = [str(default_id)]

    return sorted(set(aircraft_ids))


def _broadcast_to_aircrafts(
    msg_type: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Send the given message type/payload to one or more aircraft.

    The incoming payload may contain `aircraft_id` or `aircraft_ids` control
    fields; these are stripped before sending the actual payload to aircraft.

    Returns a dict:
      {
        "local": {
          "record_id": int,
          "status": "ok"|"partial"|"failed",
          "target_aircraft_ids": [...],
          "ok_count": int,
          "fail_count": int,
        },
        "per_aircraft": {
          "<id>": {
            "outbound": {...},
            "result": {...}
          },
          ...
        }
      }
    """
    # decide which aircraft to target
    aircraft_ids = _extract_aircraft_ids(payload)
    if not aircraft_ids:
        return {
            "error": "no aircraft specified and DEFAULT_AIRCRAFT_ID not configured",
            "detail": "Provide 'aircraft_id' or 'aircraft_ids', or configure DEFAULT_AIRCRAFT_ID",
        }

    # remove routing hints before sending to aircraft
    outbound_payload = deepcopy(payload)
    outbound_payload.pop("aircraft_id", None)
    outbound_payload.pop("aircraft_ids", None)

    entry = store.add_entry(msg_type, outbound_payload)

    campaign_store_obj = app.config["CAMPAIGN_STORE"]

    per_aircraft_results: Dict[str, Any] = {}
    ok_count = 0
    fail_count = 0

    for aid in aircraft_ids:
        wire_payload = {
            "type": msg_type,
            "payload": deepcopy(outbound_payload),
        }
        remote = post_to_aircraft(aid, wire_payload)

        # Determine per-aircraft ok/fail
        remote_result = remote.get("result", {}) if isinstance(remote, dict) else {}
        is_ok = bool(remote_result.get("ok"))
        if is_ok:
            ok_count += 1
        else:
            fail_count += 1

        campaign_store_obj.log_update(
            tail_number=aid,
            rule_id=payload.get("rule_id", "N/A"),
            adload_version=str(payload.get("adload_version", payload.get("version", "unknown"))),
            update_type=payload.get("update_type", msg_type)
        )
        try:
            last_update = campaign_store_obj.updates[-1] if campaign_store_obj.updates else None
        except Exception as e:
            last_update = None
        print("Logged campaign update event:", last_update)

        per_aircraft_results[aid] = remote

        # Provisional status; final one recomputed after loop
        status = "ok" if fail_count == 0 else ("partial" if ok_count > 0 else "failed")
        store.update_entry_for_aircraft(entry.id, aid, status, remote)

    # Final aggregate status
    if fail_count == 0:
        status = "ok"
    elif ok_count == 0:
        status = "failed"
    else:
        status = "partial"

    # Ensure final status is stored at least once (for last aircraft)
    if aircraft_ids:
        last_aid = aircraft_ids[-1]
        store.update_entry_for_aircraft(entry.id, last_aid, status, per_aircraft_results[last_aid])

    return {
        "local": {
            "record_id": entry.id,
            "status": status,
            "target_aircraft_ids": aircraft_ids,
            "ok_count": ok_count,
            "fail_count": fail_count,
        },
        "per_aircraft": per_aircraft_results,
    }


broadcast_routes.init_app(
    app,
    store,
    accept_json_request=_accept_json_request,
    broadcast_to_aircrafts=_broadcast_to_aircrafts,
    get_aircraft_list=get_aircraft_list,
    get_headend_ping=get_headend_ping,
    get_from_aircraft=get_from_aircraft,
)


@app.route("/api/v1/campaign-updates/history", methods=["GET"])
def get_campaign_history():
    store_obj = app.config["CAMPAIGN_STORE"]
    tail_number = request.args.get("tail_number")
    history = store_obj.get_history(tail_number)

    return jsonify({
        "ok": True,
        "count": len(history),
        "updates": history
    }), 200


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "9001"))
    debug = os.getenv("FLASK_DEBUG", "1") == "1"

    print("\n" + "="*60)
    print("📋 AVAILABLE ROUTES:")
    print("="*60)
    for rule in app.url_map.iter_rules():
        methods_set = set(rule.methods) if rule.methods else set()
        methods_set = methods_set - {"HEAD", "OPTIONS"}
        methods = ", ".join(sorted(methods_set)) if methods_set else ""
        print(f"  [{methods:6}] {rule.rule}")
    print("="*60 + "\n")

    logger.info(
        "Starting broadcaster on %s:%s -> headend_base=%s default_aircraft_id=%s",
        host,
        port,
        app.config["AIRCRAFT_BASE_URL"],
        app.config.get("DEFAULT_AIRCRAFT_ID"),
    )
    app.run(host=host, port=port, debug=debug)
