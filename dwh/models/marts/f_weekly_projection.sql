{{
  config(
    materialized='incremental',
    unique_key=['season', 'week', 'player_id', 'scoring'],
    on_schema_change='sync_all_columns',
    post_hook=[
      "CREATE INDEX IF NOT EXISTS idx_weekly_proj_sw_pos ON {{ this }} (season, week, scoring, position)",
      "CREATE INDEX IF NOT EXISTS idx_weekly_proj_player ON {{ this }} (player_id)"
    ]
  )
}}

WITH
-- Get upcoming weeks that need projections but don't have usage data yet
upcoming_weeks AS (
  SELECT DISTINCT 
    cw.season,
    cw.week
  FROM {{ ref('f_calendar_weeks') }} cw
  WHERE cw.week_status IN ('current', 'future')
    AND NOT EXISTS (
      SELECT 1 FROM {{ ref('f_weekly_usage') }} u
      WHERE u.season = cw.season AND u.week = cw.week
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
          MAX(CASE WHEN season = (SELECT MAX(season) FROM {{ ref('f_weekly_usage') }}) THEN week END) as max_week
        FROM {{ ref('f_weekly_usage') }}
      ) latest
    )
),

-- Create synthetic usage data for upcoming weeks based on most recent player performance
synthetic_usage AS (
  SELECT 
    uw.season,
    uw.week,
    u.player_id,
    u.team,
    u.position,
    u.snap_pct,
    u.route_pct,
    u.target_share,
    u.rush_share,
    u.routes_run,
    u.targets,
    u.rush_att,
    u.receptions,
    u.target_share_4w,
    u.rush_share_4w,
    u.route_pct_4w,
    u.snap_pct_4w,
    CURRENT_TIMESTAMP AS built_at
  FROM upcoming_weeks uw
  CROSS JOIN (
    -- Get most recent usage data for each active player
    SELECT DISTINCT ON (player_id) 
      player_id,
      team,
      position,
      snap_pct,
      route_pct,  
      target_share,
      rush_share,
      routes_run,
      targets,
      rush_att,
      receptions,
      target_share_4w,
      rush_share_4w,
      route_pct_4w,
      snap_pct_4w
    FROM {{ ref('f_weekly_usage') }}
    WHERE season = (SELECT MAX(season) FROM {{ ref('f_weekly_usage') }})
      AND week >= (SELECT MAX(week) - 2 FROM {{ ref('f_weekly_usage') }} WHERE season = (SELECT MAX(season) FROM {{ ref('f_weekly_usage') }}))
      -- Only include players who were active recently
      AND (snap_pct > 0.1 OR targets > 0 OR rush_att > 0)
    ORDER BY player_id, season DESC, week DESC
  ) u
),

-- Combine historical and synthetic usage data
combined_usage AS (
  SELECT * FROM {{ ref('f_weekly_usage') }}
  {% if is_incremental() %}
    WHERE built_at > (SELECT MAX(built_at) FROM {{ this }})
  {% endif %}
  
  UNION ALL
  
  SELECT 
    season, week, player_id, team, position,
    snap_pct, route_pct, target_share, rush_share,
    routes_run, targets, rush_att, receptions,
    target_share_4w, rush_share_4w, route_pct_4w, snap_pct_4w,
    built_at
  FROM synthetic_usage
),

usage_with_opponent AS (
  SELECT 
    u.*,
    s.away_team,
    s.home_team,
    CASE 
      WHEN u.team = s.home_team THEN s.away_team
      WHEN u.team = s.away_team THEN s.home_team
    END AS opponent
  FROM combined_usage u
  LEFT JOIN {{ ref('stg_schedules') }} s 
    ON u.season = s.season 
    AND u.week = s.week
    AND (u.team = s.home_team OR u.team = s.away_team)
),

base_data AS (
  SELECT 
    u.*,
    tv.team_targets_pred,
    tv.team_routes_pred,
    tv.team_rush_att_pred,
    tv.team_pass_att_pred,
    dvp.schedule_adj_index
  FROM usage_with_opponent u
  LEFT JOIN {{ ref('int_team_volume_preds') }} tv
    ON u.season = tv.season
    AND u.week = tv.week
    AND u.team = tv.team
  LEFT JOIN {{ ref('f_defense_vs_pos') }} dvp
    ON u.season = dvp.season
    AND u.week = dvp.week
    AND u.position = dvp.position
    AND u.opponent = dvp.team
),

-- Historical player performance for early season baseline
prior_year_stats AS (
  SELECT 
    player_id,
    season + 1 as projection_season,  -- Map to the season we're projecting
    
    -- Calculate per-game rates from prior season
    AVG(COALESCE(receptions::numeric / NULLIF(targets, 0), 0)) as prior_catch_rate,
    AVG(COALESCE(receiving_yards::numeric / NULLIF(receptions, 0), 0)) as prior_rec_yds_per_rec,
    AVG(COALESCE(receiving_tds::numeric / NULLIF(targets, 0), 0)) as prior_rec_td_rate,
    AVG(COALESCE(rushing_yards::numeric / NULLIF(carries, 0), 0)) as prior_rush_yds_per_att,
    AVG(COALESCE(rushing_tds::numeric / NULLIF(carries, 0), 0)) as prior_rush_td_rate,
    AVG(COALESCE(passing_yards::numeric / NULLIF(attempts, 0), 0)) as prior_pass_yds_per_att,
    AVG(COALESCE(passing_tds::numeric / NULLIF(attempts, 0), 0)) as prior_pass_td_rate,
    AVG(COALESCE(interceptions::numeric / NULLIF(attempts, 0), 0)) as prior_int_rate,
    
    -- Count games for sample size assessment
    COUNT(*) as prior_games_played,
    SUM(targets) as prior_total_targets,
    SUM(carries) as prior_total_carries,
    SUM(attempts) as prior_total_attempts
    
  FROM {{ ref('stg_weekly_player_stats') }}
  WHERE season >= 2023  -- Use recent historical data
  GROUP BY player_id, season
),

player_ytd_stats AS (
  SELECT 
    stats.season,
    stats.player_id,
    current_weeks.week,
    
    -- Current season YTD totals (temporal constraint: only up to current week)
    SUM(stats.receptions) AS receptions_ytd,
    SUM(stats.targets) AS targets_ytd,
    SUM(stats.receiving_yards) AS rec_yds_ytd,
    SUM(stats.receiving_tds) AS rec_tds_ytd,
    SUM(stats.carries) AS carries_ytd,
    SUM(stats.rushing_yards) AS rush_yds_ytd,
    SUM(stats.rushing_tds) AS rush_tds_ytd,
    SUM(stats.attempts) AS pass_att_ytd,
    SUM(stats.passing_yards) AS pass_yds_ytd,
    SUM(stats.passing_tds) AS pass_tds_ytd,
    SUM(stats.interceptions) AS int_ytd,
    
    -- Enhanced efficiency rates using both current YTD and prior year data
    -- For early weeks with limited data, blend with historical rates
    CASE 
      WHEN current_weeks.week <= 4 AND SUM(stats.targets) < 10 AND pys.prior_catch_rate IS NOT NULL THEN
        -- Early season with limited data: blend 70% prior year, 30% current
        COALESCE(
          0.7 * pys.prior_catch_rate + 0.3 * (SUM(stats.receptions)::numeric / NULLIF(SUM(stats.targets), 0)),
          pys.prior_catch_rate
        )
      ELSE 
        -- Sufficient current data: use current season rate
        COALESCE(SUM(stats.receptions)::numeric / NULLIF(SUM(stats.targets), 0), 0)
    END AS blended_catch_rate,
    
    CASE 
      WHEN current_weeks.week <= 4 AND SUM(stats.receptions) < 8 AND pys.prior_rec_yds_per_rec IS NOT NULL THEN
        COALESCE(
          0.7 * pys.prior_rec_yds_per_rec + 0.3 * (SUM(stats.receiving_yards)::numeric / NULLIF(SUM(stats.receptions), 0)),
          pys.prior_rec_yds_per_rec
        )
      ELSE
        COALESCE(SUM(stats.receiving_yards)::numeric / NULLIF(SUM(stats.receptions), 0), 0)
    END AS blended_rec_yds_per_rec,
    
    CASE 
      WHEN current_weeks.week <= 4 AND SUM(stats.carries) < 12 AND pys.prior_rush_yds_per_att IS NOT NULL THEN
        COALESCE(
          0.7 * pys.prior_rush_yds_per_att + 0.3 * (SUM(stats.rushing_yards)::numeric / NULLIF(SUM(stats.carries), 0)),
          pys.prior_rush_yds_per_att
        )
      ELSE
        COALESCE(SUM(stats.rushing_yards)::numeric / NULLIF(SUM(stats.carries), 0), 0)
    END AS blended_rush_yds_per_att,
    
    CASE 
      WHEN current_weeks.week <= 4 AND SUM(stats.attempts) < 50 AND pys.prior_pass_yds_per_att IS NOT NULL THEN
        COALESCE(
          0.7 * pys.prior_pass_yds_per_att + 0.3 * (SUM(stats.passing_yards)::numeric / NULLIF(SUM(stats.attempts), 0)),
          pys.prior_pass_yds_per_att
        )
      ELSE
        COALESCE(SUM(stats.passing_yards)::numeric / NULLIF(SUM(stats.attempts), 0), 0)
    END AS blended_pass_yds_per_att,
    
    -- Add TD rate blending
    CASE 
      WHEN current_weeks.week <= 4 AND SUM(stats.targets) < 10 AND pys.prior_rec_td_rate IS NOT NULL THEN
        COALESCE(
          0.7 * pys.prior_rec_td_rate + 0.3 * (SUM(stats.receiving_tds)::numeric / NULLIF(SUM(stats.targets), 0)),
          pys.prior_rec_td_rate
        )
      ELSE
        COALESCE(SUM(stats.receiving_tds)::numeric / NULLIF(SUM(stats.targets), 0), 0)
    END AS blended_rec_td_rate,
    
    CASE 
      WHEN current_weeks.week <= 4 AND SUM(stats.carries) < 12 AND pys.prior_rush_td_rate IS NOT NULL THEN
        COALESCE(
          0.7 * pys.prior_rush_td_rate + 0.3 * (SUM(stats.rushing_tds)::numeric / NULLIF(SUM(stats.carries), 0)),
          pys.prior_rush_td_rate
        )
      ELSE
        COALESCE(SUM(stats.rushing_tds)::numeric / NULLIF(SUM(stats.carries), 0), 0)
    END AS blended_rush_td_rate,
    
    CASE 
      WHEN current_weeks.week <= 4 AND SUM(stats.attempts) < 50 AND pys.prior_pass_td_rate IS NOT NULL THEN
        COALESCE(
          0.7 * pys.prior_pass_td_rate + 0.3 * (SUM(stats.passing_tds)::numeric / NULLIF(SUM(stats.attempts), 0)),
          pys.prior_pass_td_rate
        )
      ELSE
        COALESCE(SUM(stats.passing_tds)::numeric / NULLIF(SUM(stats.attempts), 0), 0)
    END AS blended_pass_td_rate,
    
    CASE 
      WHEN current_weeks.week <= 4 AND SUM(stats.attempts) < 50 AND pys.prior_int_rate IS NOT NULL THEN
        COALESCE(
          0.7 * pys.prior_int_rate + 0.3 * (SUM(stats.interceptions)::numeric / NULLIF(SUM(stats.attempts), 0)),
          pys.prior_int_rate
        )
      ELSE
        COALESCE(SUM(stats.interceptions)::numeric / NULLIF(SUM(stats.attempts), 0), 0)
    END AS blended_int_rate
    
  FROM {{ ref('stg_weekly_player_stats') }} stats
  -- Cross join with all projection weeks to calculate week-specific YTD stats
  CROSS JOIN (
    SELECT DISTINCT season, week 
    FROM usage_with_opponent
  ) current_weeks
  LEFT JOIN prior_year_stats pys 
    ON stats.player_id = pys.player_id 
    AND current_weeks.season = pys.projection_season
  WHERE stats.season = current_weeks.season 
    AND stats.week < current_weeks.week  -- CRITICAL: Only use data PRIOR to projection week (exclude current week)
  GROUP BY stats.season, stats.player_id, current_weeks.week, 
           pys.prior_catch_rate, pys.prior_rec_yds_per_rec, pys.prior_rec_td_rate,
           pys.prior_rush_yds_per_att, pys.prior_rush_td_rate,
           pys.prior_pass_yds_per_att, pys.prior_pass_td_rate, pys.prior_int_rate
),

volume_predictions AS (
  SELECT 
    bd.*,
    -- Volume predictions based on shares and team volume
    bd.target_share_4w * bd.team_targets_pred AS targets_pred,
    bd.route_pct_4w * bd.team_routes_pred AS routes_pred,
    
    -- ENHANCED: QB rushing fix - QBs now get rushing attempts
    CASE 
      WHEN bd.position = 'QB' THEN 
        COALESCE(bd.rush_share_4w * bd.team_rush_att_pred, 0)
      ELSE bd.rush_share_4w * bd.team_rush_att_pred
    END AS rush_att_pred,
    
    CASE 
      WHEN bd.position = 'QB' THEN 
        COALESCE(bd.team_pass_att_pred, 0)  -- QBs get team pass attempts
      ELSE 0  -- Non-QBs get no pass attempts for projections
    END AS pass_att_pred,
    
    -- Enhanced rates with historical blending for early season
    ps.blended_catch_rate AS catch_rate_ytd,
    ps.blended_rec_yds_per_rec AS rec_yds_per_rec_ytd,
    ps.blended_rec_td_rate AS rec_td_rate_ytd,
    ps.blended_rush_yds_per_att AS rush_yds_per_att_ytd,
    ps.blended_rush_td_rate AS rush_td_rate_ytd,
    ps.blended_pass_yds_per_att AS pass_yds_per_att_ytd,
    ps.blended_pass_td_rate AS pass_td_rate_ytd,
    ps.blended_int_rate AS int_rate_ytd,
    
    ps.targets_ytd,
    ps.receptions_ytd,
    ps.carries_ytd,
    ps.pass_att_ytd
    
  FROM base_data bd
  LEFT JOIN player_ytd_stats ps ON bd.season = ps.season AND bd.week = ps.week AND bd.player_id = ps.player_id
),

efficiency_with_priors AS (
  SELECT 
    vp.*,
    -- ENHANCED: Reduced shrinkage for elite QBs (k=60 instead of 200)
    CASE 
      WHEN vp.position = 'QB' AND vp.pass_att_ytd > 200 THEN ep_catch.k * 0.3
      ELSE ep_catch.k * 0.8
    END AS k_catch_adjusted,
    
    CASE 
      WHEN vp.position = 'QB' AND vp.pass_att_ytd > 200 THEN ep_pass_yds.k * 0.3
      ELSE ep_pass_yds.k * 0.8  
    END AS k_pass_yds_adjusted,
    
    CASE 
      WHEN vp.position = 'QB' AND vp.carries_ytd > 30 THEN ep_rush_yds.k * 0.3
      ELSE ep_rush_yds.k * 0.8
    END AS k_rush_yds_adjusted,
    
    -- Shrink rates to priors with adjusted k values
    CASE
      WHEN vp.targets_ytd IS NULL OR vp.targets_ytd = 0 THEN ep_catch.mean
      ELSE ((vp.catch_rate_ytd * vp.targets_ytd) + (ep_catch.mean * 
           CASE WHEN vp.position = 'QB' AND vp.pass_att_ytd > 200 THEN ep_catch.k * 0.3 ELSE ep_catch.k * 0.8 END))
           / (vp.targets_ytd + CASE WHEN vp.position = 'QB' AND vp.pass_att_ytd > 200 THEN ep_catch.k * 0.3 ELSE ep_catch.k * 0.8 END)
    END AS catch_rate_shrunk,
    
    CASE
      WHEN vp.receptions_ytd IS NULL OR vp.receptions_ytd = 0 THEN ep_rec_yds.mean
      ELSE ((vp.rec_yds_per_rec_ytd * vp.receptions_ytd) + (ep_rec_yds.mean * ep_rec_yds.k * 0.8))
           / (vp.receptions_ytd + ep_rec_yds.k * 0.8)
    END AS rec_yds_per_rec_shrunk,
    
    CASE
      WHEN vp.targets_ytd IS NULL OR vp.targets_ytd = 0 THEN ep_rec_td.mean
      ELSE ((vp.rec_td_rate_ytd * vp.targets_ytd) + (ep_rec_td.mean * ep_rec_td.k * 0.8))
           / (vp.targets_ytd + ep_rec_td.k * 0.8)
    END AS rec_td_rate_shrunk,
    
    CASE
      WHEN vp.carries_ytd IS NULL OR vp.carries_ytd = 0 THEN ep_rush_yds.mean
      ELSE ((vp.rush_yds_per_att_ytd * vp.carries_ytd) + (ep_rush_yds.mean * 
           CASE WHEN vp.position = 'QB' AND vp.carries_ytd > 30 THEN ep_rush_yds.k * 0.3 ELSE ep_rush_yds.k * 0.8 END))
           / (vp.carries_ytd + CASE WHEN vp.position = 'QB' AND vp.carries_ytd > 30 THEN ep_rush_yds.k * 0.3 ELSE ep_rush_yds.k * 0.8 END)
    END AS rush_yds_per_att_shrunk,
    
    CASE
      WHEN vp.carries_ytd IS NULL OR vp.carries_ytd = 0 THEN ep_rush_td.mean
      ELSE ((vp.rush_td_rate_ytd * vp.carries_ytd) + (ep_rush_td.mean * 
           CASE WHEN vp.position = 'QB' AND vp.carries_ytd > 30 THEN ep_rush_td.k * 0.3 ELSE ep_rush_td.k * 0.8 END))
           / (vp.carries_ytd + CASE WHEN vp.position = 'QB' AND vp.carries_ytd > 30 THEN ep_rush_td.k * 0.3 ELSE ep_rush_td.k * 0.8 END)
    END AS rush_td_rate_shrunk,
    
    CASE
      WHEN vp.pass_att_ytd IS NULL OR vp.pass_att_ytd = 0 THEN ep_pass_yds.mean
      ELSE ((vp.pass_yds_per_att_ytd * vp.pass_att_ytd) + (ep_pass_yds.mean * 
           CASE WHEN vp.position = 'QB' AND vp.pass_att_ytd > 200 THEN ep_pass_yds.k * 0.3 ELSE ep_pass_yds.k * 0.8 END))
           / (vp.pass_att_ytd + CASE WHEN vp.position = 'QB' AND vp.pass_att_ytd > 200 THEN ep_pass_yds.k * 0.3 ELSE ep_pass_yds.k * 0.8 END)
    END AS pass_yds_per_att_shrunk,
    
    CASE
      WHEN vp.pass_att_ytd IS NULL OR vp.pass_att_ytd = 0 THEN ep_pass_td.mean
      ELSE ((vp.pass_td_rate_ytd * vp.pass_att_ytd) + (ep_pass_td.mean * 
           CASE WHEN vp.position = 'QB' AND vp.pass_att_ytd > 200 THEN ep_pass_td.k * 0.3 ELSE ep_pass_td.k * 0.8 END))
           / (vp.pass_att_ytd + CASE WHEN vp.position = 'QB' AND vp.pass_att_ytd > 200 THEN ep_pass_td.k * 0.3 ELSE ep_pass_td.k * 0.8 END)
    END AS pass_td_rate_shrunk,
    
    CASE
      WHEN vp.pass_att_ytd IS NULL OR vp.pass_att_ytd = 0 THEN ep_int.mean
      ELSE ((vp.int_rate_ytd * vp.pass_att_ytd) + (ep_int.mean * 
           CASE WHEN vp.position = 'QB' AND vp.pass_att_ytd > 200 THEN ep_int.k * 0.3 ELSE ep_int.k * 0.8 END))
           / (vp.pass_att_ytd + CASE WHEN vp.position = 'QB' AND vp.pass_att_ytd > 200 THEN ep_int.k * 0.3 ELSE ep_int.k * 0.8 END)
    END AS int_rate_shrunk,
    
    -- Variance from priors for CI calculation
    ep_rec_yds.var AS rec_yds_var,
    ep_rush_yds.var AS rush_yds_var,
    ep_pass_yds.var AS pass_yds_var
    
  FROM volume_predictions vp
  -- Join efficiency priors by position
  LEFT JOIN {{ ref('efficiency_priors') }} ep_catch
    ON vp.position = ep_catch.position AND ep_catch.metric = 'catch_rate'
  LEFT JOIN {{ ref('efficiency_priors') }} ep_rec_yds
    ON vp.position = ep_rec_yds.position AND ep_rec_yds.metric = 'rec_yds_per_rec'
  LEFT JOIN {{ ref('efficiency_priors') }} ep_rec_td
    ON vp.position = ep_rec_td.position AND ep_rec_td.metric = 'rec_td_per_target'
  LEFT JOIN {{ ref('efficiency_priors') }} ep_rush_yds
    ON vp.position = ep_rush_yds.position AND ep_rush_yds.metric = 'rush_yds_per_att'
  LEFT JOIN {{ ref('efficiency_priors') }} ep_rush_td
    ON vp.position = ep_rush_td.position AND ep_rush_td.metric = 'rush_td_per_rush'
  LEFT JOIN {{ ref('efficiency_priors') }} ep_pass_yds
    ON vp.position = ep_pass_yds.position AND ep_pass_yds.metric = 'pass_yds_per_att'
  LEFT JOIN {{ ref('efficiency_priors') }} ep_pass_td
    ON vp.position = ep_pass_td.position AND ep_pass_td.metric = 'pass_td_per_att'
  LEFT JOIN {{ ref('efficiency_priors') }} ep_int
    ON vp.position = ep_int.position AND ep_int.metric = 'int_per_att'
),

opponent_adjusted AS (
  SELECT 
    ep.*,
    -- ENHANCED: Apply stabilized opponent adjustment (capped at ±20% instead of ±30%)
    ep.catch_rate_shrunk * GREATEST(0.8, LEAST(1.2, COALESCE(ep.schedule_adj_index, 1.0))) AS catch_rate_final,
    ep.rec_yds_per_rec_shrunk * GREATEST(0.8, LEAST(1.2, COALESCE(ep.schedule_adj_index, 1.0))) AS rec_yds_per_rec_final,
    ep.rec_td_rate_shrunk * GREATEST(0.8, LEAST(1.2, COALESCE(ep.schedule_adj_index, 1.0))) AS rec_td_rate_final,
    ep.rush_yds_per_att_shrunk * GREATEST(0.8, LEAST(1.2, COALESCE(ep.schedule_adj_index, 1.0))) AS rush_yds_per_att_final,
    ep.rush_td_rate_shrunk * GREATEST(0.8, LEAST(1.2, COALESCE(ep.schedule_adj_index, 1.0))) AS rush_td_rate_final,
    ep.pass_yds_per_att_shrunk * GREATEST(0.8, LEAST(1.2, COALESCE(ep.schedule_adj_index, 1.0))) AS pass_yds_per_att_final,
    ep.pass_td_rate_shrunk * GREATEST(0.8, LEAST(1.2, COALESCE(ep.schedule_adj_index, 1.0))) AS pass_td_rate_final,
    ep.int_rate_shrunk * GREATEST(0.8, LEAST(1.2, COALESCE(ep.schedule_adj_index, 1.0))) AS int_rate_final
  FROM efficiency_with_priors ep
),

component_predictions AS (
  SELECT 
    oa.*,
    -- Component predictions
    oa.targets_pred * oa.catch_rate_final AS rec_pred,
    oa.targets_pred * oa.catch_rate_final * oa.rec_yds_per_rec_final AS rec_yds_pred,
    oa.targets_pred * oa.rec_td_rate_final AS rec_td_pred,
    oa.rush_att_pred * oa.rush_yds_per_att_final AS rush_yds_pred,
    oa.rush_att_pred * oa.rush_td_rate_final AS rush_td_pred,
    oa.pass_att_pred * oa.pass_yds_per_att_final AS pass_yds_pred,
    oa.pass_att_pred * oa.pass_td_rate_final AS pass_td_pred,
    oa.pass_att_pred * oa.int_rate_final AS int_pred,
    
    -- Variance calculations for CI
    oa.targets_pred * oa.catch_rate_final * (1 - oa.catch_rate_final) AS var_rec,
    (oa.targets_pred * oa.catch_rate_final) * oa.rec_yds_var AS var_rec_yds,
    oa.rush_att_pred * oa.rush_yds_var AS var_rush_yds,
    oa.pass_att_pred * oa.pass_yds_var AS var_pass_yds,
    oa.targets_pred * oa.rec_td_rate_final * (1 - oa.rec_td_rate_final) AS var_rec_td,
    oa.rush_att_pred * oa.rush_td_rate_final * (1 - oa.rush_td_rate_final) AS var_rush_td,
    oa.pass_att_pred * oa.pass_td_rate_final * (1 - oa.pass_td_rate_final) AS var_pass_td,
    oa.pass_att_pred * oa.int_rate_final * (1 - oa.int_rate_final) AS var_int
    
  FROM opponent_adjusted oa
),

scoring_crossjoin AS (
  SELECT 
    cp.*,
    sw.scoring,
    sw.reception,
    sw.rec_yd,
    sw.rec_td,
    sw.rush_yd,
    sw.rush_td,
    sw.pass_yd,
    sw.pass_td,
    sw.int,
    sw.fumble
  FROM component_predictions cp
  CROSS JOIN {{ ref('scoring_weights') }} sw
),

final_projections AS (
  SELECT 
    season,
    week,
    player_id,
    team,
    position,
    scoring,
    
    -- Fantasy points projection
    {{ score_points('', 'rec_pred', 'rec_yds_pred', 'rec_td_pred', 'rush_yds_pred', 'rush_td_pred', 'pass_yds_pred', 'pass_td_pred', 'int_pred', '0') }} AS proj_pts,
    
    -- Points variance for CI
    (COALESCE(var_rec, 0) * reception * reception) +
    (COALESCE(var_rec_yds, 0) * rec_yd * rec_yd) +
    (COALESCE(var_rec_td, 0) * rec_td * rec_td) +
    (COALESCE(var_rush_yds, 0) * rush_yd * rush_yd) +
    (COALESCE(var_rush_td, 0) * rush_td * rush_td) +
    (COALESCE(var_pass_yds, 0) * pass_yd * pass_yd) +
    (COALESCE(var_pass_td, 0) * pass_td * pass_td) +
    (COALESCE(var_int, 0) * int * int) AS points_variance,
    
    -- Enhanced components JSON for explainability
    jsonb_build_object(
      'targets_pred', ROUND(targets_pred::numeric, 2),
      'rec_pred', ROUND(rec_pred::numeric, 2),
      'rec_yds_pred', ROUND(rec_yds_pred::numeric, 1),
      'rec_td_pred', ROUND(rec_td_pred::numeric, 3),
      'rush_att_pred', ROUND(rush_att_pred::numeric, 2),
      'rush_yds_pred', ROUND(rush_yds_pred::numeric, 1),
      'rush_td_pred', ROUND(rush_td_pred::numeric, 3),
      'pass_att_pred', ROUND(pass_att_pred::numeric, 2),
      'pass_yds_pred', ROUND(pass_yds_pred::numeric, 1),
      'pass_td_pred', ROUND(pass_td_pred::numeric, 3),
      'int_pred', ROUND(int_pred::numeric, 3),
      'target_share_4w', ROUND(target_share_4w::numeric, 3),
      'route_pct_4w', ROUND(route_pct_4w::numeric, 3),
      'rush_share_4w', ROUND(rush_share_4w::numeric, 3),
      'dvp_index', ROUND(COALESCE(schedule_adj_index, 1.0)::numeric, 3)
    ) AS components_json,
    
    CURRENT_TIMESTAMP AS built_at
    
  FROM scoring_crossjoin
)

SELECT 
  season,
  week,
  player_id,
  team,
  position,
  scoring,
  ROUND(proj_pts::numeric, 2) AS proj_pts,
  {{ normal_ci('proj_pts', 'points_variance', var('projections.z_score', 1.28155)) }},
  components_json,
  built_at
FROM final_projections