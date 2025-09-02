{{ config(materialized='table') }}

WITH distinct_weeks AS (
  SELECT DISTINCT
    season,
    week,
    MIN(start_time) AS week_start_date,
    MAX(start_time) AS week_end_date
  FROM {{ ref('stg_schedules') }}
  WHERE game_type = 'REG'  -- Regular season only
    AND week IS NOT NULL
  GROUP BY season, week
)

SELECT
  season,
  week,
  week_start_date,
  week_end_date,
  -- Calculate if this week is in the past, current, or future
  CASE
    WHEN week_end_date < CURRENT_DATE THEN 'completed'
    WHEN week_start_date <= CURRENT_DATE AND week_end_date >= CURRENT_DATE THEN 'current'
    ELSE 'future'
  END AS week_status,
  CURRENT_TIMESTAMP AS built_at

FROM distinct_weeks
ORDER BY season, week