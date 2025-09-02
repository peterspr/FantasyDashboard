"""Stage 1 - Create raw schema and ops tables

Revision ID: 001_stage1_raw_ops
Revises: 
Create Date: 2024-08-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_stage1_raw_ops'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Create raw schema and ops tables for Stage 1 ingestion."""
    
    # Create schemas
    op.execute("CREATE SCHEMA IF NOT EXISTS raw")
    op.execute("CREATE SCHEMA IF NOT EXISTS ops")
    
    # Create ingest_status enum
    ingest_status = postgresql.ENUM('pending', 'applied', 'skipped', 'failed', name='ingest_status', schema='ops')
    ingest_status.create(op.get_bind())
    
    # Create ops.raw_file_registry table
    op.create_table('raw_file_registry',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dataset', sa.String(100), nullable=False),
        sa.Column('s3_path', sa.String(500), nullable=False),
        sa.Column('snapshot_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('season', sa.Integer(), nullable=True),
        sa.Column('week', sa.Integer(), nullable=True),
        sa.Column('row_count', sa.Integer(), nullable=False),
        sa.Column('hash', sa.String(32), nullable=False),
        sa.Column('ingested_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('status', ingest_status, nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        schema='ops'
    )
    
    # Create ops.raw_ingest_manifest table
    op.create_table('raw_ingest_manifest',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dataset', sa.String(100), nullable=False),
        sa.Column('partition', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('applied_file_id', sa.Integer(), nullable=True),
        sa.Column('row_count', sa.Integer(), nullable=False),
        sa.Column('hash', sa.String(32), nullable=False),
        sa.Column('applied_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        schema='ops'
    )
    
    # Add unique constraint on dataset + partition
    op.create_index('uq_manifest_dataset_partition', 'raw_ingest_manifest', 
                    ['dataset', 'partition'], unique=True, schema='ops')


def downgrade():
    """Drop raw schema and ops tables."""
    
    # Drop ops tables
    op.drop_table('raw_ingest_manifest', schema='ops')
    op.drop_table('raw_file_registry', schema='ops')
    
    # Drop enum
    ingest_status = postgresql.ENUM('pending', 'applied', 'skipped', 'failed', name='ingest_status', schema='ops')
    ingest_status.drop(op.get_bind())
    
    # Drop schemas (only if empty)
    op.execute("DROP SCHEMA IF EXISTS ops CASCADE")
    op.execute("DROP SCHEMA IF EXISTS raw CASCADE")