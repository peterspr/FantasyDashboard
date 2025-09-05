import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import { useAuth } from './auth-context';
import type {
  TeamResponse,
  CreateTeamRequest,
  UpdateTeamRequest,
  TeamRosterResponse,
  AddPlayerRequest,
  UpdateRosterRequest,
} from './api-types';

// Team management hooks
export function useTeams() {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => apiClient.getTeams(),
    enabled: isAuthenticated,
  });
}

export function useTeam(teamId: string) {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['teams', teamId],
    queryFn: () => apiClient.getTeam(teamId),
    enabled: isAuthenticated && !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: CreateTeamRequest) => apiClient.createTeam(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ teamId, request }: { teamId: string; request: UpdateTeamRequest }) =>
      apiClient.updateTeam(teamId, request),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (teamId: string) => apiClient.deleteTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

// Roster management hooks
export function useTeamRoster(teamId: string) {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['teams', teamId, 'roster'],
    queryFn: () => apiClient.getTeamRoster(teamId),
    enabled: isAuthenticated && !!teamId,
  });
}

export function useAddPlayerToRoster() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ teamId, request }: { teamId: string; request: AddPlayerRequest }) =>
      apiClient.addPlayerToRoster(teamId, request),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId, 'roster'] });
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] }); // Update roster count
    },
  });
}

export function useUpdatePlayerRoster() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ teamId, playerId, request }: { 
      teamId: string; 
      playerId: string; 
      request: UpdateRosterRequest 
    }) => apiClient.updatePlayerRoster(teamId, playerId, request),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId, 'roster'] });
    },
  });
}

export function useRemovePlayerFromRoster() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ teamId, playerId }: { teamId: string; playerId: string }) =>
      apiClient.removePlayerFromRoster(teamId, playerId),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId, 'roster'] });
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] }); // Update roster count
    },
  });
}