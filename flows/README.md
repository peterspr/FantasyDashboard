# Prefect Flows

This directory contains Prefect orchestration flows for data processing.

## Stage 0 - Noop Flow

Currently contains a placeholder noop flow that demonstrates the Prefect setup.

## Running Flows

```bash
# Run the noop flow
python flows/daily_refresh.py

# Or via make
make flow
```

## Future Stages

In later stages, this will contain:
- Data ingestion flows
- dbt transformation orchestration  
- Model training and evaluation flows
- Data quality monitoring