from typing import AsyncGenerator
from contextlib import asynccontextmanager
import asyncpg
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import Settings
settings = Settings()

engine = create_async_engine(
    settings.DATABASE_URL.replace("postgresql+psycopg://", "postgresql+asyncpg://"),
    echo=settings.ENV_NAME == "local",
    pool_pre_ping=True,
    pool_recycle=3600,
)

async_session_maker = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()

@asynccontextmanager
async def get_raw_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """Get raw asyncpg connection for complex queries"""
    conn = await asyncpg.connect(settings.DATABASE_URL.replace("postgresql+psycopg://", "postgresql://"))
    try:
        yield conn
    finally:
        await conn.close()