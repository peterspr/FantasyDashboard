# Fantasy Insights

A production-grade fantasy football insights and projections platform built with FastAPI, Next.js, dbt, and Prefect.

## Quick Start

Get the full stack running in under 60 seconds:

```bash
# Clone and enter the repo
git clone <repo-url>
cd fantasy-insights

# Copy environment file
cp .env.example .env

# Start the stack
make up

# Verify everything is running
curl http://localhost:8000/health
curl http://localhost:3000
```

## Services

- **API**: FastAPI service at http://localhost:8000
- **Web**: Next.js frontend at http://localhost:3000  
- **Database**: PostgreSQL at localhost:5432
- **DB Admin**: pgweb at http://localhost:8081
- **Object Storage**: MinIO console at http://localhost:9001

## Data Ingestion (Stage 1)

### Running Ingestion

```bash
# Run daily refresh (current season/week)
make ingest

# Run backfill for historical data
make backfill SEASONS=2023,2024

# Check ingestion status
make status

# View ops dashboard
# Visit http://localhost:3000/ops
```

### Data Pipeline

1. **Bronze Layer**: Raw NFL data ingested from nflverse to MinIO/S3 as Parquet
2. **Raw Tables**: Mirrored to PostgreSQL with JSONB storage
3. **Ops Tracking**: File registry and manifest tracking for idempotency
4. **dbt Sources**: Source definitions with freshness monitoring

### Available Datasets

- `players` - Master player index (snapshot daily)
- `rosters` - Team rosters (seasonal)
- `schedules` - Game schedules (seasonal)
- `weekly_player_stats` - Weekly player statistics
- `participation` - Snap counts and participation  
- `injuries` - Injury reports
- `depth_charts` - Team depth charts

### S3 Data Layout

```
s3://bronze/nflverse/
├── players/snapshot_date=2024-08-26/
├── rosters/season=2024/
├── schedules/season=2024/
├── weekly_player_stats/season=2024/week=01/
├── participation/season=2024/week=01/
├── injuries/season=2024/week=01/
└── depth_charts/season=2024/week=01/
```

## Development

```bash
# Start all services
make up

# View logs
make logs

# Run tests
make test

# Format code
make fmt

# Lint code
make lint

# Type check
make typecheck

# Test dbt connection
make dbt-debug

# Check data freshness
make dbt-freshness

# Stop services
make down
```

## API Endpoints

- `GET /health` - Health check
- `GET /v1/meta` - Service metadata
- `GET /v1/ops/ingest/manifest/latest` - Latest ingestion status

## Architecture

- `app-api/` - FastAPI REST API service
- `app-web/` - Next.js frontend application  
- `dwh/` - dbt data warehouse transformations
- `flows/` - Prefect data orchestration

## Stage Status

**Stage 0** ✅ - Project scaffold with development environment  
**Stage 1** ✅ - Data ingestion with MinIO bronze layer and raw PostgreSQL tables  
**Stage 2** 🚧 - dbt transformations and marts (planned)  
**Stage 3** 🚧 - ML projections and insights (planned)  

## Contributing

This project uses conventional commits. Use prefixes like `feat:`, `fix:`, `chore:`.

## License

MIT