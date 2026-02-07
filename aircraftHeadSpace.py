from flask import Flask, request, jsonify
from datetime import datetime
import random

app = Flask(__name__)

STATE = {
    "version": 1,
    "last_patch": None,
    "last_full": None,
}

@app.route("/receive", methods=["POST"])
def receive():
    msg = request.json or {}
    msg_type = msg.get("type")
    payload = msg.get("payload")

    print("\n=== AIRCRAFT RECEIVED ===")
    print(msg)

    # --- Simulated behavior ---
    if msg_type == "PATCH":
        STATE["last_patch"] = payload
        ok = random.random() > 0.1  # 90% success
        if not ok:
            return jsonify({
                "ok": False,
                "error": "Simulated patch validation failure"
            }), 400

    elif msg_type == "FULL":
        STATE["last_full"] = payload
        STATE["version"] += 1

    elif msg_type == "ROLLBACK":
        STATE["version"] -= 1

    return jsonify({
        "ok": True,
        "aircraft_time": datetime.utcnow().isoformat() + "Z",
        "state": STATE
    })


@app.route("/state", methods=["GET"])
def state():
    return jsonify(STATE)


if __name__ == "__main__":
    app.run(port=8000, debug=True)
