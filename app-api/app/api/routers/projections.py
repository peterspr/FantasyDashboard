from typing import Optional
from fastapi import APIRouter, Query, Response, HTTPException, Depends
from app.core.rate_limit import RateLimiter
from app.api.models import ProjectionList, PlayerSeasonProjectionsList
from app.core.projections_provider import get_provider
from app.repositories.projections_repo import ProjectionsRepository
from app.core.config import settings
from app.core.cache import cache

router = APIRouter(prefix="/v1/projections", tags=["Projections"])
projections_repo = ProjectionsRepository()


@router.get("/{season}/{week}", response_model=ProjectionList)
async def get_weekly_projections(
    season: int,
    week: int,
    response: Response,
    scoring: str = Query("ppr", description="Scoring system (ppr, half_ppr, standard)"),
    search: Optional[str] = Query(None, description="Search by player name"),
    position: Optional[str] = Query(None, description="Filter by position"),
    team: Optional[str] = Query(None, description="Filter by team"),
    sort_by: str = Query("proj", description="Sort field (proj, low, high, name)"),
    sort_desc: bool = Query(True, description="Sort descending"),
    limit: int = Query(settings.DEFAULT_PAGE_SIZE, le=settings.MAX_PAGE_SIZE),
    offset: int = Query(0, ge=0),
    _: bool = Depends(RateLimiter(times=60, seconds=60)),
):
    """Get weekly projections for all players"""
    if season < 2020 or season > 2030:
        raise HTTPException(status_code=400, detail="Season must be between 2020 and 2030")

    if week < 1 or week > 18:
        raise HTTPException(status_code=400, detail="Week must be between 1 and 18")

    if scoring not in ["ppr", "half_ppr", "standard"]:
        raise HTTPException(status_code=400, detail="Scoring must be ppr, half_ppr, or standard")

    # Translate API scoring values to database values
    db_scoring = {"ppr": "ppr", "half_ppr": "half", "standard": "std"}[scoring]

    if sort_by not in ["proj", "low", "high", "name"]:
        raise HTTPException(status_code=400, detail="Invalid sort_by field")

    params = {
        "scoring": db_scoring,
        "search": search,
        "position": position,
        "team": team,
        "sort_by": sort_by,
        "sort_desc": sort_desc,
        "limit": limit,
        "offset": offset,
    }

    cache_key = f"/v1/projections/{season}/{week}"
    cached = await cache.get(cache_key, params, settings.PROJECTION_PROVIDER)
    if cached:
        # Convert back to API scoring value for cached response
        cached["scoring"] = scoring
        for item in cached.get("items", []):
            item["scoring"] = scoring
        response.headers["ETag"] = f'"{hash(str(cached))}"'
        response.headers["Cache-Control"] = "public, max-age=60, s-maxage=900"
        response.headers["X-Total-Count"] = str(cached["total"])
        return cached

    provider = get_provider(settings.PROJECTION_PROVIDER)
    result = await provider.weekly(
        season=season,
        week=week,
        scoring=db_scoring,
        search=search,
        position=position,
        team=team,
        sort_by=sort_by,
        sort_desc=sort_desc,
        limit=limit,
        offset=offset,
    )

    # Convert back to API scoring value for response
    result["scoring"] = scoring
    for item in result.get("items", []):
        item["scoring"] = scoring

    await cache.set(cache_key, params, settings.PROJECTION_PROVIDER, result)
    response.headers["ETag"] = f'"{hash(str(result))}"'
    response.headers["Cache-Control"] = "public, max-age=60, s-maxage=900"
    response.headers["X-Total-Count"] = str(result["total"])

    return result


@router.get("/bulk/{season}/player/{player_id}", response_model=PlayerSeasonProjectionsList)
async def get_player_season_projections(
    player_id: str,
    season: int,
    response: Response,
    scoring: str = Query("ppr", description="Scoring system (ppr, half_ppr, standard)"),
    week_start: int = Query(1, ge=1, le=18, description="Starting week"),
    week_end: int = Query(18, ge=1, le=18, description="Ending week"),
    _: bool = Depends(RateLimiter(times=120, seconds=60)),  # Higher limit for bulk endpoints
):
    """Get all weekly projections for a specific player across a season range"""
    if season < 2020 or season > 2030:
        raise HTTPException(status_code=400, detail="Season must be between 2020 and 2030")

    if week_start > week_end:
        raise HTTPException(status_code=400, detail="week_start must be <= week_end")

    if scoring not in ["ppr", "half_ppr", "standard"]:
        raise HTTPException(status_code=400, detail="Scoring must be ppr, half_ppr, or standard")

    # Translate API scoring values to database values
    db_scoring = {"ppr": "ppr", "half_ppr": "half", "standard": "std"}[scoring]

    cache_key = f"/v1/projections/bulk/{season}/player/{player_id}"
    cache_params = {"scoring": db_scoring, "week_start": week_start, "week_end": week_end}

    cached = await cache.get(cache_key, cache_params, "bulk_projections")
    if cached:
        # Convert back to API scoring value for cached response
        cached["scoring"] = scoring
        for item in cached.get("items", []):
            item["scoring"] = scoring
        response.headers["ETag"] = f'"{hash(str(cached))}"'
        response.headers["Cache-Control"] = (
            "public, max-age=300, s-maxage=1800"  # Longer cache for bulk
        )
        return cached

    result = await projections_repo.get_player_season_projections(
        player_id=player_id,
        season=season,
        scoring=db_scoring,
        week_start=week_start,
        week_end=week_end,
    )

    # Convert back to API scoring value for response
    result["scoring"] = scoring
    for item in result.get("items", []):
        item["scoring"] = scoring

    await cache.set(cache_key, cache_params, "bulk_projections", result)
    response.headers["ETag"] = f'"{hash(str(result))}"'
    response.headers["Cache-Control"] = "public, max-age=300, s-maxage=1800"

    return result
