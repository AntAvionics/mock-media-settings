from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional

import requests

logger = logging.getLogger("mock_media_settings.http_client")


@dataclass
class HttpResult:
    ok: bool
    status_code: Optional[int]
    elapsed_ms: Optional[float]
    response: Any
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "ok": self.ok,
            "status_code": self.status_code,
            "elapsed_ms": None if self.elapsed_ms is None else round(self.elapsed_ms, 1),
            "response": self.response,
        }
        if self.error is not None:
            result["error"] = self.error
        return result

# Not really needed, but some wrappers I used for helpful logging while refactoring
class HttpClient:

    def __init__(
        self,
        base_url: str,
        timeout: float = 5.0,
        default_aircraft_id: Optional[str] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = float(timeout)
        self.default_aircraft_id = default_aircraft_id

    def aircraft_url(self, aircraft_id: Optional[str], path: str) -> str:
        """
        Build a URL to an aircraft-scoped endpoint.
        """
        aid = aircraft_id or self.default_aircraft_id
        if aid is None:
            raise ValueError(
                "No aircraft_id provided and default_aircraft_id is not configured"
            )
        return f"{self.base_url}/aircraft/{aid}/{path.lstrip('/')}"

    def headend_url(self, path: str) -> str:
        """
        Build a URL to a headend-global endpoint (not scoped by aircraft id).
        """
        return f"{self.base_url}/{path.lstrip('/')}"

    def post_json(self, url: str, payload: Dict[str, Any]) -> HttpResult:
        try:
            logger.info("HTTP POST %s type=%s", url, payload.get("type"))
            started = datetime.utcnow()
            resp = requests.post(url, json=payload, timeout=self.timeout)
            elapsed = (datetime.utcnow() - started).total_seconds() * 1000.0

            try:
                body: Any = resp.json()
            except Exception:
                body = resp.text

            ok = 200 <= resp.status_code < 300
            logger.info(
                "HTTP POST completed: ok=%s status=%s elapsed_ms=%.1f",
                ok,
                resp.status_code,
                elapsed,
            )
            return HttpResult(
                ok=ok,
                status_code=resp.status_code,
                elapsed_ms=elapsed,
                response=body,
            )
        except requests.RequestException as exc:
            logger.exception("HTTP POST failed: url=%s error=%s", url, exc)
            return HttpResult(
                ok=False,
                status_code=None,
                elapsed_ms=None,
                response=None,
                error=str(exc),
            )

    def get_json(self, url: str) -> HttpResult:
        """
        Perform a GET and return an HttpResult.
        """
        try:
            logger.info("HTTP GET %s", url)
            started = datetime.utcnow()
            resp = requests.get(url, timeout=self.timeout)
            elapsed = (datetime.utcnow() - started).total_seconds() * 1000.0

            try:
                body: Any = resp.json()
            except Exception:
                body = resp.text

            ok = 200 <= resp.status_code < 300
            logger.info(
                "HTTP GET completed: ok=%s status=%s elapsed_ms=%.1f",
                ok,
                resp.status_code,
                elapsed,
            )
            return HttpResult(
                ok=ok,
                status_code=resp.status_code,
                elapsed_ms=elapsed,
                response=body,
            )
        except requests.RequestException as exc:
            logger.exception("HTTP GET failed: url=%s error=%s", url, exc)
            return HttpResult(
                ok=False,
                status_code=None,
                elapsed_ms=None,
                response=None,
                error=str(exc),
            )


    def post_to_aircraft(
        self,
        aircraft_id: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        POST a payload to /aircraft/<id>/receive and wrap the result in the
        dict structure used by the broadcaster:

            {
              "outbound": <payload>,
              "result": { ... HttpResult.to_dict() ... }
            }
        """
        url = self.aircraft_url(aircraft_id, "receive")
        result = self.post_json(url, payload)
        return {
            "outbound": payload,
            "result": result.to_dict(),
        }

    def get_from_aircraft(self, aircraft_id: str, path: str) -> Dict[str, Any]:
        """
        Generic GET against /aircraft/<id>/<path> returning the broadcaster-
        style dict.
        """
        url = self.aircraft_url(aircraft_id, path)
        result = self.get_json(url)
        return result.to_dict()

    def get_aircraft_list(self) -> Dict[str, Any]:
        """
        GET /aircraft on the headend.
        """
        url = self.headend_url("aircraft")
        result = self.get_json(url)
        return result.to_dict()

    def get_headend_ping(self) -> Dict[str, Any]:
        """
        GET /ping on the headend.
        """
        url = self.headend_url("ping")
        result = self.get_json(url)
        return result.to_dict()
