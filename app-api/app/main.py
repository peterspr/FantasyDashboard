import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.logging import configure_logging
from app.core.settings import get_settings

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    logger.info("Starting up Fantasy Insights API")
    yield
    logger.info("Shutting down Fantasy Insights API")


def create_app() -> FastAPI:
    """Create FastAPI application."""
    # Configure logging
    configure_logging()
    
    # Get settings
    settings = get_settings()
    
    # Create app
    app = FastAPI(
        title="Fantasy Insights API",
        description="Fantasy Football Insights and Projections API",
        version=settings.env_version,
        lifespan=lifespan,
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include router
    app.include_router(router)
    
    return app


app = create_app()