from typing import Optional
from fastapi import APIRouter, Query, Response
from app.core.rate_limit import RateLimiter
from app.api.models import PlayersList
from app.repositories.players_repo import PlayersRepository
from app.core.config import settings
from app.core.cache import cache

router = APIRouter(prefix="/v1/players", tags=["Players"])
players_repo = PlayersRepository()

@router.get("", response_model=PlayersList)
async def list_players(
    response: Response,
    search: Optional[str] = Query(None, description="Search by player name"),
    position: Optional[str] = Query(None, description="Filter by position"),
    team: Optional[str] = Query(None, description="Filter by team"),
    limit: int = Query(settings.DEFAULT_PAGE_SIZE, le=settings.MAX_PAGE_SIZE),
    offset: int = Query(0, ge=0),
    _: int = RateLimiter(times=60, seconds=60)
):
    """List players with optional filtering"""
    params = {
        "search": search,
        "position": position,
        "team": team,
        "limit": limit,
        "offset": offset
    }
    
    # Check cache
    cached = await cache.get("/v1/players", params, "baseline")
    if cached:
        response.headers["ETag"] = f'"{hash(str(cached))}"'
        response.headers["Cache-Control"] = "public, max-age=60, s-maxage=900"
        response.headers["X-Total-Count"] = str(cached["total"])
        return cached
    
    # Fetch data
    result = await players_repo.list_players(
        search=search,
        position=position,
        team=team,
        limit=limit,
        offset=offset
    )
    
    # Cache and return
    await cache.set("/v1/players", params, "baseline", result)
    response.headers["ETag"] = f'"{hash(str(result))}"'
    response.headers["Cache-Control"] = "public, max-age=60, s-maxage=900"
    response.headers["X-Total-Count"] = str(result["total"])
    
    return result