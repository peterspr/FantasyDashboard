{{ config(
  materialized='table',
  indexes=[
    {'columns': ['season', 'week', 'player_id']},
    {'columns': ['season', 'week', 'scoring']},
  ]
) }}

SELECT 
  s.season,
  s.week,
  s.player_id,
  p.display_name AS name,
  COALESCE(r.team, s.team) AS team,
  COALESCE(r.position, s.position) AS position,
  'standard' AS scoring,
  
  -- Calculate standard fantasy points
  (COALESCE(s.receiving_yards, 0) * 0.1) +
  (COALESCE(s.receiving_tds, 0) * 6) +
  (COALESCE(s.rushing_yards, 0) * 0.1) +
  (COALESCE(s.rushing_tds, 0) * 6) +
  (COALESCE(s.passing_yards, 0) * 0.04) +
  (COALESCE(s.passing_tds, 0) * 4) +
  (COALESCE(s.interceptions, 0) * -2) +
  (COALESCE(s.fumbles_lost, 0) * -2) AS actual_points
  
FROM {{ ref('stg_weekly_player_stats') }} s
LEFT JOIN {{ ref('stg_players') }} p ON s.player_id = p.player_id
LEFT JOIN {{ ref('stg_rosters') }} r ON s.player_id = r.player_id AND s.season = r.season
WHERE s.season >= 2023
  AND s.player_id IS NOT NULL

UNION ALL

SELECT 
  s.season,
  s.week,
  s.player_id,
  p.display_name AS name,
  COALESCE(r.team, s.team) AS team,
  COALESCE(r.position, s.position) AS position,
  'ppr' AS scoring,
  
  -- Calculate PPR fantasy points
  (COALESCE(s.receptions, 0) * 1) +
  (COALESCE(s.receiving_yards, 0) * 0.1) +
  (COALESCE(s.receiving_tds, 0) * 6) +
  (COALESCE(s.rushing_yards, 0) * 0.1) +
  (COALESCE(s.rushing_tds, 0) * 6) +
  (COALESCE(s.passing_yards, 0) * 0.04) +
  (COALESCE(s.passing_tds, 0) * 4) +
  (COALESCE(s.interceptions, 0) * -2) +
  (COALESCE(s.fumbles_lost, 0) * -2) AS actual_points
  
FROM {{ ref('stg_weekly_player_stats') }} s
LEFT JOIN {{ ref('stg_players') }} p ON s.player_id = p.player_id
LEFT JOIN {{ ref('stg_rosters') }} r ON s.player_id = r.player_id AND s.season = r.season
WHERE s.season >= 2023
  AND s.player_id IS NOT NULL

UNION ALL

SELECT 
  s.season,
  s.week,
  s.player_id,
  p.display_name AS name,
  COALESCE(r.team, s.team) AS team,
  COALESCE(r.position, s.position) AS position,
  'half_ppr' AS scoring,
  
  -- Calculate Half PPR fantasy points
  (COALESCE(s.receptions, 0) * 0.5) +
  (COALESCE(s.receiving_yards, 0) * 0.1) +
  (COALESCE(s.receiving_tds, 0) * 6) +
  (COALESCE(s.rushing_yards, 0) * 0.1) +
  (COALESCE(s.rushing_tds, 0) * 6) +
  (COALESCE(s.passing_yards, 0) * 0.04) +
  (COALESCE(s.passing_tds, 0) * 4) +
  (COALESCE(s.interceptions, 0) * -2) +
  (COALESCE(s.fumbles_lost, 0) * -2) AS actual_points
  
FROM {{ ref('stg_weekly_player_stats') }} s
LEFT JOIN {{ ref('stg_players') }} p ON s.player_id = p.player_id
LEFT JOIN {{ ref('stg_rosters') }} r ON s.player_id = r.player_id AND s.season = r.season
WHERE s.season >= 2023
  AND s.player_id IS NOT NULL