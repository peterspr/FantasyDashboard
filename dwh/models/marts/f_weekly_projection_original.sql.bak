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

WITH usage_with_opponent AS (
  SELECT 
    u.*,
    s.away_team,
    s.home_team,
    CASE 
      WHEN u.team = s.home_team THEN s.away_team
      WHEN u.team = s.away_team THEN s.home_team
    END AS opponent
  FROM {{ ref('f_weekly_usage') }} u
  LEFT JOIN {{ ref('stg_schedules') }} s 
    ON u.season = s.season 
    AND u.week = s.week
    AND (u.team = s.home_team OR u.team = s.away_team)
  WHERE 1=1
    {% if is_incremental() %}
      AND u.built_at > (SELECT MAX(built_at) FROM {{ this }})
    {% endif %}
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

player_ytd_stats AS (
  SELECT 
    season,
    player_id,
    SUM(receptions) AS receptions_ytd,
    SUM(targets) AS targets_ytd,
    SUM(receiving_yards) AS rec_yds_ytd,
    SUM(receiving_tds) AS rec_tds_ytd,
    SUM(carries) AS carries_ytd,
    SUM(rushing_yards) AS rush_yds_ytd,
    SUM(rushing_tds) AS rush_tds_ytd,
    SUM(attempts) AS pass_att_ytd,
    SUM(passing_yards) AS pass_yds_ytd,
    SUM(passing_tds) AS pass_tds_ytd,
    SUM(interceptions) AS int_ytd
  FROM {{ ref('stg_weekly_player_stats') }}
  GROUP BY season, player_id
),

volume_predictions AS (
  SELECT 
    bd.*,
    -- Volume predictions based on shares and team volume
    bd.target_share_4w * bd.team_targets_pred AS targets_pred,
    bd.route_pct_4w * bd.team_routes_pred AS routes_pred,
    bd.rush_share_4w * bd.team_rush_att_pred AS rush_att_pred,
    CASE 
      WHEN bd.position = 'QB' THEN 
        COALESCE(bd.team_pass_att_pred, 0)  -- QBs get team pass attempts
      ELSE 0  -- Non-QBs get no pass attempts for projections
    END AS pass_att_pred,
    
    -- YTD rates for shrinkage
    COALESCE(ps.receptions_ytd::numeric / NULLIF(ps.targets_ytd, 0), 0) AS catch_rate_ytd,
    COALESCE(ps.rec_yds_ytd::numeric / NULLIF(ps.receptions_ytd, 0), 0) AS rec_yds_per_rec_ytd,
    COALESCE(ps.rec_tds_ytd::numeric / NULLIF(ps.targets_ytd, 0), 0) AS rec_td_rate_ytd,
    COALESCE(ps.rush_yds_ytd::numeric / NULLIF(ps.carries_ytd, 0), 0) AS rush_yds_per_att_ytd,
    COALESCE(ps.rush_tds_ytd::numeric / NULLIF(ps.carries_ytd, 0), 0) AS rush_td_rate_ytd,
    COALESCE(ps.pass_yds_ytd::numeric / NULLIF(ps.pass_att_ytd, 0), 0) AS pass_yds_per_att_ytd,
    COALESCE(ps.pass_tds_ytd::numeric / NULLIF(ps.pass_att_ytd, 0), 0) AS pass_td_rate_ytd,
    COALESCE(ps.int_ytd::numeric / NULLIF(ps.pass_att_ytd, 0), 0) AS int_rate_ytd,
    
    ps.targets_ytd,
    ps.receptions_ytd,
    ps.carries_ytd,
    ps.pass_att_ytd
    
  FROM base_data bd
  LEFT JOIN player_ytd_stats ps ON bd.season = ps.season AND bd.player_id = ps.player_id
),

efficiency_with_priors AS (
  SELECT 
    vp.*,
    -- Shrink rates to priors
    {{ shrink_rate('vp.catch_rate_ytd', 'vp.targets_ytd', 'ep_catch.mean', 'ep_catch.k') }} AS catch_rate_shrunk,
    {{ shrink_rate('vp.rec_yds_per_rec_ytd', 'vp.receptions_ytd', 'ep_rec_yds.mean', 'ep_rec_yds.k') }} AS rec_yds_per_rec_shrunk,
    {{ shrink_rate('vp.rec_td_rate_ytd', 'vp.targets_ytd', 'ep_rec_td.mean', 'ep_rec_td.k') }} AS rec_td_rate_shrunk,
    {{ shrink_rate('vp.rush_yds_per_att_ytd', 'vp.carries_ytd', 'ep_rush_yds.mean', 'ep_rush_yds.k') }} AS rush_yds_per_att_shrunk,
    {{ shrink_rate('vp.rush_td_rate_ytd', 'vp.carries_ytd', 'ep_rush_td.mean', 'ep_rush_td.k') }} AS rush_td_rate_shrunk,
    {{ shrink_rate('vp.pass_yds_per_att_ytd', 'vp.pass_att_ytd', 'ep_pass_yds.mean', 'ep_pass_yds.k') }} AS pass_yds_per_att_shrunk,
    {{ shrink_rate('vp.pass_td_rate_ytd', 'vp.pass_att_ytd', 'ep_pass_td.mean', 'ep_pass_td.k') }} AS pass_td_rate_shrunk,
    {{ shrink_rate('vp.int_rate_ytd', 'vp.pass_att_ytd', 'ep_int.mean', 'ep_int.k') }} AS int_rate_shrunk,
    
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
    -- Apply opponent adjustment (capped at 0.7-1.3)
    ep.catch_rate_shrunk * GREATEST(0.7, LEAST(1.3, COALESCE(ep.schedule_adj_index, 1.0))) AS catch_rate_final,
    ep.rec_yds_per_rec_shrunk * GREATEST(0.7, LEAST(1.3, COALESCE(ep.schedule_adj_index, 1.0))) AS rec_yds_per_rec_final,
    ep.rec_td_rate_shrunk * GREATEST(0.7, LEAST(1.3, COALESCE(ep.schedule_adj_index, 1.0))) AS rec_td_rate_final,
    ep.rush_yds_per_att_shrunk * GREATEST(0.7, LEAST(1.3, COALESCE(ep.schedule_adj_index, 1.0))) AS rush_yds_per_att_final,
    ep.rush_td_rate_shrunk * GREATEST(0.7, LEAST(1.3, COALESCE(ep.schedule_adj_index, 1.0))) AS rush_td_rate_final,
    ep.pass_yds_per_att_shrunk * GREATEST(0.7, LEAST(1.3, COALESCE(ep.schedule_adj_index, 1.0))) AS pass_yds_per_att_final,
    ep.pass_td_rate_shrunk * GREATEST(0.7, LEAST(1.3, COALESCE(ep.schedule_adj_index, 1.0))) AS pass_td_rate_final,
    ep.int_rate_shrunk * GREATEST(0.7, LEAST(1.3, COALESCE(ep.schedule_adj_index, 1.0))) AS int_rate_final
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
    
    -- Components JSON for explainability
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