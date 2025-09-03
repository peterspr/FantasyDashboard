from typing import Dict, Any, Optional
from app.db.async_session import get_raw_connection

class ScoringRepository:
    async def preview_scoring(
        self,
        season: int,
        week: int,
        scoring: Dict[str, float],
        filters: Dict[str, Optional[str]],
        limit: int,
        offset: int
    ) -> Dict[str, Any]:
        """Calculate custom scoring preview"""
        async with get_raw_connection() as conn:
            where_conditions = ["p.season = $1", "p.week = $2"]
            params = [season, week]
            param_count = 2
            
            if filters.get("position"):
                param_count += 1
                where_conditions.append(f"p.position = ${param_count}")
                params.append(filters["position"])
            
            if filters.get("team"):
                param_count += 1
                where_conditions.append(f"p.team = ${param_count}")
                params.append(filters["team"])
            
            if filters.get("search"):
                param_count += 1
                where_conditions.append(f"p.name ILIKE ${param_count}")
                params.append(f"%{filters['search']}%")
            
            scoring_calc = self._build_scoring_calculation(scoring)
            where_clause = " AND ".join(where_conditions)
            
            count_query = f"""
                SELECT COUNT(*) as total
                FROM mart.int_weekly_projections_components p
                WHERE {where_clause}
            """
            
            count_result = await conn.fetchrow(count_query, *params)
            total = count_result["total"]
            
            data_query = f"""
                SELECT 
                    p.player_id,
                    p.name,
                    p.team,
                    p.position,
                    {scoring_calc} as proj,
                    p.targets_pred,
                    p.rec_pred,
                    p.rec_yds_pred,
                    p.rec_td_pred,
                    p.rush_att_pred,
                    p.rush_yds_pred,
                    p.rush_td_pred,
                    p.pass_att_pred,
                    p.pass_yds_pred,
                    p.pass_td_pred,
                    p.int_pred,
                    p.fumble_pred
                FROM mart.int_weekly_projections_components p
                WHERE {where_clause}
                ORDER BY proj DESC
                LIMIT ${param_count + 1} OFFSET ${param_count + 2}
            """
            
            params.extend([limit, offset])
            rows = await conn.fetch(data_query, *params)
            
            items = []
            for row in rows:
                components = {
                    "targets_pred": float(row["targets_pred"]) if row["targets_pred"] else 0.0,
                    "rec_pred": float(row["rec_pred"]) if row["rec_pred"] else 0.0,
                    "rec_yds_pred": float(row["rec_yds_pred"]) if row["rec_yds_pred"] else 0.0,
                    "rec_td_pred": float(row["rec_td_pred"]) if row["rec_td_pred"] else 0.0,
                    "rush_att_pred": float(row["rush_att_pred"]) if row["rush_att_pred"] else 0.0,
                    "rush_yds_pred": float(row["rush_yds_pred"]) if row["rush_yds_pred"] else 0.0,
                    "rush_td_pred": float(row["rush_td_pred"]) if row["rush_td_pred"] else 0.0,
                    "pass_att_pred": float(row["pass_att_pred"]) if row["pass_att_pred"] else 0.0,
                    "pass_yds_pred": float(row["pass_yds_pred"]) if row["pass_yds_pred"] else 0.0,
                    "pass_td_pred": float(row["pass_td_pred"]) if row["pass_td_pred"] else 0.0,
                    "int_pred": float(row["int_pred"]) if row["int_pred"] else 0.0,
                    "fumble_pred": float(row["fumble_pred"]) if row["fumble_pred"] else 0.0
                }
                
                items.append({
                    "player_id": row["player_id"],
                    "name": row["name"],
                    "team": row["team"],
                    "position": row["position"],
                    "scoring": "custom",
                    "proj": float(row["proj"]),
                    "low": float(row["proj"]) * 0.75,  # Simple uncertainty calculation
                    "high": float(row["proj"]) * 1.25,
                    "components": components,
                    "season": season,
                    "week": week
                })
            
            return {
                "season": season,
                "week": week,
                "scoring": "custom",
                "items": items,
                "total": total,
                "limit": limit,
                "offset": offset
            }
    
    def _build_scoring_calculation(self, scoring: Dict[str, float]) -> str:
        """Build SQL scoring calculation from scoring dict"""
        calculations = []
        
        if scoring.get("reception", 0) != 0:
            calculations.append(f"COALESCE(p.rec_pred, 0) * {scoring['reception']}")
        
        if scoring.get("rec_yd", 0) != 0:
            calculations.append(f"COALESCE(p.rec_yds_pred, 0) * {scoring['rec_yd']}")
        
        if scoring.get("rec_td", 0) != 0:
            calculations.append(f"COALESCE(p.rec_td_pred, 0) * {scoring['rec_td']}")
        
        if scoring.get("rush_yd", 0) != 0:
            calculations.append(f"COALESCE(p.rush_yds_pred, 0) * {scoring['rush_yd']}")
        
        if scoring.get("rush_td", 0) != 0:
            calculations.append(f"COALESCE(p.rush_td_pred, 0) * {scoring['rush_td']}")
        
        if scoring.get("pass_yd", 0) != 0:
            calculations.append(f"COALESCE(p.pass_yds_pred, 0) * {scoring['pass_yd']}")
        
        if scoring.get("pass_td", 0) != 0:
            calculations.append(f"COALESCE(p.pass_td_pred, 0) * {scoring['pass_td']}")
        
        if scoring.get("int", 0) != 0:
            calculations.append(f"COALESCE(p.int_pred, 0) * {scoring['int']}")
        
        if scoring.get("fumble", 0) != 0:
            calculations.append(f"COALESCE(p.fumble_pred, 0) * {scoring['fumble']}")
        
        if not calculations:
            return "0"
        
        return " + ".join(calculations)