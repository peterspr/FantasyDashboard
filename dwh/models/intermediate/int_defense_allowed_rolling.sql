{{ config(materialized='view') }}

SELECT
  season,
  week,
  def_team,
  position,
  allowed_ppr_points,
  allowed_yards,
  allowed_tds,
  sample_players,
  
  -- Rolling 4-week averages
  {{ rolling_avg('allowed_ppr_points', 'season, week', 'def_team, position', 4) }} AS rolling_allowed_ppr_4w,
  {{ rolling_avg('allowed_yards', 'season, week', 'def_team, position', 4) }} AS rolling_allowed_yards_4w,
  {{ rolling_avg('allowed_tds', 'season, week', 'def_team, position', 4) }} AS rolling_allowed_tds_4w,
  
  -- Rolling 6-week averages  
  {{ rolling_avg('allowed_ppr_points', 'season, week', 'def_team, position', 6) }} AS rolling_allowed_ppr_6w,
  {{ rolling_avg('allowed_yards', 'season, week', 'def_team, position', 6) }} AS rolling_allowed_yards_6w,
  {{ rolling_avg('allowed_tds', 'season, week', 'def_team, position', 6) }} AS rolling_allowed_tds_6w,
  
  created_at,
  _ingested_at

FROM {{ ref('int_defense_allowed_raw') }}