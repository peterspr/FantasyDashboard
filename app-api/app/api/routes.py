from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from sqlalchemy import create_engine, text
from app.core.settings import get_settings
from app.api.routers import players, projections, ros, usage, scoring, actual

router = APIRouter()

# Include all sub-routers
router.include_router(players.router)
router.include_router(projections.router)
router.include_router(ros.router)
router.include_router(usage.router)
router.include_router(scoring.router)
router.include_router(actual.router)

@router.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


@router.get("/v1/meta")
async def meta() -> dict[str, str]:
    """Meta information endpoint."""
    settings = get_settings()
    return {
        "service": "fantasy-insights-api",
        "version": settings.env_version,
        "env": settings.env_name,
    }


@router.get("/v1/ops/ingest/manifest/latest")
async def get_latest_manifest() -> Dict[str, Any]:
    """Get latest ingest manifest records per dataset."""
    try:
        settings = get_settings()
        engine = create_engine(settings.database_url)
        
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT DISTINCT ON (dataset) 
                    dataset,
                    partition,
                    row_count,
                    applied_at
                FROM ops.raw_ingest_manifest
                ORDER BY dataset, applied_at DESC
            """))
            
            records = [dict(row._mapping) for row in result]
            
        return {
            "datasets": records,
            "total": len(records)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch manifest: {str(e)}")