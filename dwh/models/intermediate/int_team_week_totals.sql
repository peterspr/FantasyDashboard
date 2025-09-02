{{
  config(
    materialized='incremental',
    unique_key=['season', 'week', 'team'],
    on_schema_change='sync_all_columns'
  )
}}

WITH team_weekly_stats AS (
  SELECT
    season,
    week,
    team,
    SUM(targets) AS team_targets,
    SUM(carries) AS team_rush_att,
    SUM(attempts) AS team_pass_att,
    SUM(receptions) AS team_rec,
    SUM(rushing_tds) AS team_rush_td,
    SUM(receiving_tds) AS team_rec_td,
    SUM(passing_tds) AS team_pass_td,
    COUNT(DISTINCT player_id) AS active_players,
    CURRENT_TIMESTAMP AS created_at
  FROM {{ ref('stg_weekly_player_stats') }}
  WHERE 1=1
    {% if is_incremental() %}
      AND _ingested_at > (SELECT MAX(created_at) FROM {{ this }})
    {% endif %}
  GROUP BY season, week, team
)

SELECT
  season,
  week, 
  team,
  team_targets,
  team_rush_att,
  team_pass_att,
  team_rec,
  team_rush_td,
  team_rec_td,
  team_pass_td,
  active_players,
  created_at
FROM team_weekly_stats