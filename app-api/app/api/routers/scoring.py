from typing import Dict
from fastapi import APIRouter, Response
from app.core.rate_limit import RateLimiter
from app.api.models import ScoringPreviewRequest, ProjectionList
from app.repositories.scoring_repo import ScoringRepository
from app.core.config import settings
from app.core.cache import cache

router = APIRouter(prefix="/v1/scoring", tags=["Custom Scoring"])
scoring_repo = ScoringRepository()

@router.post("/preview", response_model=ProjectionList)
async def preview_custom_scoring(
    request: ScoringPreviewRequest,
    response: Response,
    _: int = RateLimiter(times=30, seconds=60)
):
    """Preview projections with custom scoring"""
    params = {
        "season": request.season,
        "week": request.week,
        "scoring": request.scoring,
        "filters": request.filters,
        "limit": request.limit,
        "offset": request.offset
    }
    
    cache_key = f"/v1/scoring/preview"
    scoring_hash = hash(str(sorted(request.scoring.items())))
    params["scoring_hash"] = scoring_hash
    
    cached = await cache.get(cache_key, params, "custom")
    if cached:
        response.headers["ETag"] = f'"{hash(str(cached))}"'
        response.headers["Cache-Control"] = "public, max-age=30, s-maxage=300"
        response.headers["X-Total-Count"] = str(cached["total"])
        return cached
    
    result = await scoring_repo.preview_scoring(
        season=request.season,
        week=request.week,
        scoring=request.scoring,
        filters=request.filters,
        limit=request.limit,
        offset=request.offset
    )
    
    await cache.set(cache_key, params, "custom", result)
    response.headers["ETag"] = f'"{hash(str(result))}"'
    response.headers["Cache-Control"] = "public, max-age=30, s-maxage=300"
    response.headers["X-Total-Count"] = str(result["total"])
    
    return result

@router.get("/presets")
async def get_scoring_presets(
    response: Response,
    _: int = RateLimiter(times=60, seconds=60)
):
    """Get common scoring presets"""
    presets = {
        "ppr": {
            "reception": 1.0,
            "rec_yd": 0.1,
            "rec_td": 6.0,
            "rush_yd": 0.1,
            "rush_td": 6.0,
            "pass_yd": 0.04,
            "pass_td": 4.0,
            "int": -2.0,
            "fumble": -2.0
        },
        "half_ppr": {
            "reception": 0.5,
            "rec_yd": 0.1,
            "rec_td": 6.0,
            "rush_yd": 0.1,
            "rush_td": 6.0,
            "pass_yd": 0.04,
            "pass_td": 4.0,
            "int": -2.0,
            "fumble": -2.0
        },
        "standard": {
            "reception": 0.0,
            "rec_yd": 0.1,
            "rec_td": 6.0,
            "rush_yd": 0.1,
            "rush_td": 6.0,
            "pass_yd": 0.04,
            "pass_td": 4.0,
            "int": -2.0,
            "fumble": -2.0
        },
        "super_flex": {
            "reception": 1.0,
            "rec_yd": 0.1,
            "rec_td": 6.0,
            "rush_yd": 0.1,
            "rush_td": 6.0,
            "pass_yd": 0.04,
            "pass_td": 6.0,
            "int": -2.0,
            "fumble": -2.0
        }
    }
    
    response.headers["Cache-Control"] = "public, max-age=3600, s-maxage=7200"
    return {"presets": presets}