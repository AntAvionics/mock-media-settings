import hashlib
import json
import logging
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.broadcast.campaign_models import CampaignUpdate, RuleRecord

logger = logging.getLogger("headend.rule_manager")

class RuleManager:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._store: Dict[str, RuleRecord] = {}
        self._hash_index: Dict[str, str] = {}

    def get_or_create_rule(
        self,
        update: CampaignUpdate,
    ) -> RuleRecord:
        payload_hash = self._hash_payload(update)

        with self._lock:
            existing_rule_id = self._hash_index.get(payload_hash)
            if existing_rule_id:
                record = self._store[existing_rule_id]
                logger.info(
                    "Dedup hit: returning existing rule_id=%s for hash=%s",
                    record.rule_id, payload_hash[:8],
                )
                return record

            rule_id = self._generate_rule_id(payload_hash)
            record = RuleRecord(
                rule_id=rule_id,
                payload_hash=payload_hash,
                adload_version=update.adload_version,
                campaign_ids=[c.id for c in update.campaigns],
                timestamp=datetime.now(timezone.utc),
                tail_number=update.tail_number,
                metadata=update.to_dict(),
            )
            self._persist_record(record)
            logger.info(
                "New rule created: rule_id=%s adload=%s campaigns=%s tail=%s",
                rule_id, update.adload_version, record.campaign_ids, update.tail_number,
            )
            return record

    def get_by_rule_id(self, rule_id: str) -> Optional[RuleRecord]:
        with self._lock:
            return self._store.get(rule_id)

    def query(
        self,
        adload_version: Optional[str] = None,
        tail_number: Optional[str] = None,
        campaign_id: Optional[int] = None,
    ) -> List[RuleRecord]:
        with self._lock:
            results = list(self._store.values())

        if adload_version is not None:
            results = [r for r in results if r.adload_version == adload_version]
        if tail_number is not None:
            results = [r for r in results if r.tail_number == tail_number]
        if campaign_id is not None:
            results = [r for r in results if campaign_id in r.campaign_ids]

        return sorted(results, key=lambda r: r.timestamp, reverse=True)

    def all_rules(self) -> List[RuleRecord]:
        with self._lock:
            return sorted(self._store.values(), key=lambda r: r.timestamp, reverse=True)

    @staticmethod
    def _hash_payload(update: CampaignUpdate) -> str:
        canonical = json.dumps(update.to_dict(), sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode()).hexdigest()

    @staticmethod
    def _generate_rule_id(payload_hash: str) -> str:
        return payload_hash[:16]

    def _persist_record(self, record: RuleRecord) -> None:
        self._store[record.rule_id] = record
        self._hash_index[record.payload_hash] = record.rule_id
