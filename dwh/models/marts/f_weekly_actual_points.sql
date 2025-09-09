{{ config(
  materialized='table',
  indexes=[
    {'columns': ['season', 'week', 'player_id']},
    {'columns': ['season', 'week', 'scoring']},
  ]
) }}

-- Standard scoring for players
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

-- PPR scoring for players
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

-- Half PPR scoring for players
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

UNION ALL

-- Standard scoring for defenses
SELECT 
  ds.season,
  ds.week,
  ds.player_id,
  ds.team || ' DST' AS name,
  ds.team,
  ds.position,
  'standard' AS scoring,
  
  -- Calculate standard defense fantasy points
  {{ score_defense_points('', 'ds.points_allowed', 'ds.sacks', 'ds.interceptions', 'ds.fumble_recoveries', 'ds.def_tds', 'ds.special_tds', 'ds.safeties', 'ds.blocked_kicks') }} AS actual_points
  
FROM {{ ref('stg_team_defense_stats') }} ds
WHERE ds.season >= 2023

UNION ALL

-- PPR scoring for defenses (same as standard)
SELECT 
  ds.season,
  ds.week,
  ds.player_id,
  ds.team || ' DST' AS name,
  ds.team,
  ds.position,
  'ppr' AS scoring,
  
  -- Calculate PPR defense fantasy points (same as standard)
  {{ score_defense_points('', 'ds.points_allowed', 'ds.sacks', 'ds.interceptions', 'ds.fumble_recoveries', 'ds.def_tds', 'ds.special_tds', 'ds.safeties', 'ds.blocked_kicks') }} AS actual_points
  
FROM {{ ref('stg_team_defense_stats') }} ds
WHERE ds.season >= 2023

UNION ALL

-- Half PPR scoring for defenses (same as standard)
SELECT 
  ds.season,
  ds.week,
  ds.player_id,
  ds.team || ' DST' AS name,
  ds.team,
  ds.position,
  'half_ppr' AS scoring,
  
  -- Calculate Half PPR defense fantasy points (same as standard)
  {{ score_defense_points('', 'ds.points_allowed', 'ds.sacks', 'ds.interceptions', 'ds.fumble_recoveries', 'ds.def_tds', 'ds.special_tds', 'ds.safeties', 'ds.blocked_kicks') }} AS actual_points
  
FROM {{ ref('stg_team_defense_stats') }} ds
WHERE ds.season >= 2023