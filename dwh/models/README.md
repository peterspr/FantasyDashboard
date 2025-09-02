# Fantasy Insights Data Warehouse Models

This directory contains the dbt models for transforming raw NFL data into analytics-ready marts for fantasy football insights and projections.

## Model Structure

```
models/
├── staging/          # Raw data transformations and cleaning
├── intermediate/     # Business logic and derived metrics  
└── marts/           # Final analytical tables
```

## Stage 3: Baseline Projections

### Overview

Stage 3 implements transparent, rules-based fantasy projections without machine learning. The methodology uses:

- **Volume prediction**: Team volume × player usage shares (4-week rolling averages)
- **Efficiency with shrinkage**: Player season-to-date rates shrunk to league priors
- **Opponent adjustment**: Defense vs position (DvP) modifiers capped at ±30%
- **Confidence intervals**: Binomial/Poisson variance with normal approximation

### Key Models

#### `f_weekly_projection`
Weekly fantasy projections by player, week, and scoring system.

**Methodology:**
1. **Usage Shares**: 4-week rolling averages from `f_weekly_usage`
   - `target_share_4w`, `route_pct_4w`, `rush_share_4w`
2. **Team Volume**: Predicted from `int_team_volume_preds` (4-week team averages)
   - `team_targets_pred`, `team_rush_att_pred`, `team_routes_pred`
3. **Volume Projection**: Player share × Team volume
   - `targets_pred = target_share_4w * team_targets_pred`
4. **Efficiency Rates**: YTD player rates shrunk to priors using Bayesian updating
   - `catch_rate_shrunk = (player_receptions + prior_mean * k) / (player_targets + k)`
5. **Opponent Adjustment**: Multiply rates by DvP index (capped 0.7-1.3)
6. **Components**: Convert opportunities to fantasy stats
   - `rec_pred = targets_pred * catch_rate_final`
   - `rec_yds_pred = rec_pred * rec_yds_per_rec_final`
7. **Scoring**: Apply scoring weights (PPR, Half, Standard)
8. **Confidence**: Binomial variance for discrete stats, normal for yards

**Columns:**
- `proj_pts`: Expected fantasy points
- `low`, `high`: ~P10/P90 confidence bounds  
- `components_json`: Breakdown of targets, receptions, yards, TDs, usage shares, DvP

#### `f_ros_projection`
Rest-of-season projections aggregating future weekly projections.

**Methodology:**
1. Sum weekly projections for remaining weeks in season
2. Combine variances assuming independence: `sqrt(sum(week_variances))`
3. Build `per_week_json` array with weekly breakdown

**Columns:**
- `proj_pts_total`: Total remaining fantasy points
- `low`, `high`: Season-total confidence bounds
- `per_week_json`: Array of `{week, proj}` for remaining weeks
- `weeks_remaining`: Count of future weeks

#### `int_team_volume_preds`
Intermediate model predicting team-level volume (targets, carries, pass attempts).

Uses 4-week rolling averages with season-to-date fallback from aggregated `stg_weekly_player_stats`.

### Seeds

#### `efficiency_priors`
League-average efficiency rates by position for Bayesian shrinkage:
- `catch_rate`: Reception rate on targets (WR: 0.62, RB: 0.72, TE: 0.65)  
- `rec_yds_per_rec`: Yards per reception
- `rush_yds_per_att`: Yards per carry (RB: 4.2)
- `*_td_rate`: TD rates per opportunity
- `k`: Shrinkage strength (higher = more regression to mean)

#### `scoring_weights`
Fantasy scoring systems:
- **PPR**: 1.0 pt/reception, 0.1 pt/yard, 6 pts/TD
- **Half**: 0.5 pt/reception  
- **Standard**: 0 pts/reception

### Macros

- `shrink_rate()`: Bayesian rate shrinkage
- `score_points()`: Apply scoring weights to components
- `normal_ci()`: Confidence intervals from variance
- `ewa()`: Exponentially weighted averages (fallback to 4-week rolling)

### Configuration

Variables in `dbt_project.yml`:
```yaml
vars:
  projections:
    z_score: 1.28155     # ~P10/P90 CI
    dvp_cap_low: 0.7     # Min opponent adjustment  
    dvp_cap_high: 1.3    # Max opponent adjustment
```

### Usage

```bash
# Load efficiency priors and scoring weights
make dbt-seed

# Build projections (includes dependencies)
make projections

# Query examples
SELECT * FROM marts.f_weekly_projection 
WHERE season=2024 AND week=10 AND scoring='ppr' AND position='WR'
ORDER BY proj_pts DESC LIMIT 25;
```

### Limitations

1. **No injury/availability modeling** - Players projected as if healthy/active
2. **Linear opponent adjustments** - DvP modifies all efficiency rates equally  
3. **Independence assumption** - Components treated as uncorrelated
4. **Static priors** - League averages don't update with current season trends
5. **Weather/game script** - No situational context beyond DvP
6. **No correlation modeling** - Team stacks, game environments ignored

### Future Enhancements (Stage 4+)

- ML-based efficiency prediction
- Injury probability modeling  
- Game script and pace adjustments
- Weather impact on passing/rushing
- Lineup optimization and stack correlation
- Real-time line movement integration

### Quality Assurance

**Tests:**
- Unique keys: `(season, week, player_id, scoring)`
- Confidence ordering: `low ≤ proj_pts ≤ high`  
- Valid scoring systems: `{ppr, half, std}`
- Referential integrity to usage and players tables

**Monitoring:**
- Weekly projection vs actual analysis (see `PROJECTION_QUERIES.md`)
- Component consistency (targets → receptions → yards)
- Reasonable CI widths (typically 30-60% of projection)

For sample queries and analysis examples, see `PROJECTION_QUERIES.md`.