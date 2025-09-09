import { useQuery } from '@tanstack/react-query'
import { apiClient } from './api-client'
import { ActualPointsItem } from './api-types'
import { getOccurredWeeks } from './nfl-utils'

interface PlayerActualPointsResult {
  actualDataMap: Map<number, number>
  isLoading: boolean
  error: any
}

/**
 * Custom hook to fetch actual points for a player across all occurred weeks
 */
export function usePlayerActualPoints(
  playerId: string,
  season: number,
  scoring: string = 'ppr'
): PlayerActualPointsResult {
  const occurredWeeks = getOccurredWeeks(season)

  const { data, isLoading, error } = useQuery({
    queryKey: ['player-actual-points', playerId, season, scoring, occurredWeeks],
    queryFn: async () => {
      try {
        // Use bulk endpoint to get all actual points for the player
        const result = await apiClient.getPlayerSeasonActualPoints(playerId, season, {
          scoring,
          week_start: 1,
          week_end: Math.max(...occurredWeeks, 1), // Use the highest occurred week as end
        })

        // Create a map of week -> actual points for this specific player
        const actualDataMap = new Map<number, number>()

        if (result && result.items) {
          result.items.forEach((item: ActualPointsItem) => {
            // Only include weeks that have actually occurred
            if (
              occurredWeeks.includes(item.week) &&
              item.actual_points !== null &&
              item.actual_points !== undefined
            ) {
              actualDataMap.set(item.week, item.actual_points)
            }
          })
        }

        return actualDataMap
      } catch (error) {
        console.error(
          'Error fetching bulk actual points, falling back to individual requests:',
          error
        )

        // Fallback to original approach if bulk endpoint fails
        const promises = occurredWeeks.map((week) =>
          apiClient.getActualPoints(season, week, {
            limit: 1000,
            scoring,
          })
        )

        const results = await Promise.all(promises)
        const actualDataMap = new Map<number, number>()

        results.forEach((result, index) => {
          const week = occurredWeeks[index]
          if (result && result.items) {
            const playerData = result.items.find(
              (item: ActualPointsItem) => item.player_id === playerId
            )
            if (
              playerData &&
              playerData.actual_points !== null &&
              playerData.actual_points !== undefined
            ) {
              actualDataMap.set(week, playerData.actual_points)
            }
          }
        })

        return actualDataMap
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData,
    enabled: !!playerId && occurredWeeks.length > 0,
  })

  return {
    actualDataMap: data || new Map(),
    isLoading,
    error,
  }
}
