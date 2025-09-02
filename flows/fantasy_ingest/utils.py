import hashlib
import re
from datetime import datetime, timezone
from typing import Dict, Any, List
import pandas as pd


def normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to snake_case."""
    df = df.copy()
    
    # Convert column names
    new_columns = {}
    for col in df.columns:
        # Convert to lowercase and strip whitespace
        normalized = str(col).lower().strip()
        
        # Convert camelCase to snake_case
        normalized = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', normalized)
        
        # Replace spaces and other characters with underscores
        normalized = re.sub(r'[^a-z0-9_]', '_', normalized)
        
        # Remove consecutive underscores
        normalized = re.sub(r'_+', '_', normalized)
        
        # Remove leading/trailing underscores
        normalized = normalized.strip('_')
        
        new_columns[col] = normalized
    
    df.rename(columns=new_columns, inplace=True)
    return df


def apply_rename_map(df: pd.DataFrame, rename_map: Dict[str, str]) -> pd.DataFrame:
    """Apply rename mapping to DataFrame columns."""
    if not rename_map:
        return df
    
    # Only rename columns that exist in the DataFrame
    existing_renames = {k: v for k, v in rename_map.items() if k in df.columns}
    if existing_renames:
        df = df.rename(columns=existing_renames)
    
    return df


def compute_dataframe_hash(df: pd.DataFrame, pk_columns: List[str]) -> str:
    """Compute MD5 hash of DataFrame based on primary key columns and sorted data."""
    if df.empty:
        return hashlib.md5(b'').hexdigest()
    
    # Use primary key columns if available, otherwise all columns
    hash_columns = [col for col in pk_columns if col in df.columns]
    if not hash_columns:
        hash_columns = list(df.columns)
    
    # Sort by primary key columns for deterministic hash
    df_sorted = df.sort_values(hash_columns) if hash_columns else df
    
    # Create hash from string representation
    hash_string = df_sorted[hash_columns].to_csv(index=False)
    return hashlib.md5(hash_string.encode()).hexdigest()


def generate_s3_path(dataset: str, partition: Dict[str, Any], bucket: str, prefix: str) -> str:
    """Generate S3 path based on dataset and partition."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")
    
    base_path = f"s3://{bucket}/{prefix}/{dataset}"
    
    if partition.get('snapshot_date'):
        # Snapshot partitioning: dataset/snapshot_date=YYYY-MM-DD/
        snapshot_date = partition['snapshot_date']
        return f"{base_path}/snapshot_date={snapshot_date}/{dataset}-{snapshot_date.replace('-', '')}-{timestamp}.parquet"
    
    elif partition.get('season') and partition.get('week') is not None:
        # Weekly partitioning: dataset/season=YYYY/week=WW/
        season = partition['season']
        week = partition['week']
        week_str = f"{week:02d}"
        return f"{base_path}/season={season}/week={week_str}/{dataset}-s{season}-w{week_str}-{timestamp}.parquet"
    
    elif partition.get('season'):
        # Seasonal partitioning: dataset/season=YYYY/
        season = partition['season']
        return f"{base_path}/season={season}/{dataset}-s{season}-{timestamp}.parquet"
    
    else:
        # Default: just timestamp
        return f"{base_path}/{dataset}-{timestamp}.parquet"


def validate_required_fields(df: pd.DataFrame, required_fields: List[str]) -> None:
    """Validate that required fields are present and not entirely null."""
    missing_fields = [field for field in required_fields if field not in df.columns]
    if missing_fields:
        raise ValueError(f"Missing required fields: {missing_fields}")
    
    # Check for entirely null columns
    null_fields = []
    for field in required_fields:
        if df[field].isna().all():
            null_fields.append(field)
    
    if null_fields:
        raise ValueError(f"Required fields are entirely null: {null_fields}")


def chunk_dataframe(df: pd.DataFrame, chunk_size: int) -> List[pd.DataFrame]:
    """Split DataFrame into chunks."""
    if len(df) <= chunk_size:
        return [df]
    
    chunks = []
    for i in range(0, len(df), chunk_size):
        chunks.append(df.iloc[i:i + chunk_size])
    
    return chunks


def extract_partition_from_kwargs(**kwargs) -> Dict[str, Any]:
    """Extract partition information from keyword arguments."""
    partition = {}
    
    # Handle different partition types
    if 'snapshot_date' in kwargs:
        partition['snapshot_date'] = kwargs['snapshot_date']
    
    if 'season' in kwargs:
        partition['season'] = kwargs['season']
    
    if 'week' in kwargs:
        partition['week'] = kwargs['week']
    
    return partition


def add_metadata_columns(df: pd.DataFrame, dataset: str, partition: Dict[str, Any],
                        source: str = "nflverse/nfl_data_py", schema_version: str = "v1") -> pd.DataFrame:
    """Add metadata columns to DataFrame."""
    df = df.copy()
    
    # Add metadata
    df['_dataset'] = dataset
    df['_season'] = partition.get('season')
    df['_week'] = partition.get('week')
    df['_snapshot_at'] = datetime.now(timezone.utc).isoformat()
    df['_source'] = source
    df['_row_count'] = len(df)
    df['_schema_version'] = schema_version
    
    # Add hash of the data
    pk_columns = ['season', 'week', 'player_id', 'team', 'game_id']
    existing_pk_columns = [col for col in pk_columns if col in df.columns]
    df['_hash'] = compute_dataframe_hash(df, existing_pk_columns)
    
    return df