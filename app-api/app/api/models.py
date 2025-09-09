from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class PlayerOut(BaseModel):
    player_id: str
    name: str
    team: Optional[str] = None
    position: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "player_id": "00-0030506",
                "name": "Justin Jefferson",
                "team": "MIN",
                "position": "WR",
            }
        }
    )


class ProjectionItem(BaseModel):
    player_id: str
    name: str
    team: Optional[str]
    position: Optional[str]
    scoring: str
    proj: float
    low: float
    high: float
    components: Dict[str, Any]
    season: int
    week: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "player_id": "00-0030506",
                "name": "Justin Jefferson",
                "team": "MIN",
                "position": "WR",
                "scoring": "ppr",
                "proj": 18.5,
                "low": 12.3,
                "high": 24.7,
                "components": {
                    "targets_pred": 9.2,
                    "rec_pred": 6.1,
                    "rec_yds_pred": 85.4,
                    "rec_td_pred": 0.45,
                },
                "season": 2024,
                "week": 10,
            }
        }
    )


class ProjectionList(BaseModel):
    season: int
    week: int
    scoring: str
    items: List[ProjectionItem]
    total: int
    limit: int
    offset: int


class ROSItem(BaseModel):
    player_id: str
    name: str
    team: Optional[str]
    position: Optional[str]
    scoring: str
    proj_total: float
    low: float
    high: float
    per_week_json: Optional[List[Dict[str, Any]]] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "player_id": "00-0030506",
                "name": "Justin Jefferson",
                "team": "MIN",
                "position": "WR",
                "scoring": "ppr",
                "proj_total": 185.2,
                "low": 142.1,
                "high": 228.3,
            }
        }
    )


class ROSList(BaseModel):
    season: int
    scoring: str
    items: List[ROSItem]
    total: int
    limit: int
    offset: int


class UsageWeeklyItem(BaseModel):
    season: int
    week: int
    player_id: str
    name: Optional[str] = None
    team: Optional[str]
    position: Optional[str]
    snap_pct: Optional[float] = None
    route_pct: Optional[float] = None
    target_share: Optional[float] = None
    rush_share: Optional[float] = None
    routes: Optional[int] = None
    targets: Optional[int] = None
    rush_att: Optional[int] = None
    proj: Optional[float] = None
    low: Optional[float] = None
    high: Optional[float] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "season": 2024,
                "week": 10,
                "player_id": "00-0030506",
                "team": "MIN",
                "position": "WR",
                "snap_pct": 0.89,
                "route_pct": 0.92,
                "target_share": 0.28,
                "rush_share": 0.0,
                "routes": 34,
                "targets": 9,
                "rush_att": 0,
                "proj": 18.5,
                "low": 12.3,
                "high": 24.7,
            }
        }
    )


class PlayersList(BaseModel):
    items: List[PlayerOut]
    total: int
    limit: int
    offset: int


class ActualPointsItem(BaseModel):
    player_id: str
    name: str
    team: Optional[str]
    position: Optional[str]
    scoring: str
    actual_points: float
    season: int
    week: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "player_id": "00-0030506",
                "name": "Justin Jefferson",
                "team": "MIN",
                "position": "WR",
                "scoring": "ppr",
                "actual_points": 22.4,
                "season": 2024,
                "week": 10,
            }
        }
    )


class ActualPointsList(BaseModel):
    season: int
    week: int
    scoring: str
    items: List[ActualPointsItem]
    total: int
    limit: int
    offset: int


class ScoringPreviewRequest(BaseModel):
    season: int
    week: int
    scoring: Dict[str, float]
    filters: Dict[str, Optional[str]] = {}
    limit: int = 200
    offset: int = 0

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "season": 2024,
                "week": 10,
                "scoring": {
                    "reception": 1.0,
                    "rec_yd": 0.1,
                    "rec_td": 6.0,
                    "rush_yd": 0.1,
                    "rush_td": 6.0,
                    "pass_yd": 0.04,
                    "pass_td": 4.0,
                    "int": -2.0,
                    "fumble": -2.0,
                },
                "filters": {"position": "WR", "team": None, "search": None},
                "limit": 200,
                "offset": 0,
            }
        }
    )


class ScoringPresetsResponse(BaseModel):
    presets: Dict[str, Dict[str, float]]


# Bulk endpoint models
class PlayerSeasonProjectionsList(BaseModel):
    player_id: str
    season: int
    scoring: str
    week_start: int
    week_end: int
    items: List[ProjectionItem]
    total: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "player_id": "00-0030506",
                "season": 2024,
                "scoring": "ppr",
                "week_start": 1,
                "week_end": 18,
                "items": [
                    {
                        "player_id": "00-0030506",
                        "name": "Justin Jefferson",
                        "team": "MIN",
                        "position": "WR",
                        "scoring": "ppr",
                        "proj": 18.5,
                        "low": 12.3,
                        "high": 24.7,
                        "components": {},
                        "season": 2024,
                        "week": 1,
                    }
                ],
                "total": 18,
            }
        }
    )


class PlayerSeasonActualPointsList(BaseModel):
    player_id: str
    season: int
    scoring: str
    week_start: int
    week_end: int
    items: List[ActualPointsItem]
    total: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "player_id": "00-0030506",
                "season": 2024,
                "scoring": "ppr",
                "week_start": 1,
                "week_end": 18,
                "items": [
                    {
                        "player_id": "00-0030506",
                        "name": "Justin Jefferson",
                        "team": "MIN",
                        "position": "WR",
                        "scoring": "ppr",
                        "actual_points": 22.4,
                        "season": 2024,
                        "week": 1,
                    }
                ],
                "total": 10,
            }
        }
    )
