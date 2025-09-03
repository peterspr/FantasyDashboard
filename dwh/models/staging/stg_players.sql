{{ config(materialized='view') }}

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
  {{ j_get_text('data', 'birth_date') }}::date AS birthdate,
  {{ j_get_num('data', 'height') }} AS height,
  {{ j_get_num('data', 'weight') }} AS weight,
  {{ j_get_text('data', 'college') }} AS college,
  {{ j_get_text('data', 'status', "'Active'") }} AS status,
  _ingested_at

FROM {{ source('raw', 'players') }}
WHERE dataset = 'players'
ORDER BY {{ j_get_text('data', 'gsis_id') }}, _ingested_at DESC