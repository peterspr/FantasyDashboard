from functools import lru_cache
from typing import Any, Dict, List, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


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
        alias="DATABASE_URL"
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
    
    @field_validator('allowed_origins')
    @classmethod
    def parse_allowed_origins(cls, v) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()