"""Database models for authentication and team management."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, UniqueConstraint, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    """Base class for database models."""

    pass


class User(Base):
    """User model for authentication."""

    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # 'google', etc.
    provider_id: Mapped[str] = mapped_column(
        String(255), nullable=False
    )  # OAuth provider's user ID
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    teams: Mapped[List["Team"]] = relationship(
        "Team", back_populates="user", cascade="all, delete-orphan"
    )
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("provider", "provider_id", name="uq_users_provider_id"),)


class RefreshToken(Base):
    """Refresh token model for secure authentication."""

    __tablename__ = "refresh_tokens"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")


class Team(Base):
    """Team model for fantasy team management."""

    __tablename__ = "teams"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    league_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    scoring_system: Mapped[str] = mapped_column(String(50), nullable=False, default="ppr")
    league_size: Mapped[int] = mapped_column(Integer, nullable=False, default=12)
    roster_positions: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="teams")
    roster_players: Mapped[List["TeamRoster"]] = relationship(
        "TeamRoster", back_populates="team", cascade="all, delete-orphan"
    )


class TeamRoster(Base):
    """Team roster model for player assignments."""

    __tablename__ = "team_rosters"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    team_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    player_id: Mapped[str] = mapped_column(
        String(255), nullable=False
    )  # References existing player data
    roster_slot: Mapped[Dict[str, Any]] = mapped_column(
        JSON, nullable=False
    )  # Dynamic slot definition
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())

    # Relationships
    team: Mapped["Team"] = relationship("Team", back_populates="roster_players")

    __table_args__ = (UniqueConstraint("team_id", "roster_slot", name="uq_team_rosters_slot"),)


class PositionEligibility(Base):
    """Position eligibility model for roster validation."""

    __tablename__ = "position_eligibility"

    roster_position: Mapped[str] = mapped_column(
        String(10), primary_key=True
    )  # QB, RB, WR, TE, K, DST, FLEX, etc.
    player_position: Mapped[str] = mapped_column(
        String(10), primary_key=True
    )  # QB, RB, WR, TE, K, DST
