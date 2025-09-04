{{
  config(
    materialized='incremental',
    unique_key=['season', 'week', 'team', 'position'],
    on_schema_change='sync_all_columns',
    post_hook=[
      "CREATE INDEX IF NOT EXISTS idx_f_defense_vs_pos_sw_pos ON {{ this }} (season, week, position)",
      "CREATE INDEX IF NOT EXISTS idx_f_defense_vs_pos_team_sw ON {{ this }} (team, season, week)"
    ]
  )
}}

WITH defense_with_rolling AS (
  SELECT
    season,
    week,
    def_team AS team,
    position,
    allowed_ppr_points AS allowed_ppr_week,
    rolling_allowed_ppr_4w,
    rolling_allowed_ppr_6w,
    allowed_yards,
    allowed_tds,
    sample_players,
    CURRENT_TIMESTAMP AS built_at,
    _ingested_at
  FROM {{ ref('int_defense_allowed_rolling') }}
  WHERE 1=1
    {% if is_incremental() %}
      AND created_at > (SELECT MAX(built_at) FROM {{ this }})
    {% endif %}
),

league_averages AS (
  SELECT
    season,
    week,
    position,
    AVG(rolling_allowed_ppr_4w) AS league_avg_rolling_4w,
    AVG(rolling_allowed_ppr_6w) AS league_avg_rolling_6w
  FROM defense_with_rolling
  WHERE rolling_allowed_ppr_4w IS NOT NULL
  GROUP BY season, week, position
)

SELECT
  dwr.season,
  dwr.week,
  dwr.team,
  dwr.position,
  
  -- Weekly and rolling allowed stats
  dwr.allowed_ppr_week,
  dwr.rolling_allowed_ppr_4w,
  dwr.rolling_allowed_ppr_6w,
  dwr.allowed_yards,
  dwr.allowed_tds,
  
  -- Stabilized normalization to league average with caps and minimum sample requirements
  CASE 
    WHEN la.league_avg_rolling_4w > 0 AND dwr.sample_players >= 8
    THEN GREATEST(0.8, LEAST(1.2, dwr.rolling_allowed_ppr_4w / la.league_avg_rolling_4w))
    WHEN la.league_avg_rolling_4w > 0 AND dwr.sample_players >= 4
    THEN GREATEST(0.9, LEAST(1.1, dwr.rolling_allowed_ppr_4w / la.league_avg_rolling_4w))
    ELSE 1.0
  END AS schedule_adj_index,
  
  dwr.sample_players,
  CURRENT_TIMESTAMP AS built_at

FROM defense_with_rolling dwr
LEFT JOIN league_averages la
  ON dwr.season = la.season
  AND dwr.week = la.week  
  AND dwr.position = la.position