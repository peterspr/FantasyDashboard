{{
  config(
    materialized='incremental',
    unique_key=['season', 'week', 'player_id', 'team'],
    on_schema_change='sync_all_columns'
  )
}}

WITH base_player_week AS (
  SELECT 
    s.season,
    s.week,
    s.player_id,
    s.team,
    COALESCE(r.position, s.position) AS position,
    
    -- Raw volume stats
    COALESCE(p.routes_run, 0) AS routes_run,
    COALESCE(p.offense_snaps, 0) AS offense_snaps,
    COALESCE(p.offense_snap_pct, 0) AS offense_snap_pct,
    COALESCE(s.targets, 0) AS targets,
    COALESCE(s.carries, 0) AS rush_att,
    COALESCE(s.receptions, 0) AS receptions,
    COALESCE(s.receiving_yards, 0) AS rec_yds,
    COALESCE(s.rushing_yards, 0) AS rush_yds,
    COALESCE(s.attempts, 0) AS pass_att,
    
    s._ingested_at
    
  FROM {{ ref('stg_weekly_player_stats') }} s
  LEFT JOIN {{ ref('stg_participation') }} p 
    ON s.season = p.season 
    AND s.week = p.week 
    AND s.player_id = p.player_id 
    AND s.team = p.team
  LEFT JOIN {{ ref('stg_rosters') }} r 
    ON s.season = r.season 
    AND s.player_id = r.player_id 
    AND s.team = r.team
  WHERE 1=1
    {% if is_incremental() %}
      AND s._ingested_at > (SELECT MAX(_ingested_at) FROM {{ this }})
    {% endif %}
),

with_team_totals AS (
  SELECT 
    bpw.*,
    tt.team_targets,
    tt.team_rush_att,
    
    -- Calculate team routes as sum of player routes for that week
    SUM(bpw.routes_run) OVER (PARTITION BY bpw.season, bpw.week, bpw.team) AS team_routes,
    
    -- Derived usage shares (null-safe)
    CASE 
      WHEN tt.team_targets > 0 THEN bpw.targets::numeric / tt.team_targets::numeric
      ELSE NULL
    END AS target_share,
    
    CASE 
      WHEN tt.team_rush_att > 0 THEN bpw.rush_att::numeric / tt.team_rush_att::numeric  
      ELSE NULL
    END AS rush_share,
    
    CURRENT_TIMESTAMP AS created_at
    
  FROM base_player_week bpw
  LEFT JOIN {{ ref('int_team_week_totals') }} tt 
    ON bpw.season = tt.season 
    AND bpw.week = tt.week 
    AND bpw.team = tt.team
)

SELECT
  season,
  week,
  player_id,
  team,
  position,
  
  -- Raw counts
  routes_run,
  offense_snaps,
  targets,
  rush_att,
  receptions,
  rec_yds,
  rush_yds,
  pass_att,
  
  -- Usage shares
  target_share,
  rush_share,
  
  -- Route percentage (routes / team_routes)
  CASE 
    WHEN team_routes > 0 THEN routes_run::numeric / team_routes::numeric
    ELSE NULL
  END AS route_pct,
  
  -- Snap percentage
  offense_snap_pct AS snap_pct,
  
  _ingested_at,
  created_at
  
FROM with_team_totals