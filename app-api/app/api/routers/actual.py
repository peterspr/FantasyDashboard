from typing import Optional
from fastapi import APIRouter, Query, Response, HTTPException, Depends
from app.core.rate_limit import RateLimiter
from app.api.models import ActualPointsList, ActualPointsItem
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