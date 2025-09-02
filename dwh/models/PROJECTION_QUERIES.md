# Stage 3 Projection Sample Queries

This document provides sample queries for the Stage 3 baseline projection models.

## Weekly Projections (`f_weekly_projection`)

### Top PPR WRs for Current Week
```sql
SELECT 
    p.display_name,
    fp.team, 
    fp.proj_pts, 
    fp.low, 
    fp.high,
    fp.components_json->>'targets_pred' as targets,
    fp.components_json->>'rec_yds_pred' as rec_yds
FROM marts.f_weekly_projection fp
JOIN staging.stg_players p ON fp.player_id = p.player_id
WHERE fp.season = 2024 
    AND fp.week = 10 
    AND fp.scoring = 'ppr' 
    AND fp.position = 'WR'
ORDER BY fp.proj_pts DESC
LIMIT 25;
```

### Compare Projections Across Scoring Systems
```sql
SELECT 
    p.display_name,
    fp.position,
    fp.team,
    MAX(CASE WHEN fp.scoring = 'ppr' THEN fp.proj_pts END) as ppr_pts,
    MAX(CASE WHEN fp.scoring = 'half' THEN fp.proj_pts END) as half_pts,
    MAX(CASE WHEN fp.scoring = 'std' THEN fp.proj_pts END) as std_pts
FROM marts.f_weekly_projection fp
JOIN staging.stg_players p ON fp.player_id = p.player_id
WHERE fp.season = 2024 
    AND fp.week = 10
    AND fp.position IN ('RB', 'WR', 'TE')
GROUP BY p.display_name, fp.position, fp.team, fp.player_id
HAVING MAX(CASE WHEN fp.scoring = 'ppr' THEN fp.proj_pts END) > 10
ORDER BY ppr_pts DESC;
```

### High-Confidence Plays (Narrow CI)
```sql
SELECT 
    p.display_name,
    fp.position,
    fp.team, 
    fp.proj_pts,
    fp.high - fp.low as confidence_range,
    fp.components_json->>'target_share_4w' as target_share,
    fp.components_json->>'dvp_index' as dvp_adjustment
FROM marts.f_weekly_projection fp
JOIN staging.stg_players p ON fp.player_id = p.player_id
WHERE fp.season = 2024 
    AND fp.week = 10 
    AND fp.scoring = 'ppr'
    AND fp.proj_pts > 8
ORDER BY (fp.high - fp.low) ASC
LIMIT 20;
```

### Projection Component Breakdown
```sql
SELECT 
    p.display_name,
    fp.position,
    fp.proj_pts,
    fp.components_json->>'targets_pred' as targets,
    fp.components_json->>'rec_pred' as receptions,
    fp.components_json->>'rec_yds_pred' as rec_yards,
    fp.components_json->>'rec_td_pred' as rec_tds,
    fp.components_json->>'rush_att_pred' as carries,
    fp.components_json->>'rush_yds_pred' as rush_yards,
    fp.components_json->>'rush_td_pred' as rush_tds
FROM marts.f_weekly_projection fp
JOIN staging.stg_players p ON fp.player_id = p.player_id
WHERE fp.season = 2024 
    AND fp.week = 10 
    AND fp.scoring = 'ppr' 
    AND p.display_name ILIKE '%jefferson%'
ORDER BY fp.proj_pts DESC;
```

## Rest of Season Projections (`f_ros_projection`)

### ROS RB Leaders
```sql
SELECT 
    p.display_name,
    fp.team,
    fp.proj_pts_total,
    fp.low as ros_floor,
    fp.high as ros_ceiling,
    fp.weeks_remaining,
    ROUND(fp.proj_pts_total / fp.weeks_remaining, 2) as avg_weekly_pts
FROM marts.f_ros_projection fp
JOIN staging.stg_players p ON fp.player_id = p.player_id
WHERE fp.season = 2024 
    AND fp.scoring = 'ppr' 
    AND fp.position = 'RB'
ORDER BY fp.proj_pts_total DESC
LIMIT 25;
```

### Weekly Breakdown for Top Players
```sql
SELECT 
    p.display_name,
    fp.proj_pts_total,
    jsonb_pretty(fp.per_week_json) as weekly_breakdown
FROM marts.f_ros_projection fp
JOIN staging.stg_players p ON fp.player_id = p.player_id
WHERE fp.season = 2024 
    AND fp.scoring = 'ppr' 
    AND fp.position = 'WR'
    AND fp.proj_pts_total > 100
ORDER BY fp.proj_pts_total DESC
LIMIT 10;
```

### Best Value Targets (High Floor Players)
```sql
SELECT 
    p.display_name,
    fp.position,
    fp.team,
    fp.proj_pts_total,
    fp.low as floor,
    ROUND((fp.low / fp.proj_pts_total * 100), 1) as floor_percentage
FROM marts.f_ros_projection fp
JOIN staging.stg_players p ON fp.player_id = p.player_id
WHERE fp.season = 2024 
    AND fp.scoring = 'ppr'
    AND fp.proj_pts_total > 50
ORDER BY floor_percentage DESC
LIMIT 20;
```

## Analytical Queries

### Projection Movement Analysis
```sql
-- Compare current week vs last week projections
WITH current_week AS (
    SELECT 
        player_id,
        proj_pts as current_proj,
        components_json->>'target_share_4w' as current_share
    FROM marts.f_weekly_projection
    WHERE season = 2024 AND week = 10 AND scoring = 'ppr'
),
last_week AS (
    SELECT 
        player_id,
        proj_pts as last_proj,
        components_json->>'target_share_4w' as last_share
    FROM marts.f_weekly_projection
    WHERE season = 2024 AND week = 9 AND scoring = 'ppr'
)
SELECT 
    p.display_name,
    c.current_proj,
    l.last_proj,
    ROUND((c.current_proj - l.last_proj), 2) as proj_change,
    c.current_share::numeric - l.last_share::numeric as share_change
FROM current_week c
JOIN last_week l ON c.player_id = l.player_id
JOIN staging.stg_players p ON c.player_id = p.player_id
WHERE ABS(c.current_proj - l.last_proj) > 2
ORDER BY ABS(c.current_proj - l.last_proj) DESC;
```

### Defense vs Position Impact
```sql
SELECT 
    fp.position,
    AVG(fp.proj_pts) as avg_proj,
    AVG((fp.components_json->>'dvp_index')::numeric) as avg_dvp_impact,
    COUNT(*) as player_count
FROM marts.f_weekly_projection fp
WHERE fp.season = 2024 
    AND fp.week = 10 
    AND fp.scoring = 'ppr'
    AND fp.proj_pts > 5
GROUP BY fp.position
ORDER BY avg_dvp_impact DESC;
```

### Model Accuracy Tracking (for completed weeks)
```sql
-- Compare projections to actual performance (requires actual stats)
SELECT 
    fp.position,
    COUNT(*) as projections,
    AVG(fp.proj_pts) as avg_projected,
    AVG(actual.fantasy_pts) as avg_actual,
    AVG(ABS(fp.proj_pts - actual.fantasy_pts)) as avg_error
FROM marts.f_weekly_projection fp
JOIN (
    -- This would join to actual fantasy points from historical data
    SELECT 
        player_id, 
        season, 
        week,
        -- Calculate fantasy points based on actual stats
        receptions * 1.0 + receiving_yards * 0.1 + receiving_tds * 6 +
        rushing_yards * 0.1 + rushing_tds * 6 as fantasy_pts
    FROM staging.stg_weekly_player_stats
    WHERE season = 2024 AND week < 10  -- Historical weeks only
) actual ON fp.player_id = actual.player_id 
    AND fp.season = actual.season 
    AND fp.week = actual.week
WHERE fp.season = 2024 
    AND fp.week < 10
    AND fp.scoring = 'ppr'
GROUP BY fp.position
ORDER BY avg_error ASC;
```