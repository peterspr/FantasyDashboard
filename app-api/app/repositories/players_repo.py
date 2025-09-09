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
        offset: int = 0,
    ) -> Dict:
        async with get_raw_connection() as conn:
            where_clauses = []
            params = []
            param_idx = 1

            if search:
                where_clauses.append(
                    f"LOWER(CASE WHEN display_name != '' THEN display_name ELSE concat(first_name, ' ', last_name) END) LIKE ${param_idx}"
                )
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

            # Count total
            count_query = f"SELECT COUNT(*) FROM (SELECT DISTINCT ON (player_id) player_id, display_name, first_name, last_name, position FROM dwh_staging.stg_players) p {where_sql}"
            total = await conn.fetchval(count_query, *params)

            # Get results
            query = f"""
            SELECT 
                player_id, 
                CASE WHEN display_name != '' THEN display_name ELSE concat(first_name, ' ', last_name) END as name, 
                CASE 
                    WHEN position = 'DST' THEN SPLIT_PART(player_id, '_DST', 1)
                    ELSE NULL 
                END as team, 
                position
            FROM (SELECT DISTINCT ON (player_id) player_id, display_name, first_name, last_name, position FROM dwh_staging.stg_players) p
            {where_sql}
            ORDER BY CASE WHEN display_name != '' THEN display_name ELSE concat(first_name, ' ', last_name) END ASC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """
            params.extend([limit, offset])

            rows = await conn.fetch(query, *params)

            return {
                "items": [dict(row) for row in rows],
                "total": total,
                "limit": limit,
                "offset": offset,
            }
