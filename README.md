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

## Stage 3: Baseline Projections

### Running Projections

```bash
# Build efficiency priors and scoring weights
make dbt-seed

# Generate weekly and ROS projections  
make projections

# Example query - top PPR WRs this week
# Connect to database and run:
SELECT p.display_name, fp.team, fp.proj_pts, fp.low, fp.high
FROM marts.f_weekly_projection fp
JOIN staging.stg_players p ON fp.player_id = p.player_id  
WHERE fp.season=2024 AND fp.week=10 AND fp.scoring='ppr' AND fp.position='WR'
ORDER BY fp.proj_pts DESC LIMIT 25;
```

### Projection Methodology

**Transparent, rules-based projections (no ML):**

1. **Volume Prediction**: Team volume × player usage shares (4-week rolling avg)
2. **Efficiency with Shrinkage**: Season-to-date rates shrunk to league priors  
3. **Opponent Adjustment**: Defense vs position modifiers (capped ±30%)
4. **Scoring**: PPR/Half/Standard with configurable weights
5. **Confidence**: Binomial/Poisson variance with normal approximation

**Key Models:**
- `f_weekly_projection` - Weekly projections by player/week/scoring
- `f_ros_projection` - Rest-of-season aggregates  
- Seeds: `efficiency_priors.csv`, `scoring_weights.csv`

**Sample Queries:** See `/dwh/models/PROJECTION_QUERIES.md`

### Projection Components

Each projection includes:
- **Points**: Expected fantasy points with confidence interval (p10/p90)
- **Components**: Targets, receptions, yards, TDs broken down by type
- **Inputs**: Usage shares, opponent DvP adjustments, shrinkage factors
- **Explainers**: Top drivers of projection changes

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
- ✅ nflverse data loaders with nfl_data_py
- ✅ S3/MinIO bronze layer with Parquet storage  
- ✅ PostgreSQL raw schema with JSONB storage
- ✅ Ops tables for file tracking and manifest
- ✅ Prefect flows for daily refresh and backfill

**Stage 2** ✅ - dbt transformations and marts 
- ✅ Staging models for data cleaning and normalization
- ✅ Gold marts for weekly usage, defense vs position, calendar
- ✅ Incremental materialization with proper testing

**Stage 3** ✅ - Baseline projections (rules-based, no ML)
- ✅ Transparent methodology with volume × efficiency × opponent adjustment
- ✅ Bayesian shrinkage using league efficiency priors  
- ✅ Weekly and rest-of-season projections by scoring system
- ✅ Confidence intervals with component breakdowns
- ✅ Seeds, macros, tests, and sample queries

**Stage 4** 🚧 - API/UI for projections and ML enhancements (planned)  

## Contributing

This project uses conventional commits. Use prefixes like `feat:`, `fix:`, `chore:`.

## License

MIT