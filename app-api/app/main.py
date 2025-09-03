import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.logging import configure_logging
from app.core.settings import get_settings

settings = get_settings()
from app.core.rate_limit import init_limiter, close_limiter
from app.core.middleware import RequestIdMiddleware, http_exception_handler, general_exception_handler

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    logger.info("Starting up Fantasy Insights API")
    await init_limiter()
    yield
    await close_limiter()
    logger.info("Shutting down Fantasy Insights API")


def create_app() -> FastAPI:
    """Create FastAPI application."""
    # Configure logging
    configure_logging()
    
    # Create app
    app = FastAPI(
        title="Fantasy Insights API",
        description="Fantasy Football Insights and Projections API",
        version=settings.env_version,
        lifespan=lifespan,
    )
    
    # Add middleware
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add exception handlers
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
    
    # Include router
    app.include_router(router)
    
    return app


app = create_app()