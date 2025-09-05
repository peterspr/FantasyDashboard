{{ config(materialized='view') }}

WITH team_stats AS (
  SELECT 
    sch.season,
    sch.week,
    sch.game_id,
    
    -- Defense team is the team NOT being referenced in the offensive stats
    CASE 
      WHEN s.team = sch.home_team THEN sch.away_team
      WHEN s.team = sch.away_team THEN sch.home_team
    END AS def_team,
    
    s.team AS offense_team,
    
    -- Aggregate offensive stats allowed by defense
    SUM(COALESCE(s.passing_yards, 0) + COALESCE(s.rushing_yards, 0) + COALESCE(s.receiving_yards, 0)) AS total_yards_allowed,
    SUM(COALESCE(s.passing_tds, 0) + COALESCE(s.rushing_tds, 0) + COALESCE(s.receiving_tds, 0)) AS total_tds_allowed,
    SUM(COALESCE(s.sacks, 0)) AS sacks_by_defense,
    SUM(COALESCE(s.interceptions, 0)) AS ints_by_defense,
    SUM(COALESCE(s.fumbles_lost, 0)) AS fumbles_forced,
    
    -- Points allowed calculation (total touchdowns * 6 + other scoring assumptions)
    (SUM(COALESCE(s.passing_tds, 0) + COALESCE(s.rushing_tds, 0) + COALESCE(s.receiving_tds, 0)) * 6) +
    -- Estimate field goals and extra points (rough approximation)
    (GREATEST(0, LEAST(6, SUM(COALESCE(s.passing_yards, 0) + COALESCE(s.rushing_yards, 0) + COALESCE(s.receiving_yards, 0)) / 100)) * 3) AS estimated_points_allowed
    
  FROM {{ ref('stg_weekly_player_stats') }} s
  JOIN {{ ref('stg_schedules') }} sch 
    ON s.season = sch.season 
    AND s.week = sch.week
    AND (s.team = sch.home_team OR s.team = sch.away_team)
  WHERE sch.game_type = 'REG'
    AND sch.played = TRUE
    AND s.season >= 2023
  GROUP BY sch.season, sch.week, sch.game_id, def_team, offense_team
),

defense_stats AS (
  SELECT 
    ts.season,
    ts.week,
    ts.def_team AS team,
    'DST' AS position,
    
    -- Aggregate stats for each defense per week
    SUM(ts.total_yards_allowed) AS yards_allowed,
    SUM(ts.total_tds_allowed) AS touchdowns_allowed,
    
    -- Use actual game scores when available, otherwise use estimates
    COALESCE(
      CASE 
        WHEN ts.def_team = sch.home_team THEN sch.away_score
        WHEN ts.def_team = sch.away_team THEN sch.home_score
      END,
      SUM(ts.estimated_points_allowed)
    ) AS points_allowed,
    
    SUM(ts.sacks_by_defense) AS sacks,
    SUM(ts.ints_by_defense) AS interceptions,
    SUM(ts.fumbles_forced) AS fumble_recoveries,
    
    -- Initialize defensive/special teams TDs as 0 (would need additional data sources)
    0 AS def_tds,
    0 AS special_tds,
    0 AS safeties,
    0 AS blocked_kicks,
    
    CURRENT_TIMESTAMP AS _calculated_at
    
  FROM team_stats ts
  LEFT JOIN {{ ref('stg_schedules') }} sch
    ON ts.season = sch.season
    AND ts.week = sch.week
    AND ts.game_id = sch.game_id
  GROUP BY ts.season, ts.week, ts.def_team, sch.home_team, sch.away_team, sch.home_score, sch.away_score
)

SELECT 
  season,
  week,
  team || '_DST' AS player_id,  -- Create unique defense player IDs
  team,
  position,
  points_allowed,
  yards_allowed,
  touchdowns_allowed,
  sacks,
  interceptions,
  fumble_recoveries,
  def_tds,
  special_tds,
  safeties,
  blocked_kicks,
  _calculated_at
FROM defense_stats
ORDER BY season, week, team
