from functools import lru_cache
from typing import Any, Dict, List

from pydantic import Field
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
    allowed_origins: List[str] = Field(
        default=["http://localhost:3000"], alias="ALLOWED_ORIGINS"
    )
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        
        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str) -> Any:
            if field_name == "allowed_origins":
                return [x.strip() for x in raw_val.split(",")]
            return cls.json_loads(raw_val)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()