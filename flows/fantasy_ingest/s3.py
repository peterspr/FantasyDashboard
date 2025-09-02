import tempfile
from pathlib import Path
from typing import Dict, Any

import boto3
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from botocore.exceptions import ClientError
from prefect import get_run_logger

from .settings import get_settings


class S3Client:
    """S3/MinIO client for bronze layer operations."""
    
    def __init__(self):
        self.settings = get_settings()
        self.logger = get_run_logger()
        
        # Configure boto3 client
        self.client = boto3.client(
            's3',
            endpoint_url=self.settings.s3_endpoint_url,
            aws_access_key_id=self.settings.minio_access_key,
            aws_secret_access_key=self.settings.minio_secret_key,
            region_name='us-east-1'  # Required for MinIO
        )
    
    def ensure_bucket(self, bucket: str) -> None:
        """Ensure bucket exists, create if missing."""
        try:
            self.client.head_bucket(Bucket=bucket)
            self.logger.info(f"Bucket {bucket} exists")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                self.logger.info(f"Creating bucket {bucket}")
                self.client.create_bucket(Bucket=bucket)
            else:
                raise
    
    def write_parquet(self, df: pd.DataFrame, s3_path: str, metadata: Dict[str, Any]) -> None:
        """Write DataFrame to S3 as Parquet with metadata."""
        # Add metadata columns to DataFrame
        for key, value in metadata.items():
            df[key] = value
        
        # Convert to PyArrow table
        table = pa.Table.from_pandas(df)
        
        # Write to temporary file first
        with tempfile.NamedTemporaryFile(suffix='.parquet', delete=False) as tmp_file:
            pq.write_table(
                table,
                tmp_file.name,
                compression=self.settings.parquet_compression
            )
            
            # Upload to S3
            bucket, key = self._parse_s3_path(s3_path)
            self.client.upload_file(tmp_file.name, bucket, key)
            
            # Clean up temp file
            Path(tmp_file.name).unlink()
            
        self.logger.info(f"Wrote {len(df)} rows to {s3_path}")
    
    def _parse_s3_path(self, s3_path: str) -> tuple[str, str]:
        """Parse s3://bucket/key into bucket and key."""
        if not s3_path.startswith('s3://'):
            raise ValueError(f"Invalid S3 path: {s3_path}")
        
        parts = s3_path[5:].split('/', 1)
        if len(parts) != 2:
            raise ValueError(f"Invalid S3 path: {s3_path}")
        
        return parts[0], parts[1]


def get_s3_client() -> S3Client:
    """Get S3 client instance."""
    return S3Client()