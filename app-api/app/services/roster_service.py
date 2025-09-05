"""Roster management service with position validation."""

from typing import Dict, Any, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Team, TeamRoster, PositionEligibility


class RosterSlot:
    """Roster slot representation."""
    
    def __init__(self, type: str, position: Optional[str] = None, index: int = 1):
        self.type = type  # 'starter', 'bench', 'ir'
        self.position = position  # Only for starters
        self.index = index
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON storage."""
        result = {"type": self.type, "index": self.index}
        if self.position:
            result["position"] = self.position
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RosterSlot":
        """Create from dictionary."""
        return cls(
            type=data["type"],
            position=data.get("position"),
            index=data["index"]
        )
    
    def __eq__(self, other) -> bool:
        if not isinstance(other, RosterSlot):
            return False
        return (
            self.type == other.type and
            self.position == other.position and
            self.index == other.index
        )
    
    def __hash__(self) -> int:
        return hash((self.type, self.position, self.index))


class RosterService:
    """Service for managing team rosters with position validation."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def validate_roster_move(
        self,
        team: Team,
        player_id: str,
        player_position: str,
        target_slot: RosterSlot
    ) -> None:
        """
        Validate if a player can be moved to a specific roster slot.
        
        Raises HTTPException if move is invalid.
        """
        from fastapi import HTTPException, status
        
        # Check if target slot is available
        current_roster = await self.get_team_roster_slots(team.id)
        if self.is_slot_occupied(current_roster, target_slot):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target slot is already occupied"
            )
        
        # Validate position eligibility for starter slots
        if target_slot.type == 'starter':
            is_eligible = await self.check_position_eligibility(
                target_slot.position, 
                player_position
            )
            if not is_eligible:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Player position {player_position} not eligible for {target_slot.position}"
                )
    
    async def get_team_roster_slots(self, team_id: UUID) -> List[TeamRoster]:
        """Get all current roster slots for a team."""
        result = await self.session.execute(
            select(TeamRoster).where(TeamRoster.team_id == team_id)
        )
        return result.scalars().all()
    
    def is_slot_occupied(self, current_roster: List[TeamRoster], target_slot: RosterSlot) -> bool:
        """Check if a roster slot is already occupied."""
        for roster_entry in current_roster:
            existing_slot = RosterSlot.from_dict(roster_entry.roster_slot)
            if existing_slot == target_slot:
                return True
        return False
    
    async def check_position_eligibility(
        self, 
        roster_position: str, 
        player_position: str
    ) -> bool:
        """Check if a player position is eligible for a roster position."""
        result = await self.session.execute(
            select(PositionEligibility).where(
                PositionEligibility.roster_position == roster_position,
                PositionEligibility.player_position == player_position
            )
        )
        return result.scalar_one_or_none() is not None
    
    async def get_available_slots(
        self, 
        team: Team, 
        player_position: str
    ) -> List[RosterSlot]:
        """Get all available roster slots for a player."""
        roster_config = team.roster_positions
        current_roster = await self.get_team_roster_slots(team.id)
        
        available_slots = []
        
        # Check starter positions
        for position, count in roster_config['starters'].items():
            eligible = await self.check_position_eligibility(position, player_position)
            if eligible:
                for i in range(1, count + 1):
                    slot = RosterSlot(type='starter', position=position, index=i)
                    if not self.is_slot_occupied(current_roster, slot):
                        available_slots.append(slot)
        
        # Check bench slots
        for i in range(1, roster_config['bench'] + 1):
            slot = RosterSlot(type='bench', index=i)
            if not self.is_slot_occupied(current_roster, slot):
                available_slots.append(slot)
        
        # Check IR slots if configured
        if roster_config.get('ir', 0) > 0:
            for i in range(1, roster_config['ir'] + 1):
                slot = RosterSlot(type='ir', index=i)
                if not self.is_slot_occupied(current_roster, slot):
                    available_slots.append(slot)
        
        return available_slots
    
    async def add_player_to_roster(
        self,
        team_id: UUID,
        player_id: str,
        player_position: str,
        roster_slot: RosterSlot,
        team: Optional[Team] = None
    ) -> TeamRoster:
        """Add a player to a team's roster."""
        if not team:
            result = await self.session.execute(
                select(Team).where(Team.id == team_id)
            )
            team = result.scalar_one_or_none()
            if not team:
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Team not found"
                )
        
        # Validate the move
        await self.validate_roster_move(team, player_id, player_position, roster_slot)
        
        # Create roster entry
        roster_entry = TeamRoster(
            team_id=team_id,
            player_id=player_id,
            roster_slot=roster_slot.to_dict()
        )
        
        self.session.add(roster_entry)
        await self.session.commit()
        await self.session.refresh(roster_entry)
        
        return roster_entry
    
    async def move_player_in_roster(
        self,
        team_id: UUID,
        player_id: str,
        player_position: str,
        new_roster_slot: RosterSlot,
        team: Optional[Team] = None
    ) -> TeamRoster:
        """Move a player to a different roster slot."""
        if not team:
            result = await self.session.execute(
                select(Team).where(Team.id == team_id)
            )
            team = result.scalar_one_or_none()
            if not team:
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Team not found"
                )
        
        # Find existing roster entry
        result = await self.session.execute(
            select(TeamRoster).where(
                TeamRoster.team_id == team_id,
                TeamRoster.player_id == player_id
            )
        )
        roster_entry = result.scalar_one_or_none()
        
        if not roster_entry:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Player not found on team roster"
            )
        
        # Validate the move (temporarily remove current player from validation)
        current_slot = RosterSlot.from_dict(roster_entry.roster_slot)
        current_roster = await self.get_team_roster_slots(team_id)
        filtered_roster = [r for r in current_roster if r.player_id != player_id]
        
        if self.is_slot_occupied(filtered_roster, new_roster_slot):
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target slot is already occupied"
            )
        
        # Validate position eligibility for starter slots
        if new_roster_slot.type == 'starter':
            is_eligible = await self.check_position_eligibility(
                new_roster_slot.position, 
                player_position
            )
            if not is_eligible:
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Player position {player_position} not eligible for {new_roster_slot.position}"
                )
        
        # Update roster slot
        roster_entry.roster_slot = new_roster_slot.to_dict()
        await self.session.commit()
        await self.session.refresh(roster_entry)
        
        return roster_entry
    
    async def remove_player_from_roster(
        self,
        team_id: UUID,
        player_id: str
    ) -> None:
        """Remove a player from a team's roster."""
        result = await self.session.execute(
            select(TeamRoster).where(
                TeamRoster.team_id == team_id,
                TeamRoster.player_id == player_id
            )
        )
        roster_entry = result.scalar_one_or_none()
        
        if not roster_entry:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Player not found on team roster"
            )
        
        await self.session.delete(roster_entry)
        await self.session.commit()