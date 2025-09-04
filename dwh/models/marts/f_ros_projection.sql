{{
  config(
    materialized='incremental',
    unique_key=['season', 'player_id', 'team', 'scoring'],
    on_schema_change='sync_all_columns',
    post_hook=[
      "CREATE INDEX IF NOT EXISTS idx_ros_proj_season_scoring_pos ON {{ this }} (season, scoring, position)",
      "CREATE INDEX IF NOT EXISTS idx_ros_proj_player ON {{ this }} (player_id)"
    ]
  )
}}

WITH current_week_calc AS (
  SELECT 
    season,
    MAX(week) AS current_week
  FROM {{ ref('f_calendar_weeks') }}
  WHERE week_start_date <= '{{ var("projections.as_of_date", run_started_at) }}'::timestamp
  GROUP BY season
),

future_weeks AS (
  SELECT DISTINCT
    cw.season,
    cw.current_week,
    fw.week,
    fw.player_id,
    fw.team,
    fw.position,
    fw.scoring,
    fw.proj_pts,
    -- Extract variance from CI bounds (approximate)
    POWER((fw.high - fw.low) / (2 * {{ var('projections.z_score', 1.28155) }}), 2) AS week_variance
  FROM current_week_calc cw
  CROSS JOIN {{ ref('f_weekly_projection') }} fw
  WHERE fw.season = cw.season
    -- Include all weeks for 2024 (completed season), future weeks for other seasons
    AND (
      (fw.season = 2024 AND fw.week >= 1)
      OR (fw.season != 2024 AND fw.week > cw.current_week)
    )
    {% if is_incremental() %}
      AND fw.built_at > (SELECT MAX(built_at) FROM {{ this }})
    {% endif %}
),

ros_aggregates AS (
  SELECT 
    season,
    player_id,
    team,
    position,
    scoring,
    SUM(proj_pts) AS proj_pts_total,
    -- Combine variances (assuming independence)
    SQRT(SUM(week_variance)) * {{ var('projections.z_score', 1.28155) }} AS ci_range,
    -- Build per-week JSON array
    jsonb_agg(
      jsonb_build_object(
        'week', week,
        'proj', ROUND(proj_pts::numeric, 2)
      ) ORDER BY week
    ) AS per_week_json,
    COUNT(*) AS weeks_remaining,
    CURRENT_TIMESTAMP AS built_at
  FROM future_weeks
  GROUP BY season, player_id, team, position, scoring
)

SELECT 
  season,
  player_id,
  team,
  position,
  scoring,
  ROUND(proj_pts_total::numeric, 2) AS proj_pts_total,
  ROUND((proj_pts_total - ci_range)::numeric, 2) AS low,
  ROUND((proj_pts_total + ci_range)::numeric, 2) AS high,
  per_week_json,
  weeks_remaining,
  built_at
FROM ros_aggregates
WHERE proj_pts_total > 0  -- Only include players with meaningful projections