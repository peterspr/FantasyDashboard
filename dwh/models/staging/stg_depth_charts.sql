{{ config(materialized='view') }}

SELECT
  season,
  week,
  {{ j_get_text('data', 'team') }} AS team,
  {{ j_get_text('data', 'gsis_id') }} AS player_id,
  {{ j_get_text('data', 'position') }} AS position,
  {{ j_get_int('data', 'depth_team') }} AS pos_rank,
  LOWER(REPLACE({{ j_get_text('data', 'formation') }}, ' ', '_')) AS role,
  _ingested_at

FROM {{ source('raw', 'depth_charts') }}
WHERE dataset = 'depth_charts'