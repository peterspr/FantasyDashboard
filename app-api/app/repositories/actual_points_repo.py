from typing import Dict, List, Optional, Any
import asyncpg
from app.db.async_session import get_raw_connection

class ActualPointsRepository:
    async def get_actual_points(
        self,
        season: int,
        week: int,
        scoring: str = "ppr",
        search: Optional[str] = None,
        position: Optional[str] = None,
        team: Optional[str] = None,
        sort_by: str = "actual_points",
        sort_desc: bool = True,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Get actual points for players in a given week"""
        async with get_raw_connection() as conn:
            # Build base conditions
            where_conditions = ["season = $1", "week = $2", "scoring = $3"]
            params = [season, week, scoring]
            param_idx = 4
            
            # Add search filter
            if search:
                where_conditions.append(f"LOWER(name) LIKE ${param_idx}")
                params.append(f"%{search.lower()}%")
                param_idx += 1
                
            # Add position filter
            if position:
                where_conditions.append(f"position = ${param_idx}")
                params.append(position)
                param_idx += 1
                
            # Add team filter
            if team:
                where_conditions.append(f"team = ${param_idx}")
                params.append(team)
                param_idx += 1
            
            where_clause = " AND ".join(where_conditions)
            
            # Validate sort column
            valid_sort_columns = {
                "name", "team", "position", "actual_points"
            }
            if sort_by not in valid_sort_columns:
                sort_by = "actual_points"
                
            sort_direction = "DESC" if sort_desc else "ASC"
            
            # Get total count
            count_query = f"""
                SELECT COUNT(*) as total
                FROM dwh_marts.f_weekly_actual_points
                WHERE {where_clause}
            """
            
            count_result = await conn.fetchrow(count_query, *params)
            total = count_result['total'] if count_result else 0
            
            # Get actual data
            data_query = f"""
                SELECT 
                    player_id,
                    name,
                    team,
                    position,
                    scoring,
                    actual_points,
                    season,
                    week
                FROM dwh_marts.f_weekly_actual_points
                WHERE {where_clause}
                ORDER BY {sort_by} {sort_direction}
                LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """
            
            params.extend([limit, offset])
            rows = await conn.fetch(data_query, *params)
            
            items = [
                {
                    "player_id": row["player_id"],
                    "name": row["name"],
                    "team": row["team"],
                    "position": row["position"], 
                    "scoring": row["scoring"],
                    "actual_points": float(row["actual_points"]) if row["actual_points"] else 0.0,
                    "season": row["season"],
                    "week": row["week"],
                }
                for row in rows
            ]
            
            return {
                "items": items,
                "total": total,
                "limit": limit,
                "offset": offset,
                "season": season,
                "week": week,
                "scoring": scoring
            }
    
    async def get_player_season_actual_points(
        self,
        player_id: str,
        season: int,
        scoring: str = "ppr",
        week_start: int = 1,
        week_end: int = 18
    ) -> Dict[str, Any]:
        """Get actual points for a specific player across a season range"""
        async with get_raw_connection() as conn:
            query = """
                SELECT 
                    player_id,
                    name,
                    team,
                    position,
                    scoring,
                    actual_points,
                    season,
                    week
                FROM dwh_marts.f_weekly_actual_points
                WHERE player_id = $1 
                    AND season = $2 
                    AND scoring = $3
                    AND week >= $4
                    AND week <= $5
                ORDER BY week ASC
            """
            
            rows = await conn.fetch(query, player_id, season, scoring, week_start, week_end)
            
            items = [
                {
                    "player_id": row["player_id"],
                    "name": row["name"],
                    "team": row["team"],
                    "position": row["position"], 
                    "scoring": row["scoring"],
                    "actual_points": float(row["actual_points"]) if row["actual_points"] else 0.0,
                    "season": row["season"],
                    "week": row["week"],
                }
                for row in rows
            ]
            
            return {
                "player_id": player_id,
                "season": season,
                "scoring": scoring,
                "week_start": week_start,
                "week_end": week_end,
                "items": items,
                "total": len(items)
            }