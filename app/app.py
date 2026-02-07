import os
import logging
import threading
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
import requests
from flask import Flask, jsonify, request, render_template

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mock_media_settings.broadcaster")

load_dotenv()
DEFAULT_AIRCRAFT_URL = os.getenv("AIRCRAFT_URL", "http://localhost:8000/receive")
DEFAULT_REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "5.0"))

@dataclass
class HistoryEntry:
    id: int
    type: str
    payload: Dict[str, Any]
    timestamp: str
    status: str = "pending"  # pending | ok | failed
    remote: Dict[str, Any] = field(default_factory=dict)

# In-memory history, simulates as if there was a DB
class BroadcastStore:
    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.history: List[HistoryEntry] = []
        self.next_id = 1

    def add_entry(self, msg_type: str, payload: Dict[str, Any]) -> HistoryEntry:
        with self.lock:
            entry = HistoryEntry(
                id=self.next_id,
                type=msg_type,
                payload=deepcopy(payload),
                timestamp=datetime.utcnow().isoformat() + "Z",
            )
            self.next_id += 1
            self.history.insert(0, entry)
            logger.info("History add: id=%s type=%s", entry.id, entry.type)
            return entry

    def update_entry(self, entry_id: int, status: str, remote: Dict[str, Any]) -> Optional[HistoryEntry]:
        with self.lock:
            for e in self.history:
                if e.id == entry_id:
                    e.status = status
                    e.remote = deepcopy(remote)
                    # annotate remote with update time so operators can see when we recorded the reply
                    e.remote.setdefault("_updated_at", datetime.utcnow().isoformat() + "Z")
                    logger.info("History update: id=%s status=%s", e.id, e.status)
                    return e
            logger.warning("History update: id=%s not found", entry_id)
            return None

    def get_state(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "history": [
                    {
                        "id": e.id,
                        "type": e.type,
                        "timestamp": e.timestamp,
                        "status": e.status,
                        "payload": deepcopy(e.payload),
                        "remote": deepcopy(e.remote),
                    }
                    for e in self.history
                ]
            }


app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), "..", "templates"),
)

app.config.setdefault("AIRCRAFT_URL", DEFAULT_AIRCRAFT_URL)
app.config.setdefault("REQUEST_TIMEOUT", DEFAULT_REQUEST_TIMEOUT)

store = BroadcastStore()
app.config["STORE"] = store

def post_to_aircraft(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Post payload to the configured aircraft endpoint and return a structured result.

    Returns a dict:
      {
        "outbound": <the payload that was sent>,
        "result": {
          "ok": bool,                  # True for 2xx
          "status_code": int | None,
          "response": <parsed json or text or None>,
          "error": <string on exception> (optional),
          "elapsed_ms": <float>        # optional approximate round-trip ms
        }
      }
    """
    url = app.config["AIRCRAFT_URL"]
    timeout = app.config["REQUEST_TIMEOUT"]
    try:
        logger.info("POST -> aircraft %s payload type=%s", url, payload.get("type"))
        started = datetime.utcnow()
        resp = requests.post(url, json=payload, timeout=timeout)
        elapsed = (datetime.utcnow() - started).total_seconds() * 1000.0
        try:
            body = resp.json()
        except Exception:
            body = resp.text
        ok = 200 <= resp.status_code < 300
        result = {"ok": ok, "status_code": resp.status_code, "response": body, "elapsed_ms": round(elapsed, 1)}
        logger.info("Aircraft responded: ok=%s status=%s elapsed_ms=%.1f", result["ok"], resp.status_code, result["elapsed_ms"])
        return {"outbound": payload, "result": result}
    except requests.RequestException as e:
        logger.exception("Error posting to aircraft: %s", e)
        return {
            "outbound": payload,
            "result": {
                "ok": False,
                "status_code": None,
                "response": None,
                "error": str(e),
                "note": "Connection to aircraft failed",
            },
        }

# --- Routes ---------------------------------------------------------------
@app.route("/")
def index():
    """Render the dashboard UI."""
    return render_template("index.html", aircraft_url=app.config["AIRCRAFT_URL"])


@app.route("/api/state", methods=["GET"])
def api_state():
    """Return the broadcast history (no local configuration/state is stored here)."""
    return jsonify(store.get_state())


@app.route("/api/history", methods=["GET"])
def api_history():
    """Alias for /api/state."""
    return jsonify(store.get_state())


def _accept_json_request():
    try:
        payload = request.get_json(force=True)
        if not isinstance(payload, dict):
            raise ValueError("payload must be an object")
        return payload, None
    except Exception as e:
        return None, str(e)


@app.route("/api/send_patch", methods=["POST"])
def api_send_patch():
    """
    Broadcast a PATCH message to the aircraft and record it in history.
    """
    payload, err = _accept_json_request()
    if err:
        return jsonify({"error": "invalid payload", "detail": err}), 400

    entry = store.add_entry("PATCH", payload)
    outbound = {"type": "PATCH", "payload": deepcopy(payload)}
    remote = post_to_aircraft(outbound)
    remote_result = remote.get("result", {}) if isinstance(remote, dict) else {}

    status = "ok" if remote_result.get("ok") else "failed"
    store.update_entry(entry.id, status, remote)

    # Forward remote details to the caller. If remote failed, surface 502 so operator sees failure.
    response_body = {"local": {"record_id": entry.id}, "remote": remote}
    if not remote_result.get("ok"):
        return jsonify(response_body), 502
    return jsonify(response_body), 200


@app.route("/api/send_full", methods=["POST"])
def api_send_full():
    """
    Broadcast a FULL snapshot to the aircraft and record it in history.
    """
    payload, err = _accept_json_request()
    if err:
        return jsonify({"error": "invalid payload", "detail": err}), 400

    entry = store.add_entry("FULL", payload)
    outbound = {"type": "FULL", "payload": deepcopy(payload)}
    remote = post_to_aircraft(outbound)
    remote_result = remote.get("result", {}) if isinstance(remote, dict) else {}

    status = "ok" if remote_result.get("ok") else "failed"
    store.update_entry(entry.id, status, remote)

    response_body = {"local": {"record_id": entry.id}, "remote": remote}
    if not remote_result.get("ok"):
        return jsonify(response_body), 502
    return jsonify(response_body), 200


@app.route("/api/send_rollback", methods=["POST"])
def api_send_rollback():
    """
    Broadcast a ROLLBACK command to the aircraft and record it in history.
    """
    payload, err = _accept_json_request()
    if err:
        return jsonify({"error": "invalid payload", "detail": err}), 400

    entry = store.add_entry("ROLLBACK", payload)
    outbound = {"type": "ROLLBACK", "payload": deepcopy(payload)}
    remote = post_to_aircraft(outbound)
    remote_result = remote.get("result", {}) if isinstance(remote, dict) else {}

    status = "ok" if remote_result.get("ok") else "failed"
    store.update_entry(entry.id, status, remote)

    response_body = {"local": {"record_id": entry.id}, "remote": remote}
    if not remote_result.get("ok"):
        return jsonify(response_body), 502
    return jsonify(response_body), 200


@app.route("/api/ping", methods=["GET"])
def api_ping():
    """
    Ping the aircraft via GET and return its reported status/version.
    """
    url = app.config["AIRCRAFT_URL"]
    timeout = app.config["REQUEST_TIMEOUT"]

    try:
        logger.info("PING -> aircraft %s", url)
        started = datetime.utcnow()
        resp = requests.get(url, timeout=timeout)
        elapsed = (datetime.utcnow() - started).total_seconds() * 1000.0

        try:
            body = resp.json()
        except Exception:
            body = resp.text

        ok = 200 <= resp.status_code < 300

        return jsonify({
            "ok": ok,
            "status_code": resp.status_code,
            "elapsed_ms": round(elapsed, 1),
            "response": body
        }), 200 if ok else 502

    except requests.RequestException as e:
        logger.exception("Ping to aircraft failed")
        return jsonify({
            "ok": False,
            "error": str(e),
            "note": "Unable to reach aircraft"
        }), 502


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "1") == "1"
    logger.info("Starting broadcaster on %s:%s -> aircraft=%s", host, port, app.config["AIRCRAFT_URL"])
    app.run(host=host, port=port, debug=debug)
