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

// Meta Types
export interface MetaResponse {
  service: string;
  version: string;
  env: string;
}

export interface HealthResponse {
  status: string;
}