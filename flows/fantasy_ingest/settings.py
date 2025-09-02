import os
from datetime import datetime
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class IngestSettings(BaseSettings):
    """Ingestion settings."""
    
    # Database
    database_url: str = Field(alias="DATABASE_URL")
    
    # MinIO/S3
    minio_endpoint: str = Field(alias="MINIO_ENDPOINT")
    minio_access_key: str = Field(alias="MINIO_ACCESS_KEY")
    minio_secret_key: str = Field(alias="MINIO_SECRET_KEY")
    minio_secure: bool = Field(default=False, alias="MINIO_SECURE")
    bronze_bucket: str = Field(alias="MINIO_BUCKET")
    bronze_prefix: str = Field(default="nflverse", alias="BRONZE_PREFIX")
    
    # Ingestion defaults
    ingest_default_season: Optional[int] = Field(default=None, alias="INGEST_DEFAULT_SEASON")
    parquet_compression: str = Field(default="snappy", alias="PARQUET_COMPRESSION")
    max_chunk_rows: int = Field(default=100000, alias="MAX_CHUNK_ROWS")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    def get_default_season(self) -> int:
        """Get the default season based on current date."""
        if self.ingest_default_season:
            return self.ingest_default_season
        
        # NFL season runs from September to February of next year
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        # If January-July, we're likely in the previous NFL season
        if current_month <= 7:
            return current_year - 1
        else:
            return current_year
    
    @property
    def s3_endpoint_url(self) -> Optional[str]:
        """Get S3 endpoint URL for MinIO."""
        if not self.minio_endpoint:
            return None
        
        protocol = "https" if self.minio_secure else "http"
        return f"{protocol}://{self.minio_endpoint}"


def get_settings() -> IngestSettings:
    """Get ingestion settings instance."""
    return IngestSettings()