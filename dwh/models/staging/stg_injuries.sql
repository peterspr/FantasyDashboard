{{ config(materialized='view') }}

SELECT
  season,
  week,
  {{ j_get_text('data', 'team') }} AS team,
  {{ j_get_text('data', 'gsis_id') }} AS player_id,
  {{ j_get_text('data', 'game_status') }} AS game_status,
  {{ j_get_text('data', 'practice_status') }} AS practice_status,
  {{ j_get_text('data', 'report_status') }} AS report_status,
  {{ j_get_text('data', 'injury_report') }} AS notes,
  {{ j_get_text('data', 'date_modified') }}::timestamp AS updated_at,
  _ingested_at

FROM {{ source('raw', 'injuries') }}
WHERE dataset = 'injuries'