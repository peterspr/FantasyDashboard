import {
  PlayersList,
  ProjectionList,
  ROSList,
  UsageList,
  ActualPointsList,
  ScoringPreviewRequest,
  ScoringPresetsResponse,
  MetaResponse,
  HealthResponse,
  PlayersParams,
  ProjectionsParams,
  ROSParams,
  UsageParams,
  ActualParams,
  // Authentication types
  UserProfile,
  AuthTokens,
  GoogleLoginRequest,
  // Team management types
  TeamResponse,
  CreateTeamRequest,
  UpdateTeamRequest,
  TeamRosterResponse,
  AddPlayerRequest,
  UpdateRosterRequest,
} from './api-types';

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Add authorization header if token exists
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }
    
    const config: RequestInit = {
      headers,
      credentials: 'include', // Include cookies for CORS
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || 
        errorData.message || 
        `HTTP error! status: ${response.status}`
      );
    }

    return response.json();
  }

  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  // Health and Meta
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  async getMeta(): Promise<MetaResponse> {
    return this.request<MetaResponse>('/v1/meta');
  }

  // Players
  async getPlayers(params: PlayersParams = {}): Promise<PlayersList> {
    const queryString = this.buildQueryString(params);
    return this.request<PlayersList>(`/v1/players${queryString}`);
  }

  // Projections
  async getWeeklyProjections(
    season: number,
    week: number,
    params: ProjectionsParams = {}
  ): Promise<ProjectionList> {
    const queryString = this.buildQueryString(params);
    return this.request<ProjectionList>(`/v1/projections/${season}/${week}${queryString}`);
  }

  // Rest of Season
  async getROSProjections(
    season: number,
    params: ROSParams = {}
  ): Promise<ROSList> {
    const queryString = this.buildQueryString(params);
    return this.request<ROSList>(`/v1/ros/${season}${queryString}`);
  }

  // Usage
  async getPlayerUsage(
    season: number,
    playerId: string,
    params: UsageParams = {}
  ): Promise<UsageList> {
    const queryString = this.buildQueryString(params);
    return this.request<UsageList>(`/v1/usage/${season}/${playerId}${queryString}`);
  }

  // Actual Points
  async getActualPoints(
    season: number,
    week: number,
    params: ActualParams = {}
  ): Promise<ActualPointsList> {
    const queryString = this.buildQueryString(params);
    return this.request<ActualPointsList>(`/v1/actual/${season}/${week}${queryString}`);
  }

  // Scoring
  async previewCustomScoring(request: ScoringPreviewRequest): Promise<ProjectionList> {
    return this.request<ProjectionList>('/v1/scoring/preview', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getScoringPresets(): Promise<ScoringPresetsResponse> {
    return this.request<ScoringPresetsResponse>('/v1/scoring/presets');
  }

  // Authentication
  async loginWithGoogle(idToken: string): Promise<AuthTokens> {
    const request: GoogleLoginRequest = { id_token: idToken };
    return this.request<AuthTokens>('/auth/google/login', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async refreshToken(): Promise<AuthTokens> {
    return this.request<AuthTokens>('/auth/refresh', {
      method: 'POST',
    });
  }

  async logout(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser(): Promise<UserProfile> {
    return this.request<UserProfile>('/auth/me');
  }

  // Team Management
  async getTeams(): Promise<TeamResponse[]> {
    return this.request<TeamResponse[]>('/teams');
  }

  async createTeam(request: CreateTeamRequest): Promise<TeamResponse> {
    return this.request<TeamResponse>('/teams', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getTeam(teamId: string): Promise<TeamResponse> {
    return this.request<TeamResponse>(`/teams/${teamId}`);
  }

  async updateTeam(teamId: string, request: UpdateTeamRequest): Promise<TeamResponse> {
    return this.request<TeamResponse>(`/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async deleteTeam(teamId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/teams/${teamId}`, {
      method: 'DELETE',
    });
  }

  // Roster Management
  async getTeamRoster(teamId: string): Promise<TeamRosterResponse> {
    return this.request<TeamRosterResponse>(`/teams/${teamId}/roster`);
  }

  async addPlayerToRoster(teamId: string, request: AddPlayerRequest): Promise<any> {
    return this.request<any>(`/teams/${teamId}/roster`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updatePlayerRoster(teamId: string, playerId: string, request: UpdateRosterRequest): Promise<any> {
    return this.request<any>(`/teams/${teamId}/roster/${playerId}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async removePlayerFromRoster(teamId: string, playerId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/teams/${teamId}/roster/${playerId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();