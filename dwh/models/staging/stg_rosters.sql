{{ config(materialized='view') }}

SELECT
  season,
  {{ j_get_text('data', 'team') }} AS team,
  {{ j_get_text('data', 'gsis_id') }} AS player_id,
  {{ j_get_text('data', 'position') }} AS position,
  {{ j_get_int('data', 'jersey_number') }} AS jersey_number,
  {{ j_get_text('data', 'status', "'Active'") }} AS status,
  _ingested_at

FROM {{ source('raw', 'rosters') }}
WHERE dataset = 'rosters'