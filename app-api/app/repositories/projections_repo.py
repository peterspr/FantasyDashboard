from typing import Dict, List, Optional
import json
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
                # Check if search looks like a player_id (contains hyphens and numbers)
                if "-" in search and any(c.isdigit() for c in search):
                    where_clauses.append(f"fp.player_id = ${param_idx}")
                    params.append(search)
                else:
                    where_clauses.append(f"LOWER(CASE WHEN p.display_name != '' THEN p.display_name ELSE concat(p.first_name, ' ', p.last_name) END) LIKE ${param_idx}")
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
            WITH dedupe_players AS (
                SELECT DISTINCT ON (player_id) 
                    player_id, display_name, first_name, last_name
                FROM dwh_staging.stg_players
            )
            SELECT COUNT(*)
            FROM dwh_marts.f_weekly_projection fp
            LEFT JOIN dedupe_players p ON fp.player_id = p.player_id
            {where_sql}
            """
            total = await conn.fetchval(count_query, *params)
            
            # Get results
            query = f"""
            WITH dedupe_players AS (
                SELECT DISTINCT ON (player_id) 
                    player_id, display_name, first_name, last_name
                FROM dwh_staging.stg_players
            )
            SELECT 
                fp.player_id,
                COALESCE(CASE WHEN p.display_name != '' THEN p.display_name ELSE concat(p.first_name, ' ', p.last_name) END, fp.player_id) as name,
                fp.team,
                fp.position,
                fp.scoring,
                fp.proj_pts as proj,
                fp.low,
                fp.high,
                fp.components_json as components,
                fp.season,
                fp.week
            FROM dwh_marts.f_weekly_projection fp
            LEFT JOIN dedupe_players p ON fp.player_id = p.player_id
            {where_sql}
            {sort_sql}
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """
            params.extend([limit, offset])
            
            rows = await conn.fetch(query, *params)
            
            # Parse JSON components
            items = []
            for row in rows:
                item = dict(row)
                if item.get('components'):
                    try:
                        item['components'] = json.loads(item['components'])
                    except (json.JSONDecodeError, TypeError):
                        item['components'] = {}
                items.append(item)
            
            return {
                "season": season,
                "week": week,
                "scoring": scoring,
                "items": items,
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
                # Check if search looks like a player_id (contains hyphens and numbers)
                if "-" in search and any(c.isdigit() for c in search):
                    where_clauses.append(f"fp.player_id = ${param_idx}")
                    params.append(search)
                else:
                    where_clauses.append(f"LOWER(CASE WHEN p.display_name != '' THEN p.display_name ELSE concat(p.first_name, ' ', p.last_name) END) LIKE ${param_idx}")
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
            elif sort in ["proj", "proj_total"]:
                sort_sql = "ORDER BY fp.proj_pts_total DESC"
            
            # Count total
            count_query = f"""
            WITH dedupe_players AS (
                SELECT DISTINCT ON (player_id) 
                    player_id, display_name, first_name, last_name
                FROM dwh_staging.stg_players
            )
            SELECT COUNT(*)
            FROM dwh_marts.f_ros_projection fp
            LEFT JOIN dedupe_players p ON fp.player_id = p.player_id
            {where_sql}
            """
            total = await conn.fetchval(count_query, *params)
            
            # Get results
            query = f"""
            WITH dedupe_players AS (
                SELECT DISTINCT ON (player_id) 
                    player_id, display_name, first_name, last_name
                FROM dwh_staging.stg_players
            )
            SELECT 
                fp.player_id,
                COALESCE(CASE WHEN p.display_name != '' THEN p.display_name ELSE concat(p.first_name, ' ', p.last_name) END, fp.player_id) as name,
                fp.team,
                fp.position,
                fp.scoring,
                fp.proj_pts_total as proj_total,
                fp.low,
                fp.high,
                fp.per_week_json
            FROM dwh_marts.f_ros_projection fp
            LEFT JOIN dedupe_players p ON fp.player_id = p.player_id
            {where_sql}
            {sort_sql}
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """
            params.extend([limit, offset])
            
            rows = await conn.fetch(query, *params)
            
            # Parse JSON per_week data
            items = []
            for row in rows:
                item = dict(row)
                if item.get('per_week_json'):
                    try:
                        item['per_week_json'] = json.loads(item['per_week_json'])
                    except (json.JSONDecodeError, TypeError):
                        item['per_week_json'] = []
                items.append(item)
            
            return {
                "season": season,
                "scoring": scoring,
                "items": items,
                "total": total,
                "limit": limit,
                "offset": offset
            }
    
    async def get_player_season_projections(
        self,
        player_id: str,
        season: int,
        scoring: str,
        week_start: int = 1,
        week_end: int = 18
    ) -> Dict:
        """Get all weekly projections for a specific player across a season range"""
        async with get_raw_connection() as conn:
            query = """
            WITH dedupe_players AS (
                SELECT DISTINCT ON (player_id) 
                    player_id, display_name, first_name, last_name
                FROM dwh_staging.stg_players
            )
            SELECT 
                fp.player_id,
                COALESCE(CASE WHEN p.display_name != '' THEN p.display_name ELSE concat(p.first_name, ' ', p.last_name) END, fp.player_id) as name,
                fp.team,
                fp.position,
                fp.scoring,
                fp.proj_pts as proj,
                fp.low,
                fp.high,
                fp.components_json as components,
                fp.season,
                fp.week
            FROM dwh_marts.f_weekly_projection fp
            LEFT JOIN dedupe_players p ON fp.player_id = p.player_id
            WHERE fp.player_id = $1 
                AND fp.season = $2 
                AND fp.scoring = $3
                AND fp.week >= $4
                AND fp.week <= $5
            ORDER BY fp.week ASC
            """
            
            rows = await conn.fetch(query, player_id, season, scoring, week_start, week_end)
            
            # Parse JSON components
            items = []
            for row in rows:
                item = dict(row)
                if item.get('components'):
                    try:
                        item['components'] = json.loads(item['components'])
                    except (json.JSONDecodeError, TypeError):
                        item['components'] = {}
                items.append(item)
            
            return {
                "player_id": player_id,
                "season": season,
                "scoring": scoring,
                "week_start": week_start,
                "week_end": week_end,
                "items": items,
                "total": len(items)
            }