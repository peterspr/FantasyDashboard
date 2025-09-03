import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';
import { ActualPointsItem } from './api-types';
import { getOccurredWeeks } from './nfl-utils';

interface PlayerActualPointsResult {
  actualDataMap: Map<number, number>;
  isLoading: boolean;
  error: any;
}

/**
 * Custom hook to fetch actual points for a player across all occurred weeks
 */
export function usePlayerActualPoints(
  playerId: string,
  season: number,
  scoring: string = 'ppr'
): PlayerActualPointsResult {
  
  const occurredWeeks = getOccurredWeeks(season);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['player-actual-points', playerId, season, scoring, occurredWeeks],
    queryFn: async () => {
      // Fetch actual points for all occurred weeks in parallel
      const promises = occurredWeeks.map(week =>
        apiClient.getActualPoints(season, week, {
          limit: 1000, // Get all players to find our target player
          scoring,
        })
      );
      
      const results = await Promise.all(promises);
      
      // Create a map of week -> actual points for this specific player
      const actualDataMap = new Map<number, number>();
      
      results.forEach((result, index) => {
        const week = occurredWeeks[index];
        if (result && result.items) {
          const playerData = result.items.find(
            (item: ActualPointsItem) => item.player_id === playerId
          );
          if (playerData) {
            actualDataMap.set(week, playerData.actual_points);
          }
        }
      });
      
      return actualDataMap;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData,
    enabled: !!playerId && occurredWeeks.length > 0,
  });
  
  return {
    actualDataMap: data || new Map(),
    isLoading,
    error
  };
}