import hashlib
import json
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional

from sqlalchemy import create_engine, text, MetaData, Table, Column, Integer, String, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import JSONB, ENUM
from sqlalchemy.orm import sessionmaker
from prefect import get_run_logger

from .settings import get_settings


def safe_json_serialize(obj):
    """Safely serialize objects to JSON, handling NaN, infinite values, and pandas types."""
    if isinstance(obj, dict):
        return {k: safe_json_serialize(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [safe_json_serialize(v) for v in obj]
    elif isinstance(obj, (np.floating, float)) and (np.isnan(obj) or np.isinf(obj)):
        return None
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (pd.Timestamp, pd.Timedelta)):
        return str(obj)
    elif isinstance(obj, pd.NaT.__class__):
        return None
    elif hasattr(obj, 'isoformat'):  # datetime objects
        return obj.isoformat()
    else:
        return obj


class PostgresClient:
    """PostgreSQL client for raw data operations."""
    
    def __init__(self):
        self.settings = get_settings()
        self.logger = get_run_logger()
        self.engine = create_engine(self.settings.database_url)
        self.Session = sessionmaker(bind=self.engine)
        self.metadata = MetaData()
    
    def ensure_schema_and_ops(self) -> None:
        """Create raw schema and ops tables if they don't exist."""
        with self.engine.connect() as conn:
            # Create schemas
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS raw"))
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS ops"))
            conn.commit()
            
            # Create status enum
            conn.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE ops.ingest_status AS ENUM ('pending', 'applied', 'skipped', 'failed');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """))
            conn.commit()
        
        # Create ops tables
        self._create_ops_tables()
        
        self.logger.info("Ensured raw schema and ops tables exist")
    
    def _create_ops_tables(self) -> None:
        """Create ops tables."""
        # File registry table
        file_registry = Table(
            'raw_file_registry',
            self.metadata,
            Column('id', Integer, primary_key=True),
            Column('dataset', String(100), nullable=False),
            Column('s3_path', String(500), nullable=False),
            Column('snapshot_at', DateTime(timezone=True), nullable=False),
            Column('season', Integer, nullable=True),
            Column('week', Integer, nullable=True),
            Column('row_count', Integer, nullable=False),
            Column('hash', String(32), nullable=False),
            Column('ingested_at', DateTime(timezone=True), nullable=False, default=datetime.utcnow),
            Column('status', ENUM('pending', 'applied', 'skipped', 'failed', name='ingest_status'), nullable=False),
            Column('message', Text, nullable=True),
            schema='ops'
        )
        
        # Ingest manifest table
        ingest_manifest = Table(
            'raw_ingest_manifest',
            self.metadata,
            Column('id', Integer, primary_key=True),
            Column('dataset', String(100), nullable=False),
            Column('partition', JSONB, nullable=False),
            Column('applied_file_id', Integer, nullable=True),
            Column('row_count', Integer, nullable=False),
            Column('hash', String(32), nullable=False),
            Column('applied_at', DateTime(timezone=True), nullable=False, default=datetime.utcnow),
            schema='ops'
        )
        
        # Add unique constraint on dataset + partition
        Index('uq_manifest_dataset_partition', ingest_manifest.c.dataset, ingest_manifest.c.partition, unique=True)
        
        # Create tables
        self.metadata.create_all(self.engine)
    
    def ensure_raw_table(self, dataset: str) -> None:
        """Create raw table for dataset if it doesn't exist."""
        table_name = f"raw.{dataset}"
        
        with self.engine.connect() as conn:
            # Check if table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'raw' AND table_name = :dataset
                )
            """), {"dataset": dataset}).scalar()
            
            if not result:
                # Create table with simple primary key
                conn.execute(text(f"""
                    CREATE TABLE {table_name} (
                        dataset text NOT NULL,
                        season integer DEFAULT -1,
                        week integer DEFAULT -1, 
                        player_id text DEFAULT '',
                        team text DEFAULT '',
                        game_id text DEFAULT '',
                        data jsonb NOT NULL,
                        _ingested_at timestamptz NOT NULL DEFAULT now(),
                        _hash text NOT NULL,
                        PRIMARY KEY (dataset, season, week, player_id, team, game_id)
                    )
                """))
                
                # Create indexes
                conn.execute(text(f"CREATE INDEX idx_{dataset}_season_week ON {table_name} (season, week)"))
                conn.execute(text(f"CREATE INDEX idx_{dataset}_data_gin ON {table_name} USING gin (data)"))
                
                conn.commit()
                self.logger.info(f"Created raw table for {dataset}")
    
    def upsert_json_records(self, dataset: str, partition: Dict[str, Any], records: List[Dict[str, Any]]) -> int:
        """Upsert records into raw table."""
        if not records:
            return 0
        
        self.ensure_raw_table(dataset)
        
        # For depth charts, remove exact duplicates first
        if dataset == 'depth_charts':
            original_count = len(records)
            # Create a set to track unique record signatures
            seen_records = set()
            deduplicated_records = []
            for record in records:
                # Create a signature from all record contents
                record_sig = str(sorted(record.items()))
                if record_sig not in seen_records:
                    seen_records.add(record_sig)
                    deduplicated_records.append(record)
            records = deduplicated_records
            self.logger.info(f"Deduplicated depth charts from {original_count} to {len(deduplicated_records)} unique records")
        
        # Prepare records for upsert
        upsert_records = []
        for record in records:
            # Extract standard columns with defaults for NULL values
            season = record.get('season') or -1
            week = record.get('week') or -1
            player_id = record.get('player_id') or ''
            team = record.get('team') or ''
            game_id = record.get('game_id') or ''
            
            # Compute hash from primary key values and data
            pk_values = [
                str(dataset),
                str(season),
                str(week),
                str(player_id),
                str(team),
                str(game_id)
            ]
            hash_input = '|'.join(pk_values) + '|' + str(sorted(record.items()))
            record_hash = hashlib.md5(hash_input.encode()).hexdigest()
            
            # For depth charts, create completely unique IDs since they have multiple records per player
            if dataset == 'depth_charts':
                # Create a unique identifier from all record contents
                unique_id = hashlib.md5(str(sorted(record.items())).encode()).hexdigest()[:16]
                game_id = unique_id
            else:
                # Add row hash to make each record unique (for cases with multiple entries per player)
                row_id = hashlib.md5(str(sorted(record.items())).encode()).hexdigest()[:8]
                game_id = game_id or row_id  # Use row_id if game_id is empty to ensure uniqueness
            
            upsert_records.append({
                'dataset': dataset,
                'season': season,
                'week': week,
                'player_id': player_id,
                'team': team,
                'game_id': game_id,
                'data': record,
                '_hash': record_hash
            })
        
        # Break large batches into smaller chunks to avoid SQL parameter limits
        batch_size = 500  # Conservative batch size for SQL parameters
        total_upserted = 0
        
        for i in range(0, len(upsert_records), batch_size):
            batch = upsert_records[i:i + batch_size]
            total_upserted += self._upsert_batch(dataset, batch)
        
        self.logger.info(f"Upserted {total_upserted} records into raw.{dataset}")
        return total_upserted
    
    def _upsert_batch(self, dataset: str, batch_records: List[Dict[str, Any]]) -> int:
        """Upsert a single batch of records."""
        table_name = f"raw.{dataset}"
        
        with self.engine.connect() as conn:
            # Use VALUES clause for batch upsert
            placeholders = []
            values = {}
            
            for i, record in enumerate(batch_records):
                placeholders.append(f"(:dataset_{i}, :season_{i}, :week_{i}, :player_id_{i}, :team_{i}, :game_id_{i}, :data_{i}, :hash_{i})")
                values.update({
                    f'dataset_{i}': record['dataset'],
                    f'season_{i}': record['season'],
                    f'week_{i}': record['week'],
                    f'player_id_{i}': record['player_id'],
                    f'team_{i}': record['team'],
                    f'game_id_{i}': record['game_id'],
                    f'data_{i}': json.dumps(safe_json_serialize(record['data'])) if isinstance(record['data'], dict) else record['data'],
                    f'hash_{i}': record['_hash']
                })
            
            upsert_sql = f"""
                INSERT INTO {table_name} (dataset, season, week, player_id, team, game_id, data, _hash)
                VALUES {', '.join(placeholders)}
                ON CONFLICT (dataset, season, week, player_id, team, game_id)
                DO UPDATE SET 
                    data = EXCLUDED.data,
                    _ingested_at = now(),
                    _hash = EXCLUDED._hash
                WHERE {table_name}._hash != EXCLUDED._hash
            """
            
            conn.execute(text(upsert_sql), values)
            conn.commit()
        
        return len(batch_records)
    
    def record_file_registry(self, dataset: str, s3_path: str, snapshot_at: datetime,
                           season: Optional[int], week: Optional[int], row_count: int,
                           file_hash: str, status: str, message: Optional[str] = None) -> int:
        """Record file in registry and return file ID."""
        with self.Session() as session:
            result = session.execute(text("""
                INSERT INTO ops.raw_file_registry 
                (dataset, s3_path, snapshot_at, season, week, row_count, hash, ingested_at, status, message)
                VALUES (:dataset, :s3_path, :snapshot_at, :season, :week, :row_count, :hash, now(), :status, :message)
                RETURNING id
            """), {
                'dataset': dataset,
                's3_path': s3_path,
                'snapshot_at': snapshot_at,
                'season': season,
                'week': week,
                'row_count': row_count,
                'hash': file_hash,
                'status': status,
                'message': message
            })
            
            file_id = result.scalar()
            session.commit()
            return file_id
    
    def update_ingest_manifest(self, dataset: str, partition: Dict[str, Any], 
                              applied_file_id: int, row_count: int, file_hash: str) -> None:
        """Update or insert manifest record."""
        with self.Session() as session:
            session.execute(text("""
                INSERT INTO ops.raw_ingest_manifest 
                (dataset, partition, applied_file_id, row_count, hash, applied_at)
                VALUES (:dataset, :partition, :applied_file_id, :row_count, :hash, now())
                ON CONFLICT (dataset, partition)
                DO UPDATE SET 
                    applied_file_id = EXCLUDED.applied_file_id,
                    row_count = EXCLUDED.row_count,
                    hash = EXCLUDED.hash,
                    applied_at = now()
            """), {
                'dataset': dataset,
                'partition': json.dumps(partition),
                'applied_file_id': applied_file_id,
                'row_count': row_count,
                'hash': file_hash
            })
            session.commit()
    
    def get_latest_manifest(self) -> List[Dict[str, Any]]:
        """Get latest manifest records per dataset."""
        with self.Session() as session:
            result = session.execute(text("""
                SELECT DISTINCT ON (dataset) 
                    dataset,
                    partition,
                    row_count,
                    applied_at
                FROM ops.raw_ingest_manifest
                ORDER BY dataset, applied_at DESC
            """))
            
            return [dict(row._mapping) for row in result]


def get_postgres_client() -> PostgresClient:
    """Get PostgreSQL client instance."""
    return PostgresClient()