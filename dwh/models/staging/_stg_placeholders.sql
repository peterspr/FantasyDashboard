-- Stage 1 staging placeholder views for connectivity testing
-- These extract basic columns from raw JSONB data for validation

-- Weekly player stats staging
{{ config(materialized='view') }}

select
    dataset,
    season,
    week,
    player_id,
    data->>'season' as season_from_data,
    data->>'week' as week_from_data,
    data->>'player_id' as player_id_from_data,
    data->>'player_name' as player_name,
    data->>'team' as team,
    data->>'position' as position,
    _ingested_at
from {{ source('raw', 'weekly_player_stats') }}
where dataset = 'weekly_player_stats'
limit 100