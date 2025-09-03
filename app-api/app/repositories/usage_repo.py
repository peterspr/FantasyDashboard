from typing import Dict, List, Optional, Any
import asyncpg
from app.db.async_session import get_raw_connection

class UsageRepository:
    async def get_player_usage(
        self,
        season: int,
        player_id: str,
        weeks: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """Get usage data for a specific player"""
        async with get_raw_connection() as conn:
            week_filter = ""
            params = [season, player_id]
            
            if weeks:
                placeholders = ",".join(f"${i+3}" for i in range(len(weeks)))
                week_filter = f"AND week = ANY(ARRAY[{placeholders}])"
                params.extend(weeks)
            
            query = f"""
                WITH usage_data AS (
                    SELECT 
                        season,
                        week,
                        player_id,
                        team,
                        position,
                        snap_pct,
                        route_pct,
                        target_share,
                        rush_share,
                        routes_run as routes,
                        targets,
                        rush_att
                    FROM dwh_intermediate.int_player_week_usage
                    WHERE season = $1 
                        AND player_id = $2
                        {week_filter}
                ),
                proj_data AS (
                    SELECT 
                        season,
                        week,
                        player_id,
                        proj_pts as proj,
                        low,
                        high
                    FROM dwh_marts.f_weekly_projection
                    WHERE season = $1 
                        AND player_id = $2
                        AND scoring = 'ppr'
                        {week_filter}
                )
                SELECT 
                    u.season,
                    u.week,
                    u.player_id,
                    u.team,
                    u.position,
                    u.snap_pct,
                    u.route_pct,
                    u.target_share,
                    u.rush_share,
                    u.routes,
                    u.targets,
                    u.rush_att,
                    p.proj,
                    p.low,
                    p.high
                FROM usage_data u
                LEFT JOIN proj_data p ON u.season = p.season 
                    AND u.week = p.week 
                    AND u.player_id = p.player_id
                ORDER BY u.week
            """
            
            rows = await conn.fetch(query, *params)
            
            items = []
            for row in rows:
                items.append({
                    "season": row["season"],
                    "week": row["week"],
                    "player_id": row["player_id"],
                    "team": row["team"],
                    "position": row["position"],
                    "snap_pct": float(row["snap_pct"]) if row["snap_pct"] is not None else None,
                    "route_pct": float(row["route_pct"]) if row["route_pct"] is not None else None,
                    "target_share": float(row["target_share"]) if row["target_share"] is not None else None,
                    "rush_share": float(row["rush_share"]) if row["rush_share"] is not None else None,
                    "routes": row["routes"],
                    "targets": row["targets"],
                    "rush_att": row["rush_att"],
                    "proj": float(row["proj"]) if row["proj"] is not None else None,
                    "low": float(row["low"]) if row["low"] is not None else None,
                    "high": float(row["high"]) if row["high"] is not None else None
                })
            
            return {
                "season": season,
                "player_id": player_id,
                "items": items,
                "total": len(items)
            }