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
} from './api-types';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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
}

export const apiClient = new ApiClient();