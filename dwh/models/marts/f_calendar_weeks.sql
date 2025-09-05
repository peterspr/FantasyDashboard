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
),

-- Generate synthetic 2025 calendar when schedules aren't available yet
-- Typical NFL season starts second Thursday in September
synthetic_2025_weeks AS (
  SELECT 
    2025 AS season,
    week_num AS week,
    -- Start 2025 season on September 11, 2025 (second Thursday)
    DATE '2025-09-11' + ((week_num - 1) * INTERVAL '7 days') AS week_start_date,
    DATE '2025-09-11' + ((week_num - 1) * INTERVAL '7 days') + INTERVAL '6 days' AS week_end_date
  FROM generate_series(1, 18) AS week_num
  WHERE NOT EXISTS (
    SELECT 1 FROM {{ ref('stg_schedules') }} 
    WHERE season = 2025 AND game_type = 'REG'
  )
),

combined_weeks AS (
  SELECT * FROM distinct_weeks
  
  UNION ALL
  
  SELECT * FROM synthetic_2025_weeks
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

FROM combined_weeks
ORDER BY season, week