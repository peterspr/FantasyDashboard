from typing import Optional
from fastapi import APIRouter, Query, Response, HTTPException, Depends
from app.core.rate_limit import RateLimiter
from app.api.models import ROSList
from app.core.projections_provider import get_provider
from app.core.config import settings
from app.core.cache import cache

router = APIRouter(prefix="/v1/ros", tags=["Rest of Season"])

@router.get("/{season}", response_model=ROSList)
async def get_ros_projections(
    season: int,
    response: Response,
    scoring: str = Query("ppr", description="Scoring system (ppr, half_ppr, standard)"),
    search: Optional[str] = Query(None, description="Search by player name"),
    position: Optional[str] = Query(None, description="Filter by position"),
    team: Optional[str] = Query(None, description="Filter by team"),
    sort_by: str = Query("proj_total", description="Sort field (proj_total, low, high, name)"),
    sort_desc: bool = Query(True, description="Sort descending"),
    limit: int = Query(settings.DEFAULT_PAGE_SIZE, le=settings.MAX_PAGE_SIZE),
    offset: int = Query(0, ge=0),
    _: bool = Depends(RateLimiter(times=60, seconds=60))
):
    """Get rest of season projections for all players"""
    if season < 2020 or season > 2030:
        raise HTTPException(status_code=400, detail="Season must be between 2020 and 2030")
    
    if scoring not in ["ppr", "half_ppr", "standard"]:
        raise HTTPException(status_code=400, detail="Scoring must be ppr, half_ppr, or standard")
    
    if sort_by not in ["proj_total", "low", "high", "name"]:
        raise HTTPException(status_code=400, detail="Invalid sort_by field")
    
    params = {
        "scoring": scoring,
        "search": search,
        "position": position,
        "team": team,
        "sort_by": sort_by,
        "sort_desc": sort_desc,
        "limit": limit,
        "offset": offset
    }
    
    cache_key = f"/v1/ros/{season}"
    cached = await cache.get(cache_key, params, settings.PROJECTION_PROVIDER)
    if cached:
        response.headers["ETag"] = f'"{hash(str(cached))}"'
        response.headers["Cache-Control"] = "public, max-age=300, s-maxage=1800"
        response.headers["X-Total-Count"] = str(cached["total"])
        return cached
    
    provider = get_provider(settings.PROJECTION_PROVIDER)
    result = await provider.ros(
        season=season,
        scoring=scoring,
        search=search,
        position=position,
        team=team,
        sort_by=sort_by,
        sort_desc=sort_desc,
        limit=limit,
        offset=offset
    )
    
    await cache.set(cache_key, params, settings.PROJECTION_PROVIDER, result)
    response.headers["ETag"] = f'"{hash(str(result))}"'
    response.headers["Cache-Control"] = "public, max-age=300, s-maxage=1800"
    response.headers["X-Total-Count"] = str(result["total"])
    
    return result