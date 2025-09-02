{{ config(materialized='view') }}

SELECT
  season,
  week,
  {{ j_get_text('data', 'team') }} AS team,
  {{ j_get_text('data', 'player_id') }} AS player_id,
  {{ j_get_num('data', 'offense_snaps') }} AS offense_snaps,
  {{ j_get_num('data', 'offense_pct') }} AS offense_snap_pct,
  {{ j_get_num('data', 'routes_run') }} AS routes_run,
  {{ j_get_num('data', 'pass_block_snaps') }} AS pass_block_snaps,
  {{ j_get_num('data', 'run_block_snaps') }} AS run_block_snaps,
  {{ j_get_num('data', 'rush_attempts') }} AS rush_attempts_participation,
  _ingested_at

FROM {{ source('raw', 'participation') }}
WHERE dataset = 'participation'