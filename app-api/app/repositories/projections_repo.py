from typing import Dict, List, Optional
import asyncpg
from app.db.async_session import get_raw_connection

class ProjectionsRepository:
    async def list_weekly_projections(
        self,
        season: int,
        week: int,
        scoring: str,
        position: Optional[str] = None,
        team: Optional[str] = None,
        search: Optional[str] = None,
        sort: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict:
        async with get_raw_connection() as conn:
            where_clauses = [
                "fp.season = $1",
                "fp.week = $2", 
                "fp.scoring = $3"
            ]
            params = [season, week, scoring]
            param_idx = 4
            
            if position:
                where_clauses.append(f"fp.position = ${param_idx}")
                params.append(position.upper())
                param_idx += 1
                
            if team:
                where_clauses.append(f"fp.team = ${param_idx}")
                params.append(team.upper())
                param_idx += 1
                
            if search:
                where_clauses.append(f"LOWER(p.display_name) LIKE ${param_idx}")
                params.append(f"%{search.lower()}%")
                param_idx += 1
            
            where_sql = "WHERE " + " AND ".join(where_clauses)
            
            # Sort options
            sort_sql = "ORDER BY fp.proj_pts DESC"  # default
            if sort == "low":
                sort_sql = "ORDER BY fp.low DESC"
            elif sort == "high":
                sort_sql = "ORDER BY fp.high DESC"
            elif sort == "name":
                sort_sql = "ORDER BY p.display_name ASC"
            elif sort == "proj":
                sort_sql = "ORDER BY fp.proj_pts DESC"
            
            # Count total
            count_query = f"""
            SELECT COUNT(*)
            FROM marts.f_weekly_projection fp
            LEFT JOIN staging.stg_players p ON fp.player_id = p.player_id
            {where_sql}
            """
            total = await conn.fetchval(count_query, *params)
            
            # Get results
            query = f"""
            SELECT 
                fp.player_id,
                COALESCE(p.display_name, fp.player_id) as name,
                fp.team,
                fp.position,
                fp.scoring,
                fp.proj_pts as proj,
                fp.low,
                fp.high,
                fp.components_json as components,
                fp.season,
                fp.week
            FROM marts.f_weekly_projection fp
            LEFT JOIN staging.stg_players p ON fp.player_id = p.player_id
            {where_sql}
            {sort_sql}
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """
            params.extend([limit, offset])
            
            rows = await conn.fetch(query, *params)
            
            return {
                "season": season,
                "week": week,
                "scoring": scoring,
                "items": [dict(row) for row in rows],
                "total": total,
                "limit": limit,
                "offset": offset
            }
    
    async def list_ros_projections(
        self,
        season: int,
        scoring: str,
        position: Optional[str] = None,
        team: Optional[str] = None,
        search: Optional[str] = None,
        sort: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict:
        async with get_raw_connection() as conn:
            where_clauses = [
                "fp.season = $1",
                "fp.scoring = $2"
            ]
            params = [season, scoring]
            param_idx = 3
            
            if position:
                where_clauses.append(f"fp.position = ${param_idx}")
                params.append(position.upper())
                param_idx += 1
                
            if team:
                where_clauses.append(f"fp.team = ${param_idx}")
                params.append(team.upper())
                param_idx += 1
                
            if search:
                where_clauses.append(f"LOWER(p.display_name) LIKE ${param_idx}")
                params.append(f"%{search.lower()}%")
                param_idx += 1
            
            where_sql = "WHERE " + " AND ".join(where_clauses)
            
            # Sort options
            sort_sql = "ORDER BY fp.proj_pts_total DESC"  # default
            if sort == "low":
                sort_sql = "ORDER BY fp.low DESC"
            elif sort == "high":
                sort_sql = "ORDER BY fp.high DESC"
            elif sort == "name":
                sort_sql = "ORDER BY p.display_name ASC"
            elif sort == "proj":
                sort_sql = "ORDER BY fp.proj_pts_total DESC"
            
            # Count total
            count_query = f"""
            SELECT COUNT(*)
            FROM marts.f_ros_projection fp
            LEFT JOIN staging.stg_players p ON fp.player_id = p.player_id
            {where_sql}
            """
            total = await conn.fetchval(count_query, *params)
            
            # Get results
            query = f"""
            SELECT 
                fp.player_id,
                COALESCE(p.display_name, fp.player_id) as name,
                fp.team,
                fp.position,
                fp.scoring,
                fp.proj_pts_total as proj_total,
                fp.low,
                fp.high,
                fp.per_week_json
            FROM marts.f_ros_projection fp
            LEFT JOIN staging.stg_players p ON fp.player_id = p.player_id
            {where_sql}
            {sort_sql}
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """
            params.extend([limit, offset])
            
            rows = await conn.fetch(query, *params)
            
            return {
                "season": season,
                "scoring": scoring,
                "items": [dict(row) for row in rows],
                "total": total,
                "limit": limit,
                "offset": offset
            }