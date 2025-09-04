"""Add authentication and team building tables

Revision ID: 002_auth_and_teams
Revises: 001_stage1_raw_ops
Create Date: 2024-12-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_auth_and_teams'
down_revision = '001_stage1_raw_ops'
branch_labels = None
depends_on = None


def upgrade():
    """Add authentication and team management tables."""
    
    # Create users table
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('provider_id', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create unique indexes for users
    op.create_index('uq_users_email', 'users', ['email'], unique=True)
    op.create_index('uq_users_provider_id', 'users', ['provider', 'provider_id'], unique=True)
    
    # Create refresh_tokens table
    op.create_table('refresh_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token_hash', sa.String(255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    
    # Create index for refresh tokens
    op.create_index('idx_refresh_tokens_user_expires', 'refresh_tokens', ['user_id', 'expires_at'])
    
    # Create teams table
    op.create_table('teams',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('league_name', sa.String(255), nullable=True),
        sa.Column('scoring_system', sa.String(50), nullable=False, server_default='ppr'),
        sa.Column('league_size', sa.Integer(), nullable=False, server_default='12'),
        sa.Column('roster_positions', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    
    # Create index for teams
    op.create_index('idx_teams_user_id', 'teams', ['user_id'])
    
    # Create team_rosters table
    op.create_table('team_rosters',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('player_id', sa.String(255), nullable=False),
        sa.Column('roster_slot', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('added_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE')
    )
    
    # Create indexes for team_rosters
    op.create_index('idx_team_rosters_team_id', 'team_rosters', ['team_id'])
    op.create_index('idx_team_rosters_player_id', 'team_rosters', ['player_id'])
    op.create_index('uq_team_rosters_slot', 'team_rosters', ['team_id', 'roster_slot'], unique=True)
    
    # Create position_eligibility table for validation
    op.create_table('position_eligibility',
        sa.Column('roster_position', sa.String(10), nullable=False),
        sa.Column('player_position', sa.String(10), nullable=False),
        sa.PrimaryKeyConstraint('roster_position', 'player_position')
    )
    
    # Insert standard position eligibility data
    position_data = [
        ('QB', 'QB'),
        ('RB', 'RB'),
        ('WR', 'WR'),
        ('TE', 'TE'),
        ('K', 'K'),
        ('DST', 'DST'),
        ('FLEX', 'RB'),
        ('FLEX', 'WR'),
        ('FLEX', 'TE'),
        ('SUPER_FLEX', 'QB'),
        ('SUPER_FLEX', 'RB'),
        ('SUPER_FLEX', 'WR'),
        ('SUPER_FLEX', 'TE'),
    ]
    
    for roster_pos, player_pos in position_data:
        op.execute(
            f"INSERT INTO position_eligibility (roster_position, player_position) "
            f"VALUES ('{roster_pos}', '{player_pos}')"
        )


def downgrade():
    """Remove authentication and team management tables."""
    
    # Drop tables in reverse order (due to foreign key constraints)
    op.drop_table('position_eligibility')
    op.drop_table('team_rosters')
    op.drop_table('teams')
    op.drop_table('refresh_tokens')
    op.drop_table('users')
