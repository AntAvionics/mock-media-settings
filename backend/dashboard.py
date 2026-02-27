import os
import logging

from app.app import app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mock_media_settings.dashboard")


def create_app():
    return app


application = app


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "9001"))
    debug = os.getenv("FLASK_DEBUG", "1") == "1"

    logger.info(
        "Starting dashboard Flask app on %s:%s (debug=%s)",
        host,
        port,
        debug,
    )
    app.run(host=host, port=port, debug=debug)
