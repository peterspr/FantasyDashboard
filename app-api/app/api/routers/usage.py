from typing import Optional, List
from fastapi import APIRouter, Query, Response, HTTPException, Depends
from app.core.rate_limit import RateLimiter
from pydantic import BaseModel
from app.api.models import UsageWeeklyItem
from app.repositories.usage_repo import UsageRepository
from app.core.config import settings
from app.core.cache import cache

router = APIRouter(prefix="/v1/usage", tags=["Player Usage"])
usage_repo = UsageRepository()

class UsageList(BaseModel):
    season: int
    player_id: str
    name: Optional[str] = None
    items: List[UsageWeeklyItem]
    total: int

@router.get("/{season}/{player_id}", response_model=UsageList)
async def get_player_usage(
    season: int,
    player_id: str,
    response: Response,
    weeks: Optional[str] = Query(None, description="Comma-separated weeks (e.g., '1,2,3' or '1-4')"),
    _: bool = Depends(RateLimiter(times=60, seconds=60))
):
    """Get usage data for a specific player across weeks"""
    if season < 2020 or season > 2030:
        raise HTTPException(status_code=400, detail="Season must be between 2020 and 2030")
    
    week_list = None
    if weeks:
        try:
            if "-" in weeks and "," not in weeks:
                start, end = map(int, weeks.split("-"))
                week_list = list(range(start, end + 1))
            else:
                week_list = [int(w.strip()) for w in weeks.split(",")]
            
            if any(w < 1 or w > 18 for w in week_list):
                raise HTTPException(status_code=400, detail="Weeks must be between 1 and 18")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid weeks format")
    
    params = {
        "weeks": weeks
    }
    
    cache_key = f"/v1/usage/{season}/{player_id}"
    cached = await cache.get(cache_key, params, "baseline")
    if cached:
        response.headers["ETag"] = f'"{hash(str(cached))}"'
        response.headers["Cache-Control"] = "public, max-age=300, s-maxage=900"
        response.headers["X-Total-Count"] = str(cached["total"])
        return cached
    
    result = await usage_repo.get_player_usage(
        season=season,
        player_id=player_id,
        weeks=week_list
    )
    
    if not result["items"]:
        raise HTTPException(status_code=404, detail="Player usage data not found")
    
    await cache.set(cache_key, params, "baseline", result)
    response.headers["ETag"] = f'"{hash(str(result))}"'
    response.headers["Cache-Control"] = "public, max-age=300, s-maxage=900"
    response.headers["X-Total-Count"] = str(result["total"])
    
    return result