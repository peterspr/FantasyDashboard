# Data Warehouse (dbt)

This directory contains the dbt project for transforming NFL data.

## Setup

1. Set up your database profile via environment variables:

```bash
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=fantasy
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
```

2. Test the connection:

```bash
dbt debug
```

## Project Structure

- `models/sources/` - Source table definitions for raw ingested data
- `models/staging/` - Raw data transformations (Stage 2+)
- `models/marts/` - Business logic and final models (Stage 2+)
- `seeds/` - Static data files

## Raw Data Sources

The project includes sources for the following raw tables in the `raw` schema:
- `players` - Master player index
- `rosters` - Seasonal team rosters  
- `schedules` - Game schedules
- `weekly_player_stats` - Weekly player statistics
- `participation` - Snap counts and participation
- `injuries` - Injury reports
- `depth_charts` - Team depth charts

## Common Commands

```bash
# Install dependencies
dbt deps

# Test database connection
dbt debug

# Check source freshness
dbt source freshness

# Run placeholder staging models (Stage 1)
dbt run --models staging

# Test data sources
dbt test --models source:raw

# Generate documentation
dbt docs generate
dbt docs serve
```

## Stage 1 Status

Currently includes:
- ✅ Source definitions for all raw tables
- ✅ Basic freshness tests for weekly datasets
- ✅ Placeholder staging model for validation
- ✅ Connection validation via `dbt debug`

Stage 2 will add full staging models and marts.