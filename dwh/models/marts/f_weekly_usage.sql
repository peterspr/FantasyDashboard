{{
  config(
    materialized='incremental',
    unique_key=['season', 'week', 'player_id'],
    on_schema_change='sync_all_columns',
    post_hook=[
      "CREATE INDEX IF NOT EXISTS idx_f_weekly_usage_pos_sw ON {{ this }} (position, season, week)",
      "CREATE INDEX IF NOT EXISTS idx_f_weekly_usage_player ON {{ this }} (player_id)",
      "CREATE INDEX IF NOT EXISTS idx_f_weekly_usage_team_sw ON {{ this }} (team, season, week)"
    ]
  )
}}

WITH base_usage AS (
  SELECT
    season,
    week,
    player_id,
    team,
    position,
    
    -- Raw volume
    routes_run,
    targets,
    rush_att,
    receptions,
    
    -- Usage metrics
    snap_pct,
    route_pct,
    target_share,
    rush_share,
    
    _ingested_at,
    CURRENT_TIMESTAMP AS built_at
    
  FROM {{ ref('int_player_week_usage') }}
  WHERE 1=1
    {% if is_incremental() %}
      AND created_at > (SELECT MAX(built_at) FROM {{ this }})
    {% endif %}
),

with_rolling_averages AS (
  SELECT
    bu.*,
    
    -- 4-week rolling averages for key usage metrics
    {{ rolling_avg('target_share', 'season, week', 'player_id, team', 4) }} AS target_share_4w,
    {{ rolling_avg('rush_share', 'season, week', 'player_id, team', 4) }} AS rush_share_4w,
    {{ rolling_avg('route_pct', 'season, week', 'player_id, team', 4) }} AS route_pct_4w,
    {{ rolling_avg('snap_pct', 'season, week', 'player_id, team', 4) }} AS snap_pct_4w
    
  FROM base_usage bu
)

SELECT
  season,
  week,
  player_id,
  team,
  position,
  
  -- Raw usage metrics
  snap_pct,
  route_pct,
  target_share,
  rush_share,
  
  -- Raw volume
  routes_run,
  targets,
  rush_att,
  receptions,
  
  -- Recent form (smoothed)
  target_share_4w,
  rush_share_4w,
  route_pct_4w,
  snap_pct_4w,
  
  CURRENT_TIMESTAMP AS built_at

FROM with_rolling_averages