from typing import Protocol, Literal, Dict
from app.repositories.projections_repo import ProjectionsRepository

Scoring = Literal["ppr", "half", "std"]

class ProjectionProvider(Protocol):
    async def weekly(
        self, 
        season: int, 
        week: int, 
        *, 
        scoring: Scoring, 
        position: str | None = None,
        team: str | None = None, 
        search: str | None = None, 
        sort: str | None = None,
        limit: int = 50, 
        offset: int = 0
    ) -> Dict:
        ...

    async def ros(
        self, 
        season: int, 
        *, 
        scoring: Scoring, 
        position: str | None = None,
        team: str | None = None, 
        search: str | None = None, 
        sort: str | None = None,
        limit: int = 50, 
        offset: int = 0
    ) -> Dict:
        ...

class BaselineProvider:
    def __init__(self):
        self.repo = ProjectionsRepository()
    
    async def weekly(
        self, 
        season: int, 
        week: int, 
        *, 
        scoring: Scoring, 
        position: str | None = None,
        team: str | None = None, 
        search: str | None = None, 
        sort: str | None = None,
        limit: int = 50, 
        offset: int = 0
    ) -> Dict:
        return await self.repo.list_weekly_projections(
            season=season,
            week=week,
            scoring=scoring,
            position=position,
            team=team,
            search=search,
            sort=sort,
            limit=limit,
            offset=offset
        )
    
    async def ros(
        self, 
        season: int, 
        *, 
        scoring: Scoring, 
        position: str | None = None,
        team: str | None = None, 
        search: str | None = None, 
        sort: str | None = None,
        limit: int = 50, 
        offset: int = 0
    ) -> Dict:
        return await self.repo.list_ros_projections(
            season=season,
            scoring=scoring,
            position=position,
            team=team,
            search=search,
            sort=sort,
            limit=limit,
            offset=offset
        )

class MLProvider:
    async def weekly(
        self, 
        season: int, 
        week: int, 
        *, 
        scoring: Scoring, 
        position: str | None = None,
        team: str | None = None, 
        search: str | None = None, 
        sort: str | None = None,
        limit: int = 50, 
        offset: int = 0
    ) -> Dict:
        raise NotImplementedError("ML projections not yet implemented")
    
    async def ros(
        self, 
        season: int, 
        *, 
        scoring: Scoring, 
        position: str | None = None,
        team: str | None = None, 
        search: str | None = None, 
        sort: str | None = None,
        limit: int = 50, 
        offset: int = 0
    ) -> Dict:
        raise NotImplementedError("ML projections not yet implemented")

def get_provider(provider_name: str) -> ProjectionProvider:
    if provider_name == "baseline":
        return BaselineProvider()
    elif provider_name == "ml":
        return MLProvider()
    else:
        raise ValueError(f"Unknown provider: {provider_name}")