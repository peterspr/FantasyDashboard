"""Configuration settings for the API."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings"""

    # Environment
    ENV_NAME: str = "local"
    ENV_VERSION: str = "0.0.1"

    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/fantasy"

    # API Configuration
    API_CACHE_TTL_SECONDS: int = 900  # 15 minutes
    RATE_LIMIT: str = "60/minute"
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 200
    PROJECTION_PROVIDER: str = "baseline"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"  # Allow extra environment variables to be ignored
    )

    @field_validator("ALLOWED_ORIGINS")
    @classmethod
    def parse_allowed_origins(cls, v) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


# Global settings instance
settings = Settings()
