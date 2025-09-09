"""Team management API routes."""

from typing import Dict, Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, delete, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import auth_service
from app.db.async_session import get_session
from app.db.models import User, Team, TeamRoster
from app.services.roster_service import RosterService, RosterSlot


router = APIRouter(prefix="/teams", tags=["Teams"])


class RosterPositions(BaseModel):
    """Roster positions configuration."""

    starters: Dict[str, int] = Field(..., description="Starting positions and counts")
    bench: int = Field(..., description="Number of bench slots")
    ir: int = Field(default=0, description="Number of IR slots")


class CreateTeamRequest(BaseModel):
    """Create team request."""

    name: str = Field(..., min_length=1, max_length=255)
    league_name: str | None = Field(None, max_length=255)
    scoring_system: str = Field(default="ppr", pattern="^(ppr|half_ppr|standard)$")
    league_size: int = Field(default=12, ge=4, le=32)
    roster_positions: RosterPositions


class UpdateTeamRequest(BaseModel):
    """Update team request."""

    name: str | None = Field(None, min_length=1, max_length=255)
    league_name: str | None = Field(None, max_length=255)
    scoring_system: str | None = Field(None, pattern="^(ppr|half_ppr|standard)$")
    league_size: int | None = Field(None, ge=4, le=32)
    roster_positions: RosterPositions | None = None


class TeamResponse(BaseModel):
    """Team response model."""

    id: str
    name: str
    league_name: str | None
    scoring_system: str
    league_size: int
    roster_positions: Dict[str, Any]
    created_at: str
    updated_at: str
    roster_count: int = Field(default=0, description="Number of players on roster")


class RosterSlotModel(BaseModel):
    """Roster slot definition for API."""

    type: str = Field(..., pattern="^(starter|bench|ir)$")
    position: str | None = Field(None, description="Position for starter slots")
    index: int = Field(..., ge=1)


class RosterPlayerResponse(BaseModel):
    """Roster player response."""

    player_id: str
    roster_slot: RosterSlotModel
    added_at: str
    player_info: Dict[str, Any] | None = None  # Will be populated from existing player data


class TeamRosterResponse(BaseModel):
    """Team roster response."""

    team_id: str
    players: List[RosterPlayerResponse]
    available_slots: List[RosterSlotModel]


class AddPlayerRequest(BaseModel):
    """Add player to roster request."""

    player_id: str = Field(..., description="Player ID")
    player_position: str = Field(..., description="Player's position")
    roster_slot: RosterSlotModel


class UpdateRosterRequest(BaseModel):
    """Update player roster slot request."""

    roster_slot: RosterSlotModel


@router.get("", response_model=List[TeamResponse])
async def get_user_teams(
    current_user: User = Depends(auth_service.get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get all teams for the authenticated user."""
    result = await session.execute(
        select(Team)
        .options(selectinload(Team.roster_players))
        .where(Team.user_id == current_user.id)
        .order_by(Team.created_at.desc())
    )
    teams = result.scalars().all()

    return [
        TeamResponse(
            id=str(team.id),
            name=team.name,
            league_name=team.league_name,
            scoring_system=team.scoring_system,
            league_size=team.league_size,
            roster_positions=team.roster_positions,
            created_at=team.created_at.isoformat(),
            updated_at=team.updated_at.isoformat(),
            roster_count=len(team.roster_players),
        )
        for team in teams
    ]


@router.post("", response_model=TeamResponse)
async def create_team(
    request: CreateTeamRequest,
    current_user: User = Depends(auth_service.get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create a new team for the authenticated user."""
    # Validate roster positions
    _validate_roster_positions(request.roster_positions)

    team = Team(
        user_id=current_user.id,
        name=request.name,
        league_name=request.league_name,
        scoring_system=request.scoring_system,
        league_size=request.league_size,
        roster_positions=request.roster_positions.model_dump(),
    )

    session.add(team)
    await session.commit()
    await session.refresh(team)

    return TeamResponse(
        id=str(team.id),
        name=team.name,
        league_name=team.league_name,
        scoring_system=team.scoring_system,
        league_size=team.league_size,
        roster_positions=team.roster_positions,
        created_at=team.created_at.isoformat(),
        updated_at=team.updated_at.isoformat(),
        roster_count=0,
    )


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: UUID,
    current_user: User = Depends(auth_service.get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get a specific team."""
    team = await _get_user_team(session, team_id, current_user.id)

    # Count roster players
    result = await session.execute(select(TeamRoster).where(TeamRoster.team_id == team_id))
    roster_count = len(result.scalars().all())

    return TeamResponse(
        id=str(team.id),
        name=team.name,
        league_name=team.league_name,
        scoring_system=team.scoring_system,
        league_size=team.league_size,
        roster_positions=team.roster_positions,
        created_at=team.created_at.isoformat(),
        updated_at=team.updated_at.isoformat(),
        roster_count=roster_count,
    )


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: UUID,
    request: UpdateTeamRequest,
    current_user: User = Depends(auth_service.get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update a team."""
    team = await _get_user_team(session, team_id, current_user.id)

    # Update fields if provided
    if request.name is not None:
        team.name = request.name
    if request.league_name is not None:
        team.league_name = request.league_name
    if request.scoring_system is not None:
        team.scoring_system = request.scoring_system
    if request.league_size is not None:
        team.league_size = request.league_size
    if request.roster_positions is not None:
        _validate_roster_positions(request.roster_positions)
        team.roster_positions = request.roster_positions.model_dump()

    await session.commit()
    await session.refresh(team)

    # Count roster players
    result = await session.execute(select(TeamRoster).where(TeamRoster.team_id == team_id))
    roster_count = len(result.scalars().all())

    return TeamResponse(
        id=str(team.id),
        name=team.name,
        league_name=team.league_name,
        scoring_system=team.scoring_system,
        league_size=team.league_size,
        roster_positions=team.roster_positions,
        created_at=team.created_at.isoformat(),
        updated_at=team.updated_at.isoformat(),
        roster_count=roster_count,
    )


@router.delete("/{team_id}")
async def delete_team(
    team_id: UUID,
    current_user: User = Depends(auth_service.get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete a team."""
    team = await _get_user_team(session, team_id, current_user.id)

    await session.delete(team)
    await session.commit()

    return {"message": "Team deleted successfully"}


async def _get_user_team(session: AsyncSession, team_id: UUID, user_id: UUID) -> Team:
    """Get team owned by user or raise 404."""
    result = await session.execute(select(Team).where(Team.id == team_id, Team.user_id == user_id))
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    return team


def _validate_roster_positions(roster_positions: RosterPositions) -> None:
    """Validate roster positions configuration."""
    # Check that at least one starting position is defined
    if not roster_positions.starters:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one starting position must be defined",
        )

    # Check valid positions
    valid_positions = {"QB", "RB", "WR", "TE", "K", "DST", "FLEX", "SUPER_FLEX"}
    for position in roster_positions.starters.keys():
        if position not in valid_positions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid starting position: {position}",
            )

    # Check position counts are positive
    for position, count in roster_positions.starters.items():
        if count < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Position {position} count must be at least 1",
            )

    # Check bench count
    if roster_positions.bench < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Bench count must be at least 1"
        )


async def _get_player_info(session: AsyncSession, player_id: str) -> Dict[str, Any] | None:
    """Get player information from stg_players (includes both regular players and DST)."""
    try:
        result = await session.execute(
            text("""
                SELECT 
                    display_name as name,
                    CASE 
                        WHEN position = 'DST' THEN SPLIT_PART(player_id, '_DST', 1)
                        ELSE NULL 
                    END as team,
                    position,
                    NULL as jersey_number,
                    NULL as headshot
                FROM dwh_staging.stg_players 
                WHERE player_id = :player_id
                LIMIT 1
            """),
            {"player_id": player_id},
        )
        row = result.fetchone()
        if row:
            return {
                "name": row[0],
                "team": row[1],
                "position": row[2],
                "jersey_number": row[3],
                "headshot": row[4],
            }
        return None
    except Exception:
        return None


async def _get_weekly_projection(
    session: AsyncSession, player_id: str, scoring: str = "ppr"
) -> Dict[str, Any] | None:
    """Get next week's projection for a player."""
    try:
        # Get the next upcoming week's projection
        # Priority: current week > earliest future week > latest available projection
        result = await session.execute(
            text("""
                WITH next_week AS (
                    -- First try to get current or next upcoming week
                    SELECT 
                        fp.proj_pts,
                        fp.low,
                        fp.high,
                        fp.season,
                        fp.week,
                        cw.week_status,
                        1 as priority
                    FROM dwh_marts.f_weekly_projection fp
                    JOIN dwh_marts.f_calendar_weeks cw 
                        ON fp.season = cw.season AND fp.week = cw.week
                    WHERE fp.player_id = :player_id 
                    AND fp.scoring = :scoring
                    AND cw.week_status IN ('current', 'future')
                    
                    UNION ALL
                    
                    -- Fallback to most recent projection if no future weeks available
                    SELECT 
                        fp.proj_pts,
                        fp.low,
                        fp.high,
                        fp.season,
                        fp.week,
                        'fallback' as week_status,
                        2 as priority
                    FROM dwh_marts.f_weekly_projection fp
                    WHERE fp.player_id = :player_id 
                    AND fp.scoring = :scoring
                    AND NOT EXISTS (
                        SELECT 1 FROM dwh_marts.f_weekly_projection fp2
                        JOIN dwh_marts.f_calendar_weeks cw2 
                            ON fp2.season = cw2.season AND fp2.week = cw2.week
                        WHERE fp2.player_id = :player_id 
                        AND fp2.scoring = :scoring
                        AND cw2.week_status IN ('current', 'future')
                    )
                )
                SELECT 
                    proj_pts,
                    low,
                    high,
                    season,
                    week
                FROM next_week
                ORDER BY priority ASC, season ASC, week ASC
                LIMIT 1
            """),
            {"player_id": player_id, "scoring": scoring},
        )
        row = result.fetchone()
        if row:
            return {
                "proj_pts": float(row[0]) if row[0] else 0,
                "low": float(row[1]) if row[1] else 0,
                "high": float(row[2]) if row[2] else 0,
                "season": row[3],
                "week": row[4],
            }
        return None
    except Exception:
        return None


# Roster Management Endpoints


@router.get("/{team_id}/roster", response_model=TeamRosterResponse)
async def get_team_roster(
    team_id: UUID,
    current_user: User = Depends(auth_service.get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get team roster with all players and available slots."""
    team = await _get_user_team(session, team_id, current_user.id)
    roster_service = RosterService(session)

    # Get current roster players
    result = await session.execute(select(TeamRoster).where(TeamRoster.team_id == team_id))
    roster_players = result.scalars().all()

    # Convert to response format with player info
    players = []
    for roster_player in roster_players:
        slot_data = roster_player.roster_slot

        # Get player information
        player_info = await _get_player_info(session, roster_player.player_id)

        # Get weekly projection
        projection = await _get_weekly_projection(
            session, roster_player.player_id, team.scoring_system
        )

        # Combine player info and projection
        if player_info:
            player_info["projection"] = projection

        players.append(
            RosterPlayerResponse(
                player_id=roster_player.player_id,
                roster_slot=RosterSlotModel(**slot_data),
                added_at=roster_player.added_at.isoformat(),
                player_info=player_info,
            )
        )

    # Get available slots (we'll calculate for a generic player position for now)
    # In a real implementation, you'd want to specify which player you're adding
    available_slots_data = []

    return TeamRosterResponse(
        team_id=str(team_id), players=players, available_slots=available_slots_data
    )


@router.post("/{team_id}/roster", response_model=RosterPlayerResponse)
async def add_player_to_roster(
    team_id: UUID,
    request: AddPlayerRequest,
    current_user: User = Depends(auth_service.get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Add a player to team roster."""
    team = await _get_user_team(session, team_id, current_user.id)
    roster_service = RosterService(session)

    # Convert request model to service model
    roster_slot = RosterSlot(
        type=request.roster_slot.type,
        position=request.roster_slot.position,
        index=request.roster_slot.index,
    )

    # Add player to roster
    roster_entry = await roster_service.add_player_to_roster(
        team_id=team_id,
        player_id=request.player_id,
        player_position=request.player_position,
        roster_slot=roster_slot,
        team=team,
    )

    # Get player information for response
    player_info = await _get_player_info(session, roster_entry.player_id)
    projection = await _get_weekly_projection(session, roster_entry.player_id, team.scoring_system)

    if player_info:
        player_info["projection"] = projection

    return RosterPlayerResponse(
        player_id=roster_entry.player_id,
        roster_slot=RosterSlotModel(**roster_entry.roster_slot),
        added_at=roster_entry.added_at.isoformat(),
        player_info=player_info,
    )


@router.put("/{team_id}/roster/{player_id}", response_model=RosterPlayerResponse)
async def update_player_roster_slot(
    team_id: UUID,
    player_id: str,
    request: UpdateRosterRequest,
    current_user: User = Depends(auth_service.get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Move a player to a different roster slot."""
    team = await _get_user_team(session, team_id, current_user.id)
    roster_service = RosterService(session)

    # We need the player's position for validation
    # TODO: Get this from existing player data
    player_position = "RB"  # Placeholder - should come from player lookup

    # Convert request model to service model
    roster_slot = RosterSlot(
        type=request.roster_slot.type,
        position=request.roster_slot.position,
        index=request.roster_slot.index,
    )

    # Move player in roster
    roster_entry = await roster_service.move_player_in_roster(
        team_id=team_id,
        player_id=player_id,
        player_position=player_position,
        new_roster_slot=roster_slot,
        team=team,
    )

    return RosterPlayerResponse(
        player_id=roster_entry.player_id,
        roster_slot=RosterSlotModel(**roster_entry.roster_slot),
        added_at=roster_entry.added_at.isoformat(),
        player_info=None,  # TODO: Populate from existing player data
    )


@router.delete("/{team_id}/roster/{player_id}")
async def remove_player_from_roster(
    team_id: UUID,
    player_id: str,
    current_user: User = Depends(auth_service.get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Remove a player from team roster."""
    await _get_user_team(session, team_id, current_user.id)
    roster_service = RosterService(session)

    await roster_service.remove_player_from_roster(team_id, player_id)

    return {"message": "Player removed from roster successfully"}
