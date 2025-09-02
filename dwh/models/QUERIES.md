# Stage 2 Sample Queries

This document provides sample queries to verify and explore the Stage 2 dbt models.

## Recent Usage for Top WRs

```sql
-- Recent usage for known WRs
SELECT 
  p.display_name,
  u.team,
  u.position,
  u.week,
  u.target_share,
  u.target_share_4w,
  u.route_pct,
  u.route_pct_4w,
  u.targets,
  u.receptions
FROM marts.f_weekly_usage u
JOIN staging.stg_players p ON u.player_id = p.player_id
WHERE u.position = 'WR' 
  AND u.season = 2024
  AND u.target_share_4w > 0.15  -- 15%+ target share
ORDER BY u.week DESC, u.target_share_4w DESC
LIMIT 25;
```

## Defense vs Position Analysis

```sql
-- Defense vs position (rolling allowed PPR)
SELECT 
  team,
  position,
  week,
  allowed_ppr_week,
  rolling_allowed_ppr_4w,
  schedule_adj_index,
  sample_players
FROM marts.f_defense_vs_pos
WHERE position = 'RB' 
  AND season = 2024
  AND week >= 5  -- Need a few weeks for rolling averages
ORDER BY week DESC, rolling_allowed_ppr_4w DESC
LIMIT 25;
```

## Team Totals Sanity Check

```sql
-- Team totals sanity check
SELECT 
  season,
  week,
  team,
  team_targets,
  team_rush_att,
  team_pass_att,
  active_players
FROM intermediate.int_team_week_totals
WHERE season = 2024
ORDER BY week DESC, team;
```

## Player Usage Share Validation

```sql
-- Validate that target shares sum appropriately by team
SELECT 
  season,
  week,
  team,
  COUNT(*) as players_with_targets,
  SUM(target_share) as total_target_share,
  SUM(rush_share) as total_rush_share,
  MAX(target_share_4w) as max_target_share_4w
FROM marts.f_weekly_usage
WHERE season = 2024
  AND target_share > 0
GROUP BY season, week, team
HAVING SUM(target_share) > 1.05 OR SUM(target_share) < 0.95  -- Flag unusual totals
ORDER BY week DESC, total_target_share DESC;
```

## Position Distribution

```sql
-- Check position distribution in usage data
SELECT 
  position,
  COUNT(*) as player_weeks,
  COUNT(DISTINCT player_id) as unique_players,
  AVG(target_share_4w) as avg_target_share_4w,
  AVG(route_pct_4w) as avg_route_pct_4w
FROM marts.f_weekly_usage
WHERE season = 2024 
  AND week >= 4  -- Enough weeks for rolling averages
GROUP BY position
ORDER BY player_weeks DESC;
```

## Calendar Weeks Status

```sql
-- Check calendar weeks and their status
SELECT 
  season,
  week,
  week_start_date::date,
  week_end_date::date,
  week_status
FROM marts.f_calendar_weeks
WHERE season = 2024
ORDER BY week;
```

## Defense Strengths and Weaknesses

```sql
-- Identify defense strengths/weaknesses vs each position
SELECT 
  team,
  position,
  COUNT(*) as weeks_data,
  AVG(schedule_adj_index) as avg_adj_index,
  CASE 
    WHEN AVG(schedule_adj_index) < 0.85 THEN 'Strong Defense'
    WHEN AVG(schedule_adj_index) > 1.15 THEN 'Weak Defense'  
    ELSE 'Average'
  END as defense_rating
FROM marts.f_defense_vs_pos
WHERE season = 2024
  AND week >= 4
  AND schedule_adj_index IS NOT NULL
GROUP BY team, position
ORDER BY avg_adj_index ASC;
```

## Data Quality Checks

```sql
-- Check for missing critical fields
SELECT 
  'f_weekly_usage' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) - COUNT(target_share_4w) as missing_target_share_4w,
  COUNT(*) - COUNT(player_id) as missing_player_id
FROM marts.f_weekly_usage
WHERE season = 2024

UNION ALL

SELECT 
  'f_defense_vs_pos',
  COUNT(*),
  COUNT(*) - COUNT(schedule_adj_index),
  COUNT(*) - COUNT(team)
FROM marts.f_defense_vs_pos
WHERE season = 2024;
```

## Rolling Average Validation

```sql
-- Validate rolling averages are reasonable
WITH usage_with_manual_calc AS (
  SELECT 
    player_id,
    season,
    week,
    target_share,
    target_share_4w,
    -- Manual 4-week average for comparison
    AVG(target_share) OVER (
      PARTITION BY player_id 
      ORDER BY season, week 
      ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) as manual_4w_avg
  FROM marts.f_weekly_usage
  WHERE season = 2024 
    AND player_id = '00-0030506'  -- Pick a specific player to validate
    AND week <= 10
)
SELECT 
  week,
  target_share,
  target_share_4w,
  manual_4w_avg,
  ABS(target_share_4w - manual_4w_avg) as difference
FROM usage_with_manual_calc
ORDER BY week;
```