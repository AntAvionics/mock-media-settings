from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Union


@dataclass
class Route:
    origin: str
    destination: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "origin": self.origin,
            "destination": self.destination
        }

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "Route":
        return Route(
            origin=data["origin"],
            destination=data["destination"]
        )


@dataclass
class Targeting:
    routes: List[Route] = field(default_factory=list)
    flight_duration_min: Optional[int] = None
    flight_duration_max: Optional[int] = None
    time_of_day: List[str] = field(default_factory=list)
    audience_tags: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {}
        if self.routes:
            d["routes"] = [route.to_dict() for route in self.routes]
        if self.flight_duration_min is not None:
            d["flight_duration_min"] = self.flight_duration_min
        if self.flight_duration_max is not None:
            d["flight_duration_max"] = self.flight_duration_max
        if self.time_of_day:
            d["time_of_day"] = self.time_of_day
        if self.audience_tags:
            d["audience_tags"] = self.audience_tags
        return d

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "Targeting":
        routes = [Route.from_dict(route) for route in data.get("routes", [])]
        return Targeting(
            routes=routes,
            flight_duration_min=data.get("flight_duration_min"),
            flight_duration_max=data.get("flight_duration_max"),
            time_of_day=data.get("time_of_day", []),
            audience_tags=data.get("audience_tags", [])
        )


@dataclass
class Creative:
    id: str
    type: str
    format: str
    length_ms: int
    mime_type: str
    asset_url: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "format": self.format,
            "length_ms": self.length_ms,
            "mime_type": self.mime_type,
            "asset_url": self.asset_url
        }

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "Creative":
        return Creative(
            id=data["id"],
            type=data["type"],
            format=data["format"],
            length_ms=data["length_ms"],
            mime_type=data["mime_type"],
            asset_url=data["asset_url"]
        )


@dataclass
class TargetingZone:
    """
    Represents aircraft display zones where ads can be shown:
    - PA: Pre-flight announcements screen
    """
    enabled: bool
    reason: Optional[str] = None  # Why this zone is disabled (e.g., "Safety PA overlap")

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {"enabled": self.enabled}
        if self.reason is not None:
            d["reason"] = self.reason
        return d

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "TargetingZone":
        return TargetingZone(
            enabled=data["enabled"],
            reason=data.get("reason")
        )


@dataclass
class Campaign:
    id: int
    priority: Optional[int] = None
    targeting: Optional[Targeting] = None
    creatives: List[Creative] = field(default_factory=list)
    impression_cap: Optional[int] = None
    flight_impression_cap: Optional[int] = None
    client_impression_cap: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None
    expired_at: Optional[datetime] = None
    targeting_language: Optional[List[str]] = None
    targeting_zones: Dict[str, bool] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {"id": self.id}

        if self.priority is not None:
            d["priority"] = self.priority
        if self.targeting is not None:
            d["targeting"] = self.targeting.to_dict()
        if self.creatives:
            d["creatives"] = [creative.to_dict() for creative in self.creatives]
        if self.impression_cap is not None:
            d["impression_cap"] = self.impression_cap
        if self.flight_impression_cap is not None:
            d["flight_impression_cap"] = self.flight_impression_cap
        if self.client_impression_cap is not None:
            d["client_impression_cap"] = self.client_impression_cap
        if self.start_date is not None:
            d["start_date"] = self.start_date
        if self.end_date is not None:
            d["end_date"] = self.end_date
        if self.is_active is not None:
            d["is_active"] = self.is_active
        if self.expired_at is not None:
            d["expired_at"] = self.expired_at.strftime("%Y-%m-%dT%H:%M:%SZ")
        if self.targeting_language is not None:
            d["targeting_language"] = self.targeting_language
        if self.targeting_zones:
            d["targeting_zones"] = self.targeting_zones

        return d

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "Campaign":
        # Handle expired_at field
        expired_raw = data.get("expired_at")
        expired_at: Optional[datetime] = None
        if isinstance(expired_raw, str):
            expired_at = datetime.fromisoformat(expired_raw.rstrip("Z"))

        # Handle targeting
        targeting = None
        if "targeting" in data:
            targeting = Targeting.from_dict(data["targeting"])

        # Handle creatives
        creatives = []
        if "creatives" in data:
            creatives = [Creative.from_dict(creative) for creative in data["creatives"]]

        return Campaign(
            id=data["id"],
            priority=data.get("priority"),
            targeting=targeting,
            creatives=creatives,
            impression_cap=data.get("impression_cap"),
            flight_impression_cap=data.get("flight_impression_cap"),
            client_impression_cap=data.get("client_impression_cap"),
            start_date=data.get("start_date"),
            end_date=data.get("end_date"),
            is_active=data.get("is_active"),
            expired_at=expired_at,
            targeting_language=data.get("targeting_language"),
            targeting_zones=data.get("targeting_zones", {})
        )


@dataclass
class Metadata:
    submitted_by: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {}
        if self.submitted_by is not None:
            d["submitted_by"] = self.submitted_by
        if self.description is not None:
            d["description"] = self.description
        if self.created_at is not None:
            d["created_at"] = self.created_at
        return d

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "Metadata":
        return Metadata(
            submitted_by=data.get("submitted_by"),
            description=data.get("description"),
            created_at=data.get("created_at")
        )


@dataclass
class CampaignUpdate:
    version: int
    data: Dict[str, Campaign] = field(default_factory=dict)
    targeting_zones: Dict[str, Union[bool, TargetingZone]] = field(default_factory=dict)
    metadata: Optional[Metadata] = None

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {"version": self.version}

        if self.data:
            d["data"] = {key: campaign.to_dict() for key, campaign in self.data.items()}

        if self.targeting_zones:
            zones_dict = {}
            for key, value in self.targeting_zones.items():
                if isinstance(value, TargetingZone):
                    zones_dict[key] = value.to_dict()
                else:
                    zones_dict[key] = value
            d["targeting_zones"] = zones_dict

        if self.metadata is not None:
            d["metadata"] = self.metadata.to_dict()

        return d

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "CampaignUpdate":
        version = data["version"]

        # Handle campaigns in data format
        campaign_data: Dict[str, Campaign] = {}
        if "data" in data:
            for key, campaign_dict in data["data"].items():
                campaign = Campaign.from_dict(campaign_dict)
                campaign_data[key] = campaign

        # Handle targeting zones
        targeting_zones: Dict[str, Union[bool, TargetingZone]] = {}
        for key, value in data.get("targeting_zones", {}).items():
            if isinstance(value, dict) and "enabled" in value:
                targeting_zones[key] = TargetingZone.from_dict(value)
            else:
                targeting_zones[key] = value

        # Handle metadata
        metadata = None
        if "metadata" in data:
            metadata = Metadata.from_dict(data["metadata"])

        return CampaignUpdate(
            version=version,
            data=campaign_data,
            targeting_zones=targeting_zones,
            metadata=metadata
        )


@dataclass
class RuleRecord:
    """
    Stored fields for COA Story 3 requirements:
      - rule_id          : unique identifier (16 hex chars)
      - payload_hash     : SHA-256 of the canonical payload (used for dedup lookup)
      - adload_version   : which adload this update belongs to
      - campaign_ids     : list of campaign IDs included in this update
      - tail_number      : which aircraft tail this was for (if known)
      - timestamp        : when this rule was first created
      - metadata         : the full CampaignUpdate payload for reference
    """
    rule_id: str
    payload_hash: str
    adload_version: str
    campaign_ids: List[int]
    timestamp: datetime
    metadata: Dict[str, Any]
    tail_number: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "payload_hash": self.payload_hash,
            "adload_version": self.adload_version,
            "campaign_ids": self.campaign_ids,
            "tail_number": self.tail_number,
            "timestamp": self.timestamp.isoformat() + "Z",
            "metadata": self.metadata,
        }

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "RuleRecord":
        timestamp_raw = data.get("timestamp")
        if not isinstance(timestamp_raw, str):
            raise ValueError("timestamp must be a string in ISO 8601 format")

        ts = datetime.fromisoformat(timestamp_raw.rstrip("Z"))

        return RuleRecord(
            rule_id=data["rule_id"],
            payload_hash=data["payload_hash"],
            adload_version=data["adload_version"],
            campaign_ids=list(data.get("campaign_ids", [])),
            tail_number=data.get("tail_number"),
            timestamp=ts,
            metadata=data.get("metadata", {}),
        )
