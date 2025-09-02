import hashlib
import time
from datetime import datetime, timezone
from typing import Dict, Any, List

from prefect import task, get_run_logger
import pandas as pd

from ..settings import get_settings
from ..s3 import get_s3_client
from ..postgres import get_postgres_client
from ..utils import (
    normalize_column_names,
    apply_rename_map,
    validate_required_fields,
    chunk_dataframe,
    generate_s3_path,
    add_metadata_columns,
    compute_dataframe_hash
)
from ..adapters.nflverse_loader import get_nflverse_loader
from ..adapters.registry import DatasetConfig


@task
def load_partition(dataset_config: DatasetConfig, partition: Dict[str, Any]) -> Dict[str, Any]:
    """Load a single dataset partition: extract -> validate -> S3 -> Postgres -> manifest."""
    
    logger = get_run_logger()
    settings = get_settings()
    
    start_time = time.time()
    
    try:
        logger.info(f"Loading partition {partition} for dataset {dataset_config.id}")
        
        # Initialize clients
        loader = get_nflverse_loader()
        s3_client = get_s3_client()
        postgres_client = get_postgres_client()
        
        # Ensure S3 bucket exists
        s3_client.ensure_bucket(settings.bronze_bucket)
        
        # Ensure raw schema and tables exist
        postgres_client.ensure_schema_and_ops()
        
        # Prepare loader arguments based on partition type
        loader_kwargs = {}
        
        if dataset_config.is_weekly() and 'season' in partition:
            loader_kwargs['years'] = [partition['season']]
            if 'week' in partition:
                loader_kwargs['weeks'] = [partition['week']]
        elif dataset_config.is_seasonal() and 'season' in partition:
            loader_kwargs['years'] = [partition['season']]
        elif dataset_config.is_snapshot():
            # Snapshot datasets don't need year filters typically
            pass
        
        # Load data from nflverse
        logger.info(f"Calling loader function: {dataset_config.loader_fn}")
        raw_df = loader.load_dataset(dataset_config.loader_fn, **loader_kwargs)
        
        if raw_df.empty:
            logger.warning(f"No data returned for {dataset_config.id} partition {partition}")
            return {
                'dataset': dataset_config.id,
                'partition': partition,
                'row_count': 0,
                'status': 'skipped',
                'message': 'No data available',
                'duration_ms': int((time.time() - start_time) * 1000)
            }
        
        logger.info(f"Raw data shape: {raw_df.shape}")
        
        # Normalize column names
        df = normalize_column_names(raw_df)
        
        # Apply column rename map if configured
        if dataset_config.rename_map:
            df = apply_rename_map(df, dataset_config.rename_map)
        
        # Validate required fields
        validate_required_fields(df, dataset_config.required_fields)
        
        # Add metadata columns for S3
        df_with_metadata = add_metadata_columns(
            df, 
            dataset_config.id, 
            partition, 
            schema_version=dataset_config.schema_version
        )
        
        # Generate S3 path
        s3_path = generate_s3_path(
            dataset_config.id, 
            partition, 
            settings.bronze_bucket, 
            settings.bronze_prefix
        )
        
        # Compute file hash
        file_hash = compute_dataframe_hash(df, dataset_config.pk)
        
        # Write to S3
        logger.info(f"Writing to S3: {s3_path}")
        s3_client.write_parquet(
            df_with_metadata, 
            s3_path, 
            metadata={
                '_file_hash': file_hash
            }
        )
        
        # Record file in registry
        snapshot_at = datetime.now(timezone.utc)
        file_id = postgres_client.record_file_registry(
            dataset=dataset_config.id,
            s3_path=s3_path,
            snapshot_at=snapshot_at,
            season=partition.get('season'),
            week=partition.get('week'),
            row_count=len(df),
            file_hash=file_hash,
            status='pending'
        )
        
        # Prepare records for Postgres upsert
        # Convert DataFrame to list of dicts for JSON storage
        records = df.to_dict('records')
        
        # Chunk large datasets for upsert
        if len(records) > settings.max_chunk_rows:
            logger.info(f"Chunking {len(records)} records into batches of {settings.max_chunk_rows}")
            chunks = chunk_dataframe(df, settings.max_chunk_rows)
            
            total_upserted = 0
            for i, chunk in enumerate(chunks):
                chunk_records = chunk.to_dict('records')
                upserted = postgres_client.upsert_json_records(
                    dataset_config.id, 
                    partition, 
                    chunk_records
                )
                total_upserted += upserted
                logger.info(f"Upserted chunk {i+1}/{len(chunks)}: {upserted} records")
        else:
            total_upserted = postgres_client.upsert_json_records(
                dataset_config.id, 
                partition, 
                records
            )
        
        # Update file registry status
        postgres_client.record_file_registry(
            dataset=dataset_config.id,
            s3_path=s3_path,
            snapshot_at=snapshot_at,
            season=partition.get('season'),
            week=partition.get('week'),
            row_count=len(df),
            file_hash=file_hash,
            status='applied'
        )
        
        # Update ingest manifest
        postgres_client.update_ingest_manifest(
            dataset=dataset_config.id,
            partition=partition,
            applied_file_id=file_id,
            row_count=len(df),
            file_hash=file_hash
        )
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        logger.info(f"Successfully loaded {dataset_config.id} partition {partition}: "
                   f"{len(df)} rows in {duration_ms}ms")
        
        return {
            'dataset': dataset_config.id,
            'partition': partition,
            'row_count': len(df),
            's3_path': s3_path,
            'file_hash': file_hash,
            'duration_ms': duration_ms,
            'status': 'success'
        }
        
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        
        logger.error(f"Failed to load {dataset_config.id} partition {partition}: {error_msg}")
        
        # Try to record failure in registry if possible
        try:
            postgres_client = get_postgres_client()
            postgres_client.record_file_registry(
                dataset=dataset_config.id,
                s3_path='',
                snapshot_at=datetime.now(timezone.utc),
                season=partition.get('season'),
                week=partition.get('week'),
                row_count=0,
                file_hash='',
                status='failed',
                message=error_msg
            )
        except:
            pass
        
        return {
            'dataset': dataset_config.id,
            'partition': partition,
            'row_count': 0,
            'status': 'failed',
            'message': error_msg,
            'duration_ms': duration_ms
        }