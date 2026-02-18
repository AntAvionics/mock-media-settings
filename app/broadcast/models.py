from __future__ import annotations

import logging
import threading
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger("mock_media_settings.broadcast.models")


@dataclass
class HistoryEntry:
    """
    Represents a single broadcast operation.

    Attributes
    ----------
    id:
        Monotonically increasing integer identifier assigned by the store.
    type:
        Message type that was broadcast, e.g. "PATCH", "FULL", "ROLLBACK".
    payload:
        Payload that was sent to the aircraft (after stripping control fields
        like `aircraft_id` / `aircraft_ids`).
    timestamp:
        UTC timestamp in ISO-8601 format with a trailing "Z".
    status:
        Aggregate status across all targeted aircraft:
        - "pending"
        - "ok"
        - "partial"
        - "failed"
    remote_by_aircraft:
        Per-aircraft response data keyed by aircraft id, for example:

        {
          "A1": {
            "outbound": {...},
            "result": {
              "ok": true,
              "status_code": 200,
              "response": {...},
              "elapsed_ms": 12.3,
              "_updated_at": "2024-01-01T00:00:00.000000Z"
            }
          },
          ...
        }
    """

    id: int
    type: str
    payload: Dict[str, Any]
    timestamp: str
    status: str = "pending"  # pending | ok | partial | failed
    remote_by_aircraft: Dict[str, Any] = field(default_factory=dict)


class BroadcastStore:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._history: List[HistoryEntry] = []
        self._next_id = 1

    # --------------------------------------------------------------------- #
    # Internal helpers
    # --------------------------------------------------------------------- #

    def _now_iso(self) -> str:
        """Return current UTC time in ISO-8601 with trailing Z."""
        return datetime.utcnow().isoformat() + "Z"

    # --------------------------------------------------------------------- #
    # Public API
    # --------------------------------------------------------------------- #

    def add_entry(self, msg_type: str, payload: Dict[str, Any]) -> HistoryEntry:
        """
        Add a new broadcast history entry.

        Parameters
        ----------
        msg_type:
            Broadcast message type, e.g. "PATCH", "FULL", "ROLLBACK".
        payload:
            The payload that will be sent to aircraft. This will be deep-copied
            so callers can mutate their object safely afterwards.

        Returns
        -------
        HistoryEntry
            The created entry.
        """
        with self._lock:
            entry = HistoryEntry(
                id=self._next_id,
                type=msg_type,
                payload=deepcopy(payload),
                timestamp=self._now_iso(),
            )
            self._next_id += 1
            # Insert most recent first for convenient retrieval.
            self._history.insert(0, entry)
            logger.info("History add: id=%s type=%s", entry.id, entry.type)
            return entry

    def update_entry_for_aircraft(
        self,
        entry_id: int,
        aircraft_id: str,
        status: str,
        remote: Dict[str, Any],
    ) -> Optional[HistoryEntry]:
        """
        Record / overwrite the result for a particular aircraft and update
        the aggregate `status` for the entry.

        The caller is responsible for computing the aggregate status
        ("ok" / "partial" / "failed") across all targeted aircraft.
        This method only stores data.

        Parameters
        ----------
        entry_id:
            Identifier of the entry to update.
        aircraft_id:
            Aircraft identifier for which a response was recorded.
        status:
            Aggregate status of the entire broadcast (not just this aircraft).
        remote:
            Per-aircraft result envelope to store under `remote_by_aircraft`.
            This will be deep-copied and annotated with `_updated_at`.

        Returns
        -------
        HistoryEntry | None
            The updated entry, or None if no entry with `entry_id` exists.
        """
        with self._lock:
            for entry in self._history:
                if entry.id == entry_id:
                    entry.remote_by_aircraft[aircraft_id] = deepcopy(remote)
                    entry.remote_by_aircraft[aircraft_id].setdefault(
                        "_updated_at", self._now_iso()
                    )
                    entry.status = status
                    logger.info(
                        "History update: id=%s aircraft=%s status=%s",
                        entry.id,
                        aircraft_id,
                        entry.status,
                    )
                    return entry

            logger.warning(
                "History update: entry not found (id=%s aircraft=%s)",
                entry_id,
                aircraft_id,
            )
            return None

    def get_state(self) -> Dict[str, Any]:
        """
        Return a JSON-serializable snapshot of the current store state.

        Structure:

            {
              "history": [
                {
                  "id": ...,
                  "type": ...,
                  "timestamp": ...,
                  "status": ...,
                  "payload": {...},
                  "remote_by_aircraft": {...}
                },
                ...
              ]
            }

        Returns
        -------
        dict
            Deep-copied representation of the store contents.
        """
        with self._lock:
            return {
                "history": [
                    {
                        "id": entry.id,
                        "type": entry.type,
                        "timestamp": entry.timestamp,
                        "status": entry.status,
                        "payload": deepcopy(entry.payload),
                        "remote_by_aircraft": deepcopy(entry.remote_by_aircraft),
                    }
                    for entry in self._history
                ]
            }

    # ------------------------------------------------------------------ #
    # Introspection / testing helpers (optional)
    # ------------------------------------------------------------------ #

    def list_entries(self) -> List[HistoryEntry]:
        """
        Return a shallow copy of the internal history list.

        This is primarily useful for tests or debugging and should not be
        mutated by callers.
        """
        with self._lock:
            return list(self._history)

    def clear(self) -> None:
        """Remove all stored history and reset the ID counter."""
        with self._lock:
            self._history.clear()
            self._next_id = 1
            logger.info("BroadcastStore cleared")
