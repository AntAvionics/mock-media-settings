from __future__ import annotations

import logging
from typing import Any, Dict, Tuple, Optional
from app.broadcast.campaign_models import CampaignUpdate

from flask import jsonify, render_template, request

logger = logging.getLogger("mock_media_settings.broadcast.routes")

_app = None
_store = None

_accept_json_request_fn = None
_broadcast_to_aircrafts_fn = None
_get_aircraft_list_fn = None
_get_headend_ping_fn = None
_get_from_aircraft_fn = None


def init_app(
    app,
    store,
    *,
    accept_json_request,
    broadcast_to_aircrafts,
    get_aircraft_list,
    get_headend_ping,
    get_from_aircraft,
) -> None:
    global _app, _store
    global _accept_json_request_fn
    global _broadcast_to_aircrafts_fn
    global _get_aircraft_list_fn
    global _get_headend_ping_fn
    global _get_from_aircraft_fn

    _app = app
    _store = store

    _accept_json_request_fn = accept_json_request
    _broadcast_to_aircrafts_fn = broadcast_to_aircrafts
    _get_aircraft_list_fn = get_aircraft_list
    _get_headend_ping_fn = get_headend_ping
    _get_from_aircraft_fn = get_from_aircraft

    _register_routes(app)


def _accept_json_request() -> Tuple[Dict[str, Any] | None, str | None]:
    if _accept_json_request_fn is None:
        raise RuntimeError("accept_json_request function is not configured")
    return _accept_json_request_fn()


def _broadcast_to_aircrafts(
    msg_type: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    if _broadcast_to_aircrafts_fn is None:
        raise RuntimeError("broadcast_to_aircrafts function is not configured")
    return _broadcast_to_aircrafts_fn(msg_type, payload)


def _get_aircraft_list() -> Dict[str, Any]:
    if _get_aircraft_list_fn is None:
        raise RuntimeError("get_aircraft_list function is not configured")
    return _get_aircraft_list_fn()


def _get_headend_ping() -> Dict[str, Any]:
    if _get_headend_ping_fn is None:
        raise RuntimeError("get_headend_ping function is not configured")
    return _get_headend_ping_fn()


def _get_from_aircraft(aircraft_id: str, path: str) -> Dict[str, Any]:
    if _get_from_aircraft_fn is None:
        raise RuntimeError("get_from_aircraft function is not configured")
    return _get_from_aircraft_fn(aircraft_id, path)


def _require_app():
    if _app is None:
        raise RuntimeError("broadcast.routes.init_app() has not been called yet")
    return _app


def _require_store():
    if _store is None:
        raise RuntimeError("broadcast.routes.init_app() has not been called yet")
    return _store


# ---------------------------------------------------------------------------
# Route registration
# ---------------------------------------------------------------------------


def _register_routes(app) -> None:
    """
    Register all routes on the given Flask app.

    This is split out so we can keep `init_app` focused purely on
    wiring, and keep all `@app.route` usage in one place.
    """

    @app.route("/")
    def index():
        """
        Render the dashboard UI.

        The frontend can use:
          - /api/aircraft         to list aircraft
          - /api/headend_ping     to see headend health
          - /api/aircraft_ping    to ping a specific aircraft
          - /api/send_*           to send messages to one or more aircraft
        """
        app_obj = _require_app()
        return render_template(
            "index.html",
            aircraft_base_url=app_obj.config["AIRCRAFT_BASE_URL"],
            default_aircraft_id=app_obj.config.get("DEFAULT_AIRCRAFT_ID"),
        )

    # ------------------------------------------------------------------
    # History / state endpoints
    # ------------------------------------------------------------------

    @app.route("/api/state", methods=["GET"])
    def api_state():
        """
        Return the broadcast history.
        """
        store = _require_store()
        return jsonify(store.get_state())

    @app.route("/api/history", methods=["GET"])
    def api_history():
        """
        Alias for /api/state.
        """
        store = _require_store()
        return jsonify(store.get_state())

    @app.route("/api/v1/campaign-updates/history", methods=["GET"])
    def api_campaign_updates_history_v1():
        """
        Return campaign update history (v1 compatibility endpoint).

        Query params:
          ?tail_number=<TAIL_NUMBER>   (optional) - filter updates by tail_number

        This mirrors the legacy route previously defined on the application top-level
        module so callers of /api/v1/campaign-updates/history get the same behavior
        when using the broadcast routes module.
        """
        app_obj = _require_app()
        campaign_store = app_obj.config.get("CAMPAIGN_STORE")
        if campaign_store is None:
            return jsonify({"ok": False, "error": "CAMPAIGN_STORE not configured"}), 500

        tail_number = request.args.get("tail_number")
        try:
            history = campaign_store.get_history(tail_number)
        except Exception as e:
            # Defensive: if the campaign store misbehaves, return a 500 with details.
            return jsonify({"ok": False, "error": "failed to retrieve history", "detail": str(e)}), 500

        return jsonify({"ok": True, "count": len(history), "updates": history}), 200

    # ------------------------------------------------------------------
    # Broadcast endpoints
    # ------------------------------------------------------------------

    @app.route("/api/send_patch", methods=["POST"])
    def api_send_patch():
        """
        Broadcast a PATCH message to one or more aircraft via the multi-aircraft
        rollback service and record it in history.

        JSON body:
          {
            "aircraft_id": "A1",           # optional, or
            "aircraft_ids": ["A1", "A2"],  # optional
            ... payload fields ...
          }

        If no aircraft_id(s) specified, DEFAULT_AIRCRAFT_ID is used (if set).
        """
        body, err = _accept_json_request()
        if err:
            return jsonify({"error": "invalid payload", "detail": err}), 400
        if body is None:
            return jsonify({"error": "invalid payload", "detail": "empty body"}), 400

        result = _broadcast_to_aircrafts("PATCH", body)
        if "error" in result:
            return jsonify(result), 400

        local = result.get("local", {})
        status = local.get("status")
        if status == "ok":
            http_status = 200
        elif status == "partial":
            # Multi-Status / partial success
            http_status = 207
        else:
            http_status = 502

        return jsonify(result), http_status

    @app.route("/api/send_full", methods=["POST"])
    def api_send_full():
        """
        Broadcast a FULL snapshot to one or more aircraft via the multi-aircraft
        rollback service and record it in history.

        Same routing rules as /api/send_patch.
        """
        body, err = _accept_json_request()
        if err:
            return jsonify({"error": "invalid payload", "detail": err}), 400
        if body is None:
            return jsonify({"error": "invalid payload", "detail": "empty body"}), 400

        result = _broadcast_to_aircrafts("FULL", body)
        if "error" in result:
            return jsonify(result), 400

        local = result.get("local", {})
        status = local.get("status")
        if status == "ok":
            http_status = 200
        elif status == "partial":
            http_status = 207
        else:
            http_status = 502

        return jsonify(result), http_status

    @app.route("/api/send_rollback", methods=["POST"])
    def api_send_rollback():
        """
        Broadcast a ROLLBACK command to one or more aircraft via the
        multi-aircraft rollback service and record it in history.

        Same routing rules as /api/send_patch.
        """
        body, err = _accept_json_request()
        if err:
            return jsonify({"error": "invalid payload", "detail": err}), 400
        if body is None:
            return jsonify({"error": "invalid payload", "detail": "empty body"}), 400

        result = _broadcast_to_aircrafts("ROLLBACK", body)
        if "error" in result:
            return jsonify(result), 400

        local = result.get("local", {})
        status = local.get("status")
        if status == "ok":
            http_status = 200
        elif status == "partial":
            http_status = 207
        else:
            http_status = 502

        return jsonify(result), http_status

    # ------------------------------------------------------------------
    # Aircraft listing and ping helpers
    # ------------------------------------------------------------------

    @app.route("/api/aircraft", methods=["GET"])
    def api_aircraft_list():
        """
        List known aircraft as reported by the multi-aircraft rollback service.

        Proxies GET /aircraft on the rollback service.
        """
        result = _get_aircraft_list()
        code = 200 if result.get("ok") else 502
        return jsonify(result), code

    @app.route("/api/headend_ping", methods=["GET"])
    def api_headend_ping():
        """
        Ping the rollback headend itself (not a particular aircraft).

        Proxies GET /ping on the rollback service.
        """
        result = _get_headend_ping()
        code = 200 if result.get("ok") else 502
        return jsonify(result), code

    @app.route("/api/aircraft_ping", methods=["GET"])
    def api_aircraft_ping():
        """
        Ping a specific aircraft via its /aircraft/<id>/ping endpoint.

        Query params:
          ?aircraft_id=A1   (required unless DEFAULT_AIRCRAFT_ID is configured)
        """
        app_obj = _require_app()
        aircraft_id = request.args.get("aircraft_id") or app_obj.config.get(
            "DEFAULT_AIRCRAFT_ID"
        )
        if not aircraft_id:
            return (
                jsonify(
                    {
                        "ok": False,
                        "error": "aircraft_id is required (no DEFAULT_AIRCRAFT_ID configured)",
                    }
                ),
                400,
            )

        result = _get_from_aircraft(aircraft_id, "ping")
        code = 200 if result.get("ok") else 502
        return jsonify({"aircraft_id": aircraft_id, "result": result}), code

    @app.route("/api/aircraft_state", methods=["GET"])
    def api_aircraft_state():
        """
        Fetch configuration state from one aircraft's rollback service instance.

        Query params:
          ?aircraft_id=A1   (required unless DEFAULT_AIRCRAFT_ID is configured)

        Proxies GET /aircraft/<id>/state on the rollback service.
        """
        app_obj = _require_app()
        aircraft_id = request.args.get("aircraft_id") or app_obj.config.get(
            "DEFAULT_AIRCRAFT_ID"
        )
        if not aircraft_id:
            return (
                jsonify(
                    {
                        "ok": False,
                        "error": "aircraft_id is required (no DEFAULT_AIRCRAFT_ID configured)",
                    }
                ),
                400,
            )

        result = _get_from_aircraft(aircraft_id, "state")
        code = 200 if result.get("ok") else 502
        return jsonify({"aircraft_id": aircraft_id, "result": result}), code
    
    # ------------------------------------------------------------------
    # Campaign update endpoints (COA Story 3)
    # ------------------------------------------------------------------

    @app.route("/api/v1/campaign-updates", methods=["POST"])
    def submit_campaign_update():
        """
        Ground submits a campaign update. Returns a rule-id.

        COA-1: if payload matches an existing rule, return existing rule-id.
               if new, generate and store a new rule-id.
        COA-2: stores adload_version, campaign_ids, tail_number, timestamp.
        """

        data = request.get_json(force=True) or {}
        rm = app.config["RULE_MANAGER"]

        try:
            update = CampaignUpdate.from_dict(
                data,
                adload_version=data.get("adload_version"),
                tail_number=data.get("tail_number"),
            )
        except (KeyError, TypeError, ValueError) as e:
            return jsonify({"ok": False, "error": f"Invalid payload: {e}"}), 400

        payload_hash = rm._hash_payload(update)
        was_existing = payload_hash in rm._hash_index

        record = rm.get_or_create_rule(update)

        return jsonify({
            "ok": True,
            "rule_id": record.rule_id,
            "is_duplicate": was_existing,
            "record": record.to_dict(),
        }), 200

    @app.route("/api/v1/campaign-updates", methods=["GET"])
    def get_campaign_updates():
        rm = app.config["RULE_MANAGER"]
        adload_version = request.args.get("adload-version")
        tail_number = request.args.get("tail-number")

        if not adload_version:
            return jsonify({"ok": False, "error": "adload-version is required"}), 400

        logger.info(
            "GET campaign-updates: tail=%s adload=%s",
            tail_number or "unknown", adload_version,
        )

        rules = rm.query(adload_version=adload_version)
        if not rules:
            return jsonify({
                "ok": True,
                "rule-id": None,
                "campaigns": [],
                "creatives": [],
                "message": f"No updates found for adload-version={adload_version}",
            }), 200

        latest = rules[0]  # query() returns newest-first
        meta = latest.metadata

        return jsonify({
            "ok": True,
            "rule-id": latest.rule_id,
            "campaigns": meta.get("campaigns", []),
            "creatives": meta.get("creatives", []),
            "targeting_zones": meta.get("targeting_zones", {}),
        }), 200

    @app.route("/api/v1/campaign-updates/status", methods=["POST"])
    def campaign_update_status():
        """
        Airside reports update progress back to ground.
        """
        data = request.get_json(force=True) or {}
        tail = data.get("tail")
        status = data.get("status")
        updated = data.get("updated")

        valid_statuses = {"METADATA_UPDATE_START", "METADATA_UPDATE_COMPLETE"}
        if not tail or not status or not updated:
            return jsonify({"ok": False, "error": "tail, status, and updated are required"}), 400
        if status not in valid_statuses:
            return jsonify({"ok": False, "error": f"status must be one of {valid_statuses}"}), 400

        updated_campaigns = data.get("updated_campaigns", [])
        logger.info(
            "Campaign status: tail=%s status=%s updated=%s campaigns=%s",
            tail, status, updated, updated_campaigns or "n/a",
        )

        response = {"ok": True, "tail": tail, "status": status, "updated": updated}
        if status == "METADATA_UPDATE_COMPLETE":
            response["updated_campaigns"] = updated_campaigns

        return jsonify(response), 200

    @app.route("/api/v1/campaign-updates/rules", methods=["GET"])
    def list_rules():
        """
        COA-5: query stored rules for ground tool and QuickSight reports.

        Query params (all optional — ANDed together):
          adload_version : filter by adload version
          tail_number    : filter by tail number
          campaign_id    : filter by campaign ID
        """
        rm = app.config["RULE_MANAGER"]

        adload_version = request.args.get("adload_version")
        tail_number = request.args.get("tail_number")
        campaign_id_raw = request.args.get("campaign_id")

        campaign_id: Optional[int] = None
        if campaign_id_raw is not None:
            try:
                campaign_id = int(campaign_id_raw)
            except ValueError:
                return jsonify({"ok": False, "error": "campaign_id must be an integer"}), 400

        results = rm.query(
            adload_version=adload_version,
            tail_number=tail_number,
            campaign_id=campaign_id,
        )

        return jsonify({
            "ok": True,
            "count": len(results),
            "rules": [r.to_dict() for r in results],
        }), 200

    @app.route("/api/v1/campaign-updates/rules/<rule_id>", methods=["GET"])
    def get_rule(rule_id: str):
        """COA-5: look up one rule by rule-id."""
        rm = app.config["RULE_MANAGER"]
        record = rm.get_by_rule_id(rule_id)
        if not record:
            return jsonify({"ok": False, "error": f"rule_id '{rule_id}' not found"}), 404
        return jsonify({"ok": True, "rule": record.to_dict()}), 200
