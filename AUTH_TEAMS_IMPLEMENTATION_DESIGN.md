# Fantasy Dashboard: Authentication & Team Building Implementation Design

## Overview

This document outlines the complete implementation design for adding authentication and team building features to the Fantasy Dashboard project. The implementation will enable users to:

1. Authenticate via social login (Google OAuth)
2. Create and manage multiple fantasy teams
3. Build team rosters with position management
4. View team-specific projections and insights

## Architecture Decisions

### Authentication Strategy
- **Social Login Only**: Google OAuth initially (expandable to other providers)
- **Session Management**: JWT access tokens with refresh tokens
- **Storage**: Access tokens in memory, refresh tokens in httpOnly cookies
- **Flow Type**: OAuth popup with redirect fallback

### Database Strategy
- **Single Database**: Extend existing PostgreSQL instance
- **Flexible Schema**: JSONB for dynamic league configurations
- **RESTful API**: Player-centric roster management endpoints

### Frontend Strategy
- **State Management**: React Query + Context (consistent with existing architecture)
- **Authentication Flow**: Seamless integration with existing pages
- **Progressive Enhancement**: Existing features remain public, new features require auth

## Database Schema

### User Management Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    provider VARCHAR(50) NOT NULL, -- 'google', 'github', etc.
    provider_id VARCHAR(255) NOT NULL, -- OAuth provider's user ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(provider, provider_id)
);

-- Refresh tokens table (for security)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_expires ON refresh_tokens(user_id, expires_at);
```

### Team Management Schema

```sql
-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    league_name VARCHAR(255),
    scoring_system VARCHAR(50) NOT NULL DEFAULT 'ppr', -- 'ppr', 'half_ppr', 'standard'
    league_size INTEGER DEFAULT 12,
    roster_positions JSONB NOT NULL, -- Dynamic roster configuration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Example roster_positions JSONB structure:
-- {
--   "starters": {
--     "QB": 1,
--     "RB": 2, 
--     "WR": 2,
--     "TE": 1,
--     "FLEX": 1,
--     "K": 1,
--     "DST": 1
--   },
--   "bench": 6,
--   "ir": 2
-- }

-- Team rosters table with dynamic slot management
CREATE TABLE team_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    player_id VARCHAR(255) NOT NULL, -- References existing player data
    roster_slot JSONB NOT NULL, -- Dynamic slot definition
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, roster_slot)
);

-- Example roster_slot JSONB structure:
-- {"type": "starter", "position": "QB", "index": 1}  // Starting QB
-- {"type": "starter", "position": "FLEX", "index": 1} // Flex position
-- {"type": "bench", "index": 1}                       // Bench slot 1
-- {"type": "ir", "index": 1}                          // IR slot 1

CREATE INDEX idx_team_rosters_team_id ON team_rosters(team_id);
CREATE INDEX idx_team_rosters_player_id ON team_rosters(player_id);
```

### Position Validation Rules

```sql
-- Position eligibility mapping for validation
CREATE TABLE position_eligibility (
    roster_position VARCHAR(10) NOT NULL, -- QB, RB, WR, TE, K, DST, FLEX, etc.
    player_position VARCHAR(10) NOT NULL, -- QB, RB, WR, TE, K, DST
    PRIMARY KEY (roster_position, player_position)
);

-- Seed data for standard position eligibility
INSERT INTO position_eligibility VALUES
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
('SUPER_FLEX', 'TE');
```

## API Design

### Authentication Endpoints

```
POST   /v1/auth/google/login     # OAuth callback, returns JWT tokens
POST   /v1/auth/refresh          # Refresh access token
POST   /v1/auth/logout           # Logout (invalidate refresh token)
GET    /v1/auth/me              # Get current user profile
```

### Team Management Endpoints

```
GET    /v1/teams                    # List user's teams (auth required)
POST   /v1/teams                    # Create new team (auth required)
GET    /v1/teams/{team_id}          # Get team details (auth required)
PUT    /v1/teams/{team_id}          # Update team settings (auth required)
DELETE /v1/teams/{team_id}          # Delete team (auth required)
```

### Team Roster Endpoints

```
GET    /v1/teams/{team_id}/roster                # Get complete roster (auth required)
POST   /v1/teams/{team_id}/roster                # Add player to roster (auth required)
PUT    /v1/teams/{team_id}/roster/{player_id}    # Move player to different slot (auth required)
DELETE /v1/teams/{team_id}/roster/{player_id}    # Remove player from roster (auth required)
```

### Request/Response Schemas

#### Authentication Responses
```typescript
interface AuthResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
  user: UserProfile;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}
```

#### Team Management Schemas
```typescript
interface CreateTeamRequest {
  name: string;
  league_name?: string;
  scoring_system: 'ppr' | 'half_ppr' | 'standard';
  league_size: number;
  roster_positions: RosterPositions;
}

interface RosterPositions {
  starters: Record<string, number>; // {"QB": 1, "RB": 2, etc.}
  bench: number;
  ir?: number;
}

interface Team {
  id: string;
  name: string;
  league_name?: string;
  scoring_system: string;
  league_size: number;
  roster_positions: RosterPositions;
  created_at: string;
  updated_at: string;
}
```

#### Roster Management Schemas
```typescript
interface RosterSlot {
  type: 'starter' | 'bench' | 'ir';
  position?: string; // Only for starters
  index: number;
}

interface RosterPlayer {
  player_id: string;
  roster_slot: RosterSlot;
  player: PlayerInfo; // Populated from existing player data
  added_at: string;
}

interface TeamRoster {
  team_id: string;
  players: RosterPlayer[];
  available_slots: RosterSlot[]; // Empty slots available
}

interface UpdateRosterRequest {
  roster_slot: RosterSlot;
}
```

## Backend Implementation

### Authentication Middleware

```python
# app/core/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
import jwt
from typing import Optional

security = HTTPBearer()

async def get_current_user(token: str = Depends(security)) -> Optional[User]:
    """Extract user from JWT token"""
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Fetch user from database
        user = await get_user_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user_optional(token: Optional[str] = Depends(security)) -> Optional[User]:
    """Optional authentication for endpoints that work with or without auth"""
    if token is None:
        return None
    return await get_current_user(token)
```

### Roster Validation Logic

```python
# app/services/roster_service.py
async def validate_roster_move(
    team: Team, 
    player_id: str, 
    target_slot: RosterSlot
) -> bool:
    """Validate if a player can be moved to a specific roster slot"""
    
    # Get player position from existing player data
    player = await get_player_by_id(player_id)
    if not player:
        raise ValueError("Player not found")
    
    # Check if target slot is available
    current_roster = await get_team_roster(team.id)
    if is_slot_occupied(current_roster, target_slot):
        raise ValueError("Target slot is already occupied")
    
    # Validate position eligibility
    if target_slot.type == 'starter':
        is_eligible = await check_position_eligibility(
            target_slot.position, 
            player.position
        )
        if not is_eligible:
            raise ValueError(f"Player position {player.position} not eligible for {target_slot.position}")
    
    return True

async def get_available_slots(team: Team, player_position: str) -> List[RosterSlot]:
    """Get all available roster slots for a player"""
    roster_config = team.roster_positions
    current_roster = await get_team_roster(team.id)
    
    available_slots = []
    
    # Check starter positions
    for position, count in roster_config['starters'].items():
        eligible = await check_position_eligibility(position, player_position)
        if eligible:
            for i in range(1, count + 1):
                slot = RosterSlot(type='starter', position=position, index=i)
                if not is_slot_occupied(current_roster, slot):
                    available_slots.append(slot)
    
    # Check bench slots
    for i in range(1, roster_config['bench'] + 1):
        slot = RosterSlot(type='bench', index=i)
        if not is_slot_occupied(current_roster, slot):
            available_slots.append(slot)
    
    return available_slots
```

## Frontend Implementation

### Authentication Context

```typescript
// src/contexts/AuthContext.tsx
interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);
  
  const initializeAuth = async () => {
    try {
      const token = getStoredToken();
      if (token) {
        const user = await apiClient.getMe();
        setUser(user);
      }
    } catch (error) {
      // Token invalid, clear it
      clearStoredToken();
    } finally {
      setIsLoading(false);
    }
  };
  
  const login = () => {
    // Open Google OAuth popup
    openOAuthPopup();
  };
  
  const logout = async () => {
    await apiClient.logout();
    setUser(null);
    clearStoredToken();
  };
  
  return (
    <AuthContext.Provider value={{user, isLoading, isAuthenticated: !!user, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Team Management Hooks

```typescript
// src/hooks/useTeams.ts
export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => apiClient.getTeams(),
    enabled: !!useAuth().isAuthenticated,
  });
}

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: ['teams', teamId],
    queryFn: () => apiClient.getTeam(teamId),
    enabled: !!teamId,
  });
}

export function useTeamRoster(teamId: string) {
  return useQuery({
    queryKey: ['teams', teamId, 'roster'],
    queryFn: () => apiClient.getTeamRoster(teamId),
    enabled: !!teamId,
  });
}

export function useUpdateRoster() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({teamId, playerId, rosterSlot}: UpdateRosterParams) =>
      apiClient.updatePlayerRoster(teamId, playerId, rosterSlot),
    onSuccess: (_, {teamId}) => {
      queryClient.invalidateQueries(['teams', teamId, 'roster']);
    },
  });
}
```

### Team Dashboard Component Structure

```typescript
// src/app/teams/[teamId]/page.tsx
export default function TeamDashboard() {
  const {teamId} = useParams();
  const {data: team} = useTeam(teamId);
  const {data: roster} = useTeamRoster(teamId);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <TeamHeader team={team} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TeamProjectionsSummary team={team} roster={roster} />
          <StartingLineup roster={roster} onPlayerMove={handlePlayerMove} />
        </div>
        <div>
          <BenchPlayers roster={roster} onPlayerMove={handlePlayerMove} />
          <AddPlayerSection team={team} />
        </div>
      </div>
    </div>
  );
}
```

## Page Structure & Navigation

### New Pages
```
/teams                           # Teams list + create team
/teams/new                       # Create team form
/teams/[teamId]                  # Team dashboard
/teams/[teamId]/roster          # Detailed roster management
/teams/[teamId]/projections     # Team projections analysis
/teams/[teamId]/settings        # Edit team settings
```

### Navigation Updates
```typescript
// Enhanced navigation with authentication state
const navigationItems = [
  {label: 'Players', href: '/players'},
  {label: 'Projections', href: '/projections'},
  {label: 'ROS', href: '/ros'},
  // New authenticated items
  {label: 'My Teams', href: '/teams', authRequired: true},
];
```

## Implementation Phases

### Phase 1: Authentication Infrastructure (Week 1)
1. **Database Setup**
   - Create user management tables
   - Set up Alembic migrations
   - Add refresh token management

2. **Backend Authentication**
   - Google OAuth integration
   - JWT token generation/validation
   - Authentication middleware
   - Auth endpoints implementation

3. **Frontend Authentication**
   - OAuth popup implementation
   - Authentication context
   - Token management
   - Login/logout UI components

### Phase 2: Team Management Core (Week 2)
1. **Database Schema**
   - Create team management tables
   - Position eligibility setup
   - Team roster relationship

2. **Backend Team APIs**
   - Team CRUD operations
   - Roster management endpoints
   - Position validation service
   - Authorization checks

3. **Frontend Team Management**
   - Team list page
   - Create team form
   - Basic team dashboard
   - Team navigation

### Phase 3: Team Building Features (Week 3)
1. **Roster Management**
   - Player selection interface
   - Drag & drop roster management
   - Position validation UI
   - Available slots display

2. **Team Projections**
   - Team-specific projection views
   - Roster optimization suggestions
   - Performance comparisons
   - Enhanced dashboard

3. **Polish & Enhancement**
   - Mobile responsiveness
   - Loading states
   - Error handling
   - Performance optimization

## Security Considerations

### Authentication Security
- Secure token storage (httpOnly cookies for refresh tokens)
- Token rotation on refresh
- CSRF protection for authenticated endpoints
- Rate limiting on auth endpoints

### Authorization
- User-specific data isolation
- Team ownership validation
- SQL injection prevention
- Input validation and sanitization

### Data Privacy
- Minimal user data collection
- Secure OAuth implementation
- No sensitive data in JWT payloads
- Regular security dependency updates

## Performance Considerations

### Database Performance
- Proper indexing on frequently queried columns
- Efficient roster queries with JOINs
- Connection pooling optimization
- Query result caching where appropriate

### Frontend Performance
- Optimistic updates for roster changes
- React Query caching strategies
- Lazy loading for large roster views
- Debounced search/filter inputs

### API Performance
- Response caching for static data
- Pagination for large team lists
- Efficient JSON serialization
- Background token refresh

## Testing Strategy

### Backend Testing
- Unit tests for authentication logic
- Integration tests for team APIs
- Roster validation test coverage
- OAuth flow testing

### Frontend Testing
- Component testing with React Testing Library
- Authentication flow testing
- Roster management interaction tests
- Error state handling tests

### End-to-End Testing
- Complete user registration flow
- Team creation and management
- Roster building scenarios
- Cross-browser compatibility

## Deployment Considerations

### Environment Variables
```bash
# Authentication
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
JWT_SECRET_KEY=xxx
JWT_REFRESH_SECRET_KEY=xxx

# Token Configuration
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
```

### Database Migrations
- Automated migration deployment
- Rollback procedures
- Data migration validation
- Production deployment checklist

This comprehensive design document serves as the blueprint for implementing authentication and team building features in the Fantasy Dashboard application. Each phase builds upon the previous, ensuring a stable and scalable implementation.
