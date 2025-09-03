{{ config(materialized='view') }}

SELECT DISTINCT ON (season, week, {{ j_get_text('data', 'player_id') }}, {{ j_get_text('data', 'team') }})
  season,
  week,
  {{ j_get_text('data', 'player_id') }} AS player_id,
  {{ j_get_text('data', 'team') }} AS team,
  {{ j_get_text('data', 'position') }} AS position,
  
  -- Passing stats
  {{ j_get_num('data', 'attempts') }} AS attempts,
  {{ j_get_num('data', 'completions') }} AS completions,
  {{ j_get_num('data', 'passing_yards') }} AS passing_yards,
  {{ j_get_num('data', 'passing_tds') }} AS passing_tds,
  {{ j_get_num('data', 'interceptions') }} AS interceptions,
  {{ j_get_num('data', 'sacks') }} AS sacks,
  
  -- Rushing stats
  {{ j_get_num('data', 'carries') }} AS carries,
  {{ j_get_num('data', 'rushing_yards') }} AS rushing_yards,
  {{ j_get_num('data', 'rushing_tds') }} AS rushing_tds,
  
  -- Receiving stats
  {{ j_get_num('data', 'targets') }} AS targets,
  {{ j_get_num('data', 'receptions') }} AS receptions,
  {{ j_get_num('data', 'receiving_yards') }} AS receiving_yards,
  {{ j_get_num('data', 'receiving_tds') }} AS receiving_tds,
  
  -- Other stats
  COALESCE({{ j_get_num('data', 'fumbles') }}, {{ j_get_num('data', 'rushing_fumbles') }} + {{ j_get_num('data', 'receiving_fumbles') }}) AS fumbles,
  COALESCE({{ j_get_num('data', 'fumbles_lost') }}, {{ j_get_num('data', 'rushing_fumbles_lost') }} + {{ j_get_num('data', 'receiving_fumbles_lost') }}) AS fumbles_lost,
  COALESCE({{ j_get_num('data', 'two_point_conversions') }}, {{ j_get_num('data', 'passing_2pt_conversions') }} + {{ j_get_num('data', 'rushing_2pt_conversions') }} + {{ j_get_num('data', 'receiving_2pt_conversions') }}) AS two_ptm,
  {{ j_get_num('data', 'target_share') }} AS target_share,
  {{ j_get_num('data', 'air_yards_share') }} AS air_yards_share,
  {{ j_get_num('data', 'wopr') }} AS wopr,
  
  _ingested_at

FROM {{ source('raw', 'weekly_player_stats') }}
WHERE dataset = 'weekly_player_stats'
ORDER BY season, week, {{ j_get_text('data', 'player_id') }}, {{ j_get_text('data', 'team') }}, _ingested_at DESC