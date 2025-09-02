# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fantasy Insights is a production-grade fantasy football insights and projections platform built as a monorepo with the following architecture:

- **app-api/**: FastAPI backend service with Pydantic v2, Uvicorn, structured logging
- **app-web/**: Next.js 14 frontend with App Router, TypeScript, and Tailwind CSS  
- **dwh/**: dbt data warehouse project with PostgreSQL adapter
- **flows/**: Prefect v2 orchestration for data processing workflows

## Common Development Commands

### Environment Setup
```bash
# Copy environment configuration
cp .env.example .env

# Start all services
make up

# Stop all services  
make down

# View logs
make logs
```

### Development Workflow
```bash
# Run tests
make test

# Format code
make fmt

# Lint code
make lint

# Type checking
make typecheck

# Test dbt connection
make dbt-debug

# Run Prefect flow
make flow
```

### Individual Service Commands
```bash
# Run API locally (in container)
make api

# Run web locally (in container)  
make web
```

## Architecture Details

### API Service (app-api/)
- FastAPI application with structured logging
- Health check endpoint: `/health`
- Meta endpoint: `/v1/meta` 
- Pydantic settings for environment configuration
- SQLAlchemy with PostgreSQL via psycopg
- Alembic for database migrations
- CORS enabled for local development

### Web Application (app-web/)
- Next.js 14 with App Router
- TypeScript with strict type checking
- Tailwind CSS for styling
- Client-side API health checking
- Environment badge component
- Responsive design with sample data table

### Data Warehouse (dwh/)
- dbt project with PostgreSQL adapter
- Environment-based profile configuration
- Staging and marts model directories
- Seeds directory for static data

### Orchestration (flows/)
- Prefect v2 flows for data processing
- Currently contains noop placeholder flow
- Future expansion for ingestion and transformations

## Development Environment

### Local Stack (Docker Compose)
- **PostgreSQL 16**: Primary database (port 5432)
- **pgweb**: Database admin interface (port 8081) 
- **MinIO**: S3-compatible storage (console: 9001, API: 9000)
- **app-api**: FastAPI service (port 8000)
- **app-web**: Next.js frontend (port 3000)

### Environment Variables
Key environment variables (see `.env.example`):
- `POSTGRES_*`: Database connection settings
- `MINIO_*`: Object storage settings  
- `ALLOWED_ORIGINS`: CORS origins for API
- `NEXT_PUBLIC_API_URL`: API endpoint for frontend

## Testing and Quality

### Python (API)
- **Testing**: pytest with async support
- **Linting**: Ruff for code quality
- **Type Checking**: Mypy with strict mode
- **Formatting**: Ruff formatter

### TypeScript (Web)
- **Linting**: ESLint with Next.js config
- **Type Checking**: TypeScript strict mode
- **Formatting**: Prettier

### CI/CD
GitHub Actions workflow runs:
- API: ruff check/format, mypy, pytest
- Web: ESLint, TypeScript, build
- dbt: connection test with temporary PostgreSQL

## Code Conventions

- **Python**: 100-character line length, Python 3.11+ features
- **TypeScript**: 2-space indentation, strict type checking
- **Imports**: Absolute imports preferred, organized by Ruff/ESLint
- **Environment**: Never commit secrets, use `.env` files
- **Commits**: Conventional commits (feat:, fix:, chore:)

## Data Ingestion Commands (Stage 1)

### Ingestion Operations
```bash
# Run daily refresh (current season/week)
make ingest

# Run backfill for specific seasons
make backfill SEASONS=2023,2024

# Check ingestion status
make status

# Check dbt source freshness
make dbt-freshness
```

### Data Pipeline Architecture

**Bronze Layer (S3/MinIO)**:
- Raw nflverse data stored as Parquet with snappy compression
- Partitioned by dataset and time (season/week/snapshot_date)
- Path: `s3://bronze/nflverse/{dataset}/{partitions}/{file}.parquet`

**Raw Schema (PostgreSQL)**:
- Schema `raw` with tables per dataset containing JSONB data
- Schema `ops` with file registry and ingest manifest for tracking
- Idempotent upserts based on composite primary keys

**Dataset Configuration**:
- Managed via `flows/config/datasets.yml`
- Defines partitioning, primary keys, required fields per dataset
- Supports weekly, seasonal, and snapshot partition types

### Available Datasets

- `players` - Master player index (snapshot)
- `rosters` - Team rosters (seasonal) 
- `schedules` - Game schedules (seasonal)
- `weekly_player_stats` - Weekly player stats
- `participation` - Snap counts and participation
- `injuries` - Injury reports  
- `depth_charts` - Team depth charts

## Stage Status

**Stage 0** ✅ - Project scaffold with development environment  
**Stage 1** ✅ - Data ingestion with MinIO bronze layer and PostgreSQL raw tables
- ✅ nflverse data loaders with nfl_data_py
- ✅ S3/MinIO bronze layer with Parquet storage
- ✅ PostgreSQL raw schema with JSONB storage
- ✅ Ops tables for file tracking and manifest
- ✅ Prefect flows for daily refresh and backfill
- ✅ dbt sources and basic staging models
- ✅ API endpoints for ops monitoring
- ✅ Web UI for data operations dashboard

**Stage 2** 🚧 - dbt transformations and marts (planned)  
**Stage 3** 🚧 - ML projections and insights (planned)