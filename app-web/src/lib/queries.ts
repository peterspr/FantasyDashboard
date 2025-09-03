import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import {
  PlayersParams,
  ProjectionsParams,
  ROSParams,
  UsageParams,
  ScoringPreviewRequest,
} from './api-types';

// Query Keys
export const queryKeys = {
  health: ['health'] as const,
  meta: ['meta'] as const,
  players: (params: PlayersParams) => ['players', params] as const,
  projections: (season: number, week: number, params: ProjectionsParams) => 
    ['projections', season, week, params] as const,
  ros: (season: number, params: ROSParams) => ['ros', season, params] as const,
  usage: (season: number, playerId: string, params: UsageParams) => 
    ['usage', season, playerId, params] as const,
  scoringPresets: ['scoring', 'presets'] as const,
};

// Health and Meta
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiClient.getHealth(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useMeta() {
  return useQuery({
    queryKey: queryKeys.meta,
    queryFn: () => apiClient.getMeta(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Players
export function usePlayers(params: PlayersParams = {}) {
  return useQuery({
    queryKey: queryKeys.players(params),
    queryFn: () => apiClient.getPlayers(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
  });
}

// Projections
export function useWeeklyProjections(
  season: number,
  week: number,
  params: ProjectionsParams = {}
) {
  return useQuery({
    queryKey: queryKeys.projections(season, week, params),
    queryFn: () => apiClient.getWeeklyProjections(season, week, params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
    enabled: season > 0 && week > 0,
  });
}

// Rest of Season
export function useROSProjections(season: number, params: ROSParams = {}) {
  return useQuery({
    queryKey: queryKeys.ros(season, params),
    queryFn: () => apiClient.getROSProjections(season, params),
    staleTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData,
    enabled: season > 0,
  });
}

// Usage
export function usePlayerUsage(
  season: number,
  playerId: string,
  params: UsageParams = {}
) {
  return useQuery({
    queryKey: queryKeys.usage(season, playerId, params),
    queryFn: () => apiClient.getPlayerUsage(season, playerId, params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: season > 0 && !!playerId,
  });
}

// Scoring
export function useScoringPresets() {
  return useQuery({
    queryKey: queryKeys.scoringPresets,
    queryFn: () => apiClient.getScoringPresets(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useCustomScoringPreview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ScoringPreviewRequest) =>
      apiClient.previewCustomScoring(request),
    onSuccess: () => {
      // Invalidate related queries if needed
      queryClient.invalidateQueries({ queryKey: ['scoring', 'preview'] });
    },
  });
}

// Utility hooks
export function useInvalidateProjections() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['projections'] });
    queryClient.invalidateQueries({ queryKey: ['ros'] });
  };
}

export function useInvalidateAll() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries();
  };
}