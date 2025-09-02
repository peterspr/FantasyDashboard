{{ config(materialized='view') }}

SELECT
  season,
  {{ j_get_int('data', 'week') }} AS week,
  {{ j_get_text('data', 'game_id') }} AS game_id,
  {{ j_get_text('data', 'game_type', "'REG'") }} AS game_type,
  {{ j_get_text('data', 'gameday') }}::timestamp AS start_time,
  {{ j_get_text('data', 'home_team') }} AS home_team,
  {{ j_get_text('data', 'away_team') }} AS away_team,
  {{ j_get_num('data', 'home_score') }} AS home_score,
  {{ j_get_num('data', 'away_score') }} AS away_score,
  {{ j_get_text('data', 'location') }} AS venue,
  {{ j_get_text('data', 'surface') }} AS surface,
  CASE 
    WHEN {{ j_get_num('data', 'home_score') }} IS NOT NULL 
     AND {{ j_get_num('data', 'away_score') }} IS NOT NULL 
    THEN TRUE 
    ELSE FALSE 
  END AS played,
  _ingested_at

FROM {{ source('raw', 'schedules') }}
WHERE dataset = 'schedules'