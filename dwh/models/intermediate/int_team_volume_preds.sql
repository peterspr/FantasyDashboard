{{
  config(
    materialized='incremental',
    unique_key=['season', 'week', 'team'],
    on_schema_change='sync_all_columns'
  )
}}

WITH team_weekly_totals AS (
  SELECT
    season,
    week,
    team,
    SUM(targets) AS targets,
    SUM(routes_run) AS routes,
    SUM(carries) AS rush_att,
    SUM(attempts) AS pass_att
  FROM {{ ref('stg_weekly_player_stats') }}
  WHERE 1=1
    {% if is_incremental() %}
      AND created_at > (SELECT MAX(created_at) FROM {{ this }})
    {% endif %}
  GROUP BY season, week, team
),

rolling_averages AS (
  SELECT
    season,
    week,
    team,
    -- 4-week rolling averages for team volume prediction
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
  -- Use rolling average, fallback to season average
  COALESCE(team_targets_pred, team_targets_ytd_avg, 0) AS team_targets_pred,
  COALESCE(team_routes_pred, team_routes_ytd_avg, 0) AS team_routes_pred,
  COALESCE(team_rush_att_pred, team_rush_att_ytd_avg, 0) AS team_rush_att_pred,
  COALESCE(team_pass_att_pred, team_pass_att_ytd_avg, 0) AS team_pass_att_pred,
  created_at
FROM rolling_averages