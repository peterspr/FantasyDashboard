{{ config(materialized='view') }}

WITH regular_players AS (
  SELECT DISTINCT ON ({{ j_get_text('data', 'gsis_id') }})
    {{ j_get_text('data', 'gsis_id', "''") }} AS player_id,
    {{ j_get_text('data', 'gsis_id') }} AS gsis_id,
    {{ j_get_text('data', 'pfr_id') }} AS pfr_id,
    {{ j_get_text('data', 'espn_id') }} AS espn_id,
    {{ j_get_text('data', 'sportradar_id') }} AS sportradar_id,
    {{ j_get_text('data', 'player_name') }} AS display_name,
    {{ j_get_text('data', 'first_name') }} AS first_name,
    {{ j_get_text('data', 'last_name') }} AS last_name,
    CASE 
      WHEN UPPER({{ j_get_text('data', 'position') }}) IN ('QB', 'RB', 'WR', 'TE', 'K', 'DEF') 
      THEN UPPER({{ j_get_text('data', 'position') }})
      ELSE {{ j_get_text('data', 'position') }}
    END AS position,
    CASE 
      WHEN {{ j_get_text('data', 'birth_date') }} = '' OR {{ j_get_text('data', 'birth_date') }} IS NULL 
      THEN NULL::date
      ELSE {{ j_get_text('data', 'birth_date') }}::date
    END AS birthdate,
    {{ j_get_num('data', 'height') }} AS height,
    {{ j_get_num('data', 'weight') }} AS weight,
    {{ j_get_text('data', 'college') }} AS college,
    {{ j_get_text('data', 'status', "'Active'") }} AS status,
    _ingested_at

  FROM {{ source('raw', 'players') }}
  WHERE dataset = 'players'
  ORDER BY {{ j_get_text('data', 'gsis_id') }}, _ingested_at DESC
),

dst_players AS (
  SELECT DISTINCT
    teams.team || '_DST' AS player_id,
    NULL AS gsis_id,
    NULL AS pfr_id,
    NULL AS espn_id,
    NULL AS sportradar_id,
    teams.team || ' Defense' AS display_name,
    teams.team AS first_name,
    'Defense' AS last_name,
    'DST' AS position,
    NULL::date AS birthdate,
    NULL::numeric AS height,
    NULL::numeric AS weight,
    NULL AS college,
    'Active' AS status,
    CURRENT_TIMESTAMP AS _ingested_at
  FROM (
    SELECT DISTINCT home_team AS team FROM {{ ref('stg_schedules') }} WHERE season >= 2023
    UNION 
    SELECT DISTINCT away_team AS team FROM {{ ref('stg_schedules') }} WHERE season >= 2023
  ) teams
)

SELECT * FROM regular_players
UNION ALL
SELECT * FROM dst_players