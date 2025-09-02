{{
  config(
    materialized='incremental',
    unique_key=['season', 'week', 'def_team', 'position'],
    on_schema_change='sync_all_columns'
  )
}}

WITH player_fantasy_points AS (
  SELECT
    s.season,
    s.week,
    s.player_id,
    s.team AS offense_team,
    s.position,
    
    -- Calculate PPR fantasy points
    COALESCE(s.receptions, 0) * 1.0 +
    COALESCE(s.receiving_yards, 0) * 0.1 +
    COALESCE(s.receiving_tds, 0) * 6.0 +
    COALESCE(s.rushing_yards, 0) * 0.1 +
    COALESCE(s.rushing_tds, 0) * 6.0 +
    COALESCE(s.passing_yards, 0) * 0.04 +
    COALESCE(s.passing_tds, 0) * 4.0 -
    COALESCE(s.interceptions, 0) * 2.0 AS ppr_points,
    
    COALESCE(s.receiving_yards, 0) + COALESCE(s.rushing_yards, 0) + COALESCE(s.passing_yards, 0) AS total_yards,
    COALESCE(s.receiving_tds, 0) + COALESCE(s.rushing_tds, 0) + COALESCE(s.passing_tds, 0) AS total_tds,
    s._ingested_at
    
  FROM {{ ref('stg_weekly_player_stats') }} s
  WHERE position IN ('QB', 'RB', 'WR', 'TE')
    {% if is_incremental() %}
      AND s._ingested_at > (SELECT MAX(_ingested_at) FROM {{ this }})
    {% endif %}
),

with_defense_team AS (
  SELECT 
    pfp.*,
    sch.home_team,
    sch.away_team,
    sch.game_type,
    
    -- Map to defending team
    CASE 
      WHEN pfp.offense_team = sch.home_team THEN sch.away_team
      WHEN pfp.offense_team = sch.away_team THEN sch.home_team
    END AS def_team
    
  FROM player_fantasy_points pfp
  JOIN {{ ref('stg_schedules') }} sch
    ON pfp.season = sch.season
    AND pfp.week = sch.week
    AND (pfp.offense_team = sch.home_team OR pfp.offense_team = sch.away_team)
  WHERE sch.game_type = 'REG'  -- Regular season only
    AND sch.played = TRUE      -- Only completed games
),

defense_allowed AS (
  SELECT
    season,
    week,
    def_team,
    position,
    
    SUM(ppr_points) AS allowed_ppr_points,
    SUM(total_yards) AS allowed_yards,
    SUM(total_tds) AS allowed_tds,
    COUNT(DISTINCT player_id) AS sample_players,
    CURRENT_TIMESTAMP AS created_at,
    MAX(_ingested_at) AS _ingested_at
    
  FROM with_defense_team
  WHERE def_team IS NOT NULL
  GROUP BY season, week, def_team, position
)

SELECT 
  season,
  week,
  def_team,
  position,
  allowed_ppr_points,
  allowed_yards,
  allowed_tds,
  sample_players,
  _ingested_at,
  created_at
FROM defense_allowed