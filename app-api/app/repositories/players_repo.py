from typing import Dict, List, Optional
import asyncpg
from app.db.async_session import get_raw_connection

class PlayersRepository:
    async def list_players(
        self,
        search: Optional[str] = None,
        position: Optional[str] = None,
        team: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict:
        async with get_raw_connection() as conn:
            where_clauses = []
            params = []
            param_idx = 1
            
            if search:
                where_clauses.append(f"LOWER(CASE WHEN display_name != '' THEN display_name ELSE concat(first_name, ' ', last_name) END) LIKE ${param_idx}")
                params.append(f"%{search.lower()}%")
                param_idx += 1
                
            if position:
                where_clauses.append(f"position = ${param_idx}")
                params.append(position.upper())
                param_idx += 1
                
            # Note: team filter not supported as stg_players doesn't have team column
            # Team info would need to come from roster data
            if team:
                # Skip team filtering for now
                pass
            
            where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            # Count total - include both players and defenses
            count_query = f"""
            SELECT COUNT(*) FROM (
                SELECT 
                    player_id, 
                    CASE WHEN display_name != '' THEN display_name ELSE concat(first_name, ' ', last_name) END as name, 
                    NULL as team, 
                    position
                FROM (SELECT DISTINCT ON (player_id) player_id, display_name, first_name, last_name, position FROM dwh_staging.stg_players) p
                
                UNION ALL
                
                -- Include defenses
                SELECT DISTINCT
                    player_id,
                    team || ' DST' as name,
                    team,
                    position
                FROM dwh_staging.stg_team_defense_stats
                WHERE season = (SELECT MAX(season) FROM dwh_staging.stg_team_defense_stats)
            ) players
            {where_sql}
            """
            total = await conn.fetchval(count_query, *params)
            
            # Get results - include both players and defenses
            query = f"""
            WITH players AS (
                SELECT 
                    player_id, 
                    CASE WHEN display_name != '' THEN display_name ELSE concat(first_name, ' ', last_name) END as name, 
                    NULL as team, 
                    position
                FROM (SELECT DISTINCT ON (player_id) player_id, display_name, first_name, last_name, position FROM dwh_staging.stg_players) p
                
                UNION ALL
                
                -- Include defenses
                SELECT DISTINCT
                    player_id,
                    team || ' DST' as name,
                    team,
                    position
                FROM dwh_staging.stg_team_defense_stats
                WHERE season = (SELECT MAX(season) FROM dwh_staging.stg_team_defense_stats)
            )
            SELECT player_id, name, team, position 
            FROM players
            {where_sql}
            ORDER BY name ASC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """
            params.extend([limit, offset])
            
            rows = await conn.fetch(query, *params)
            
            return {
                "items": [dict(row) for row in rows],
                "total": total,
                "limit": limit,
                "offset": offset
            }