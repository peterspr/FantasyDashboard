from typing import Optional
from fastapi import APIRouter, Query, Response, HTTPException, Depends
from app.core.rate_limit import RateLimiter
from app.api.models import ActualPointsList, ActualPointsItem, PlayerSeasonActualPointsList
from app.repositories.actual_points_repo import ActualPointsRepository
from app.core.cache import cache

router = APIRouter(prefix="/v1/actual", tags=["Actual Points"])
actual_repo = ActualPointsRepository()

@router.get("/{season}/{week}", response_model=ActualPointsList)
async def get_weekly_actual_points(
    season: int,
    week: int,
    response: Response,
    scoring: str = Query("ppr", description="Scoring system (ppr, half_ppr, standard)"),
    search: Optional[str] = Query(None, description="Search by player name"),
    position: Optional[str] = Query(None, description="Filter by position"),
    team: Optional[str] = Query(None, description="Filter by team"),
    sort_by: str = Query("actual_points", description="Sort field (actual_points, name, team, position)"),
    sort_desc: bool = Query(True, description="Sort descending"),
    limit: int = Query(50, description="Number of results per page"),
    offset: int = Query(0, description="Number of results to skip"),
    _: bool = Depends(RateLimiter(times=60, seconds=60))
):
    """Get weekly actual fantasy points for players."""
    
    # Validate season/week
    if season < 2020 or season > 2030:
        raise HTTPException(status_code=400, detail="Season must be between 2020 and 2030")
    if week < 1 or week > 22:
        raise HTTPException(status_code=400, detail="Week must be between 1 and 22")
    
    # Validate scoring
    valid_scoring = {"standard", "ppr", "half_ppr"}
    if scoring not in valid_scoring:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scoring format. Must be one of: {', '.join(valid_scoring)}"
        )
    
    try:
        # Check cache first
        cache_key = f"/v1/actual/{season}/{week}"
        cache_params = {
            "scoring": scoring,
            "search": search,
            "position": position,
            "team": team,
            "sort_by": sort_by,
            "sort_desc": sort_desc,
            "limit": limit,
            "offset": offset,
        }
        cached_data = await cache.get(cache_key, cache_params, "actual")
        
        if cached_data:
            return cached_data
        
        # Get data from repository
        data = await actual_repo.get_actual_points(
            season=season,
            week=week,
            scoring=scoring,
            search=search,
            position=position,
            team=team,
            sort_by=sort_by,
            sort_desc=sort_desc,
            limit=limit,
            offset=offset,
        )
        
        # Convert to Pydantic models
        items = [ActualPointsItem(**item) for item in data["items"]]
        
        result = ActualPointsList(
            season=data["season"],
            week=data["week"],
            scoring=data["scoring"],
            items=items,
            total=data["total"],
            limit=data["limit"],
            offset=data["offset"],
        )
        
        # Cache the result
        await cache.set(cache_key, cache_params, "actual", result)
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching actual points: {str(e)}"
        )

@router.get("/bulk/{season}/player/{player_id}", response_model=PlayerSeasonActualPointsList)
async def get_player_season_actual_points(
    player_id: str,
    season: int,
    response: Response,
    scoring: str = Query("ppr", description="Scoring system (ppr, half_ppr, standard)"),
    week_start: int = Query(1, ge=1, le=22, description="Starting week"),
    week_end: int = Query(18, ge=1, le=22, description="Ending week"),
    _: bool = Depends(RateLimiter(times=120, seconds=60))  # Higher limit for bulk endpoints
):
    """Get actual points for a specific player across a season range"""
    
    # Validate season/week
    if season < 2020 or season > 2030:
        raise HTTPException(status_code=400, detail="Season must be between 2020 and 2030")
    if week_start < 1 or week_end > 22:
        raise HTTPException(status_code=400, detail="Weeks must be between 1 and 22")
    if week_start > week_end:
        raise HTTPException(status_code=400, detail="week_start must be <= week_end")
    
    # Validate scoring
    valid_scoring = {"standard", "ppr", "half_ppr"}
    if scoring not in valid_scoring:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scoring format. Must be one of: {', '.join(valid_scoring)}"
        )
    
    try:
        # Check cache first
        cache_key = f"/v1/actual/bulk/{season}/player/{player_id}"
        cache_params = {
            "scoring": scoring,
            "week_start": week_start,
            "week_end": week_end
        }
        cached_data = await cache.get(cache_key, cache_params, "bulk_actual")
        
        if cached_data:
            response.headers["Cache-Control"] = "public, max-age=300, s-maxage=1800"  # Longer cache for bulk
            return cached_data
        
        # Get data from repository
        data = await actual_repo.get_player_season_actual_points(
            player_id=player_id,
            season=season,
            scoring=scoring,
            week_start=week_start,
            week_end=week_end
        )
        
        # Convert to Pydantic models
        items = [ActualPointsItem(**item) for item in data["items"]]
        
        result = PlayerSeasonActualPointsList(
            player_id=data["player_id"],
            season=data["season"],
            scoring=data["scoring"],
            week_start=data["week_start"],
            week_end=data["week_end"],
            items=items,
            total=data["total"]
        )
        
        # Cache the result
        await cache.set(cache_key, cache_params, "bulk_actual", result)
        response.headers["Cache-Control"] = "public, max-age=300, s-maxage=1800"
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching player actual points: {str(e)}"
        )