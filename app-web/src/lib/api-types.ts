// API Response Types
export interface PlayerOut {
  player_id: string;
  name: string;
  team?: string;
  position?: string;
}

export interface ProjectionItem {
  player_id: string;
  name: string;
  team?: string;
  position?: string;
  scoring: string;
  proj: number;
  low: number;
  high: number;
  components: Record<string, any>;
  season: number;
  week: number;
}

export interface ROSItem {
  player_id: string;
  name: string;
  team?: string;
  position?: string;
  scoring: string;
  proj_total: number;
  low: number;
  high: number;
  per_week_json?: Array<Record<string, any>>;
  weeks_remaining?: number;
}

export interface UsageWeeklyItem {
  season: number;
  week: number;
  player_id: string;
  name?: string;
  team?: string;
  position?: string;
  snap_pct?: number;
  route_pct?: number;
  target_share?: number;
  rush_share?: number;
  routes?: number;
  targets?: number;
  rush_att?: number;
  proj?: number;
  low?: number;
  high?: number;
}

// API Response Lists
export interface PlayersList {
  items: PlayerOut[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProjectionList {
  season: number;
  week: number;
  scoring: string;
  items: ProjectionItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ROSList {
  season: number;
  scoring: string;
  items: ROSItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface UsageList {
  season: number;
  player_id: string;
  items: UsageWeeklyItem[];
  total: number;
}

// Request Types
export interface ScoringPreviewRequest {
  season: number;
  week: number;
  scoring: Record<string, number>;
  filters: {
    position?: string;
    team?: string;
    search?: string;
  };
  limit: number;
  offset: number;
}

export interface ScoringPresetsResponse {
  presets: Record<string, Record<string, number>>;
}

// Query Parameters
export interface PlayersParams {
  search?: string;
  position?: string;
  team?: string;
  limit?: number;
  offset?: number;
}

export interface ProjectionsParams {
  scoring?: string;
  search?: string;
  position?: string;
  team?: string;
  sort_by?: string;
  sort_desc?: boolean;
  limit?: number;
  offset?: number;
}

export interface ROSParams {
  scoring?: string;
  search?: string;
  position?: string;
  team?: string;
  sort_by?: string;
  sort_desc?: boolean;
  limit?: number;
  offset?: number;
}

export interface UsageParams {
  weeks?: string;
}

export interface ActualPointsItem {
  player_id: string;
  name: string;
  team?: string;
  position?: string;
  scoring: string;
  actual_points: number;
  season: number;
  week: number;
}

export interface ActualPointsList {
  season: number;
  week: number;
  scoring: string;
  items: ActualPointsItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ActualParams {
  scoring?: string;
  search?: string;
  position?: string;
  team?: string;
  sort_by?: string;
  sort_desc?: boolean;
  limit?: number;
  offset?: number;
}

// Meta Types
export interface MetaResponse {
  service: string;
  version: string;
  env: string;
}

export interface HealthResponse {
  status: string;
}

// Authentication types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface GoogleLoginRequest {
  id_token: string;
}

// Team management types
export interface RosterPositions {
  starters: Record<string, number>;
  bench: number;
  ir?: number;
}

export interface CreateTeamRequest {
  name: string;
  league_name?: string;
  scoring_system: 'ppr' | 'half_ppr' | 'standard';
  league_size: number;
  roster_positions: RosterPositions;
}

export interface UpdateTeamRequest {
  name?: string;
  league_name?: string;
  scoring_system?: 'ppr' | 'half_ppr' | 'standard';
  league_size?: number;
  roster_positions?: RosterPositions;
}

export interface TeamResponse {
  id: string;
  name: string;
  league_name?: string;
  scoring_system: string;
  league_size: number;
  roster_positions: Record<string, any>;
  created_at: string;
  updated_at: string;
  roster_count: number;
}

export interface RosterSlot {
  type: 'starter' | 'bench' | 'ir';
  position?: string;
  index: number;
}

export interface RosterPlayerResponse {
  player_id: string;
  roster_slot: RosterSlot;
  added_at: string;
  player_info?: Record<string, any>;
}

export interface TeamRosterResponse {
  team_id: string;
  players: RosterPlayerResponse[];
  available_slots: RosterSlot[];
}

export interface AddPlayerRequest {
  player_id: string;
  player_position: string;
  roster_slot: RosterSlot;
}

export interface UpdateRosterRequest {
  roster_slot: RosterSlot;
}