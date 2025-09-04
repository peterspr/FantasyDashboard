{{
  config(
    materialized='incremental',
    unique_key=['season', 'week', 'team'],
    on_schema_change='sync_all_columns'
  )
}}

WITH
-- Get upcoming weeks that need team volume predictions 
upcoming_weeks AS (
  SELECT DISTINCT 
    cw.season,
    cw.week
  FROM {{ ref('f_calendar_weeks') }} cw
  WHERE cw.week_status IN ('current', 'future')
    AND NOT EXISTS (
      SELECT 1 FROM {{ ref('int_team_week_totals') }} t
      WHERE t.season = cw.season AND t.week = cw.week
    )
    -- Only include the immediate next week after the latest available data
    AND (cw.season, cw.week) = (
      SELECT 
        CASE 
          WHEN max_week = 18 THEN max_season + 1
          ELSE max_season
        END,
        CASE 
          WHEN max_week = 18 THEN 1
          ELSE max_week + 1
        END
      FROM (
        SELECT 
          MAX(season) as max_season,
          MAX(CASE WHEN season = (SELECT MAX(season) FROM {{ ref('int_team_week_totals') }}) THEN week END) as max_week
        FROM {{ ref('int_team_week_totals') }}
      ) latest
    )
),

-- Create synthetic team volume for upcoming weeks based on recent performance
synthetic_team_totals AS (
  SELECT 
    uw.season,
    uw.week,
    t.team,
    t.targets,
    t.routes,
    t.rush_att,
    t.pass_att,
    CURRENT_TIMESTAMP AS created_at
  FROM upcoming_weeks uw
  CROSS JOIN (
    -- Get most recent team totals for each team
    SELECT DISTINCT ON (team) 
      team,
      team_targets AS targets,
      team_targets AS routes,  
      team_rush_att AS rush_att,
      team_pass_att AS pass_att
    FROM {{ ref('int_team_week_totals') }}
    WHERE season = (SELECT MAX(season) FROM {{ ref('int_team_week_totals') }})
      AND week >= (SELECT MAX(week) - 2 FROM {{ ref('int_team_week_totals') }} WHERE season = (SELECT MAX(season) FROM {{ ref('int_team_week_totals') }}))
    ORDER BY team, season DESC, week DESC
  ) t
),

-- Combine historical and synthetic team totals
combined_team_totals AS (
  SELECT 
    season, week, team, 
    team_targets AS targets,
    team_targets AS routes,
    team_rush_att AS rush_att,
    team_pass_att AS pass_att,
    created_at
  FROM {{ ref('int_team_week_totals') }}
  {% if is_incremental() %}
    WHERE created_at > (SELECT MAX(created_at) FROM {{ this }})
  {% endif %}
  
  UNION ALL
  
  SELECT 
    season, week, team, targets, routes, rush_att, pass_att, created_at
  FROM synthetic_team_totals
),

team_weekly_totals AS (
  SELECT * FROM combined_team_totals
),

rolling_averages AS (
  SELECT
    season,
    week,
    team,
    -- TEMPORAL FIX: Enhanced weighted averages using ONLY historical data
    -- Use LAG to get prior weeks (no current week data in projections)
    (
      (LAG(targets, 1) OVER (PARTITION BY season, team ORDER BY week) * 3) +
      (LAG(targets, 2) OVER (PARTITION BY season, team ORDER BY week) * 2) +
      (LAG(targets, 3) OVER (PARTITION BY season, team ORDER BY week) * 1.5) +
      (LAG(targets, 4) OVER (PARTITION BY season, team ORDER BY week) * 1)
    ) / 7.5 AS team_targets_pred_weighted,
    
    (
      (LAG(routes, 1) OVER (PARTITION BY season, team ORDER BY week) * 3) +
      (LAG(routes, 2) OVER (PARTITION BY season, team ORDER BY week) * 2) +
      (LAG(routes, 3) OVER (PARTITION BY season, team ORDER BY week) * 1.5) +
      (LAG(routes, 4) OVER (PARTITION BY season, team ORDER BY week) * 1)
    ) / 7.5 AS team_routes_pred_weighted,
    
    (
      (LAG(rush_att, 1) OVER (PARTITION BY season, team ORDER BY week) * 3) +
      (LAG(rush_att, 2) OVER (PARTITION BY season, team ORDER BY week) * 2) +
      (LAG(rush_att, 3) OVER (PARTITION BY season, team ORDER BY week) * 1.5) +
      (LAG(rush_att, 4) OVER (PARTITION BY season, team ORDER BY week) * 1)
    ) / 7.5 AS team_rush_att_pred_weighted,
    
    (
      (LAG(pass_att, 1) OVER (PARTITION BY season, team ORDER BY week) * 3) +
      (LAG(pass_att, 2) OVER (PARTITION BY season, team ORDER BY week) * 2) +
      (LAG(pass_att, 3) OVER (PARTITION BY season, team ORDER BY week) * 1.5) +
      (LAG(pass_att, 4) OVER (PARTITION BY season, team ORDER BY week) * 1)
    ) / 7.5 AS team_pass_att_pred_weighted,
    
    -- Standard 4-week rolling averages as fallback
    AVG(targets) OVER (
      PARTITION BY season, team 
      ORDER BY week 
      ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) AS team_targets_pred,
    
    AVG(routes) OVER (
      PARTITION BY season, team 
      ORDER BY week 
      ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) AS team_routes_pred,
    
    AVG(rush_att) OVER (
      PARTITION BY season, team 
      ORDER BY week 
      ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) AS team_rush_att_pred,
    
    AVG(pass_att) OVER (
      PARTITION BY season, team 
      ORDER BY week 
      ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) AS team_pass_att_pred,
    
    -- Season-to-date averages as fallback
    AVG(targets) OVER (
      PARTITION BY season, team 
      ORDER BY week 
      ROWS UNBOUNDED PRECEDING
    ) AS team_targets_ytd_avg,
    
    AVG(routes) OVER (
      PARTITION BY season, team 
      ORDER BY week 
      ROWS UNBOUNDED PRECEDING
    ) AS team_routes_ytd_avg,
    
    AVG(rush_att) OVER (
      PARTITION BY season, team 
      ORDER BY week 
      ROWS UNBOUNDED PRECEDING
    ) AS team_rush_att_ytd_avg,
    
    AVG(pass_att) OVER (
      PARTITION BY season, team 
      ORDER BY week 
      ROWS UNBOUNDED PRECEDING
    ) AS team_pass_att_ytd_avg,
    
    CURRENT_TIMESTAMP AS created_at
    
  FROM team_weekly_totals
)

SELECT
  season,
  week,
  team,
  -- Use weighted predictions first, then rolling average, fallback to season average
  COALESCE(team_targets_pred_weighted, team_targets_pred, team_targets_ytd_avg, 0) AS team_targets_pred,
  COALESCE(team_routes_pred_weighted, team_routes_pred, team_routes_ytd_avg, 0) AS team_routes_pred,
  COALESCE(team_rush_att_pred_weighted, team_rush_att_pred, team_rush_att_ytd_avg, 0) AS team_rush_att_pred,
  COALESCE(team_pass_att_pred_weighted, team_pass_att_pred, team_pass_att_ytd_avg, 0) AS team_pass_att_pred,
  created_at
FROM rolling_averages