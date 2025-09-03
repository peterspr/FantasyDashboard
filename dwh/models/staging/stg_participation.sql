{{ config(materialized='view') }}

SELECT
  season,
  week,
  {{ j_get_text('data', 'team') }} AS team,
  {{ j_get_text('data', 'player_id') }} AS player_id,
  {{ j_get_text('data', 'position') }} AS position,
  {{ j_get_num('data', 'offense_snaps') }} AS offense_snaps,
  {{ j_get_num('data', 'offense_pct') }} AS offense_snap_pct,
  {{ j_get_num('data', 'defense_snaps') }} AS defense_snaps,
  {{ j_get_num('data', 'defense_pct') }} AS defense_snap_pct,
  {{ j_get_num('data', 'st_snaps') }} AS st_snaps,
  {{ j_get_num('data', 'st_pct') }} AS st_snap_pct,
  -- Routes and other detailed data not available in this dataset
  NULL::numeric AS routes_run,
  NULL::numeric AS pass_block_snaps,
  NULL::numeric AS run_block_snaps,
  NULL::numeric AS rush_attempts_participation,
  _ingested_at

FROM {{ source('raw', 'participation') }}
WHERE dataset = 'participation'