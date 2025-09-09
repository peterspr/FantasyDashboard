from functools import lru_cache
from typing import Any, Dict, List, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    env_name: str = Field(default="local", alias="ENV_NAME")
    env_version: str = Field(default="0.0.1", alias="ENV_VERSION")

    # Database
    postgres_host: str = Field(default="localhost", alias="POSTGRES_HOST")
    postgres_port: int = Field(default=5432, alias="POSTGRES_PORT")
    postgres_db: str = Field(default="fantasy", alias="POSTGRES_DB")
    postgres_user: str = Field(default="postgres", alias="POSTGRES_USER")
    postgres_password: str = Field(default="postgres", alias="POSTGRES_PASSWORD")
    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/fantasy",
        alias="DATABASE_URL",
    )

    # MinIO
    minio_endpoint: str = Field(default="localhost:9000", alias="MINIO_ENDPOINT")
    minio_access_key: str = Field(default="minioadmin", alias="MINIO_ACCESS_KEY")
    minio_secret_key: str = Field(default="minioadmin", alias="MINIO_SECRET_KEY")
    minio_bucket: str = Field(default="bronze", alias="MINIO_BUCKET")

    # CORS
    allowed_origins: Union[str, List[str]] = Field(
        default=["http://localhost:3000"], alias="ALLOWED_ORIGINS"
    )

    # Authentication
    jwt_secret_key: str = Field(
        default="your-secret-key-change-in-production", alias="JWT_SECRET_KEY"
    )
    jwt_refresh_secret_key: str = Field(
        default="your-refresh-secret-key-change-in-production", alias="JWT_REFRESH_SECRET_KEY"
    )
    access_token_expire_minutes: int = Field(default=30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=30, alias="REFRESH_TOKEN_EXPIRE_DAYS")

    # Google OAuth
    google_client_id: str = Field(default="", alias="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(default="", alias="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str = Field(
        default="http://localhost:3000/", alias="GOOGLE_REDIRECT_URI"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"  # Allow extra environment variables to be ignored
    )

    @field_validator("allowed_origins")
    @classmethod
    def parse_allowed_origins(cls, v) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()
