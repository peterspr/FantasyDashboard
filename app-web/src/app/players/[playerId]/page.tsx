'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { usePlayerUsage, usePlayers } from '@/lib/queries';
import { apiClient } from '@/lib/api-client';
import { PlayersList } from '@/lib/api-types';
import { UsageChart } from '@/components/UsageChart';
import { ProjectionChart } from '@/components/ProjectionChart';
import { PlayerDetailSkeleton } from '@/components/LoadingSkeleton';
import { usePlayerActualPoints } from '@/lib/use-player-actual-points';
import { getCurrentNFLWeek, hasNFLWeekOccurred } from '@/lib/nfl-utils';

export default function PlayerDetailPage() {
  const params = useParams();
  const playerId = params.playerId as string;
  
  const [season, setSeason] = useState(2024);
  
  // Get current NFL week for the selected season
  const currentNFLWeek = getCurrentNFLWeek();
  const currentWeekForSeason = season === currentNFLWeek.season ? currentNFLWeek.week : undefined;
  
  // Check if this is a defense player by ID pattern
  const isDefensePlayer = playerId.endsWith('_DST');
  
  const { data: usageData, isLoading: usageLoading } = usePlayerUsage(
    season,
    playerId,
    {},
    !isDefensePlayer && season <= 2024 // Only fetch usage data for non-defense players and seasons with usage data
  );

  // Get player info from players list (simplified - in real app might have dedicated endpoint)
  const { data: playersData } = usePlayers({ 
    search: isDefensePlayer 
      ? `${playerId.replace('_DST', '')} Defense` // For DST, search by team name + Defense
      : playerId.includes('-') ? undefined : playerId 
  });

  // Get all weekly projections for the entire season by fetching multiple weeks
  // Create a custom hook that fetches all weeks for this player
  const { data: allProjectionsData, isLoading: allProjectionsLoading } = useQuery({
    queryKey: ['player-all-projections', season, playerId],
    queryFn: async () => {
      // Fetch projections for all 18 weeks in parallel
      const promises = Array.from({ length: 18 }, (_, i) => i + 1).map(week =>
        apiClient.getWeeklyProjections(season, week, {
          search: isDefensePlayer 
            ? `${playerId.replace('_DST', '')} Defense`
            : playerId,
          limit: 10 // Small limit since we're searching for a specific player
        }).catch(() => ({ items: [] })) // Handle errors gracefully
      );
      
      const results = await Promise.all(promises);
      
      // Combine all results into a single list
      const allItems = results.flatMap((result, index) => {
        const week = index + 1;
        // Find the player in this week's results
        const playerData = result.items?.find(item => item.player_id === playerId);
        return playerData ? [{ ...playerData, week }] : [];
      });
      
      return { items: allItems };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!playerId && season > 0,
  });
  
  const player = (playersData as PlayersList)?.items?.find((p) => p.player_id === playerId) || 
    usageData?.items?.[0] ||
    allProjectionsData?.items?.[0]; // Use first result from player_id search

  // Use the dynamic hook to fetch actual points for all occurred weeks
  const { actualDataMap } = usePlayerActualPoints(playerId, season, 'ppr');

  // Check if this is a defense player
  const isDefense = player?.position === 'DST';
  
  // For defenses, use the already fetched projection data
  const defenseProjectionData = isDefense ? allProjectionsData : null;

  if ((!isDefensePlayer && usageLoading && !usageData) || (allProjectionsLoading && !allProjectionsData)) {
    return <PlayerDetailSkeleton />;
  }

  if (!player && (!isDefensePlayer ? !usageLoading : true) && !allProjectionsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Player Not Found</h2>
          <p className="text-gray-600">
            Could not find data for player ID: {playerId}
          </p>
        </div>
      </div>
    );
  }

  // Combine projection data with actual data for all 18 weeks
  // Create complete projection data for all weeks (1-18)
  const createCompleteProjectionData = () => {
    // If we have usage data, prioritize it for weeks that have data
    const usageMap = new Map((usageData?.items || []).map(item => [item.week, item]));
    
    // Create map from all projections data 
    const projectionMap = new Map((allProjectionsData?.items || []).map(item => [item.week, item]));
    
    const projectionData = [];
    
    // Create data for all 18 weeks
    for (let week = 1; week <= 18; week++) {
      const usageItem = usageMap.get(week);
      const projectionItem = projectionMap.get(week);
      
      // Prefer usage data if available, otherwise use projection data
      const dataSource = usageItem || projectionItem;
      
      if (dataSource) {
        // Only include actual data if the week has actually occurred
        const hasOccurred = hasNFLWeekOccurred(season, week);
        const actualValue = hasOccurred ? actualDataMap.get(week) : undefined;
        
        projectionData.push({
          week: week,
          proj: dataSource.proj || 0,
          low: dataSource.low || 0,
          high: dataSource.high || 0,
          actual: actualValue, // Only add actual if the week has occurred AND data exists
        });
        
      }
    }
    
    return projectionData;
  };
  
  const projectionData = createCompleteProjectionData();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            {player?.name || (usageLoading ? 'Loading...' : 'Player Name Unavailable')}
          </h1>
          
          {/* Season Filter */}
          <div className="flex items-center space-x-2">
            <label htmlFor="season-select" className="text-sm font-medium text-gray-700">
              Season:
            </label>
            <select
              id="season-select"
              value={season}
              onChange={(e) => setSeason(Number(e.target.value))}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-gray-600">
          <span className="font-medium">{player?.position}</span>
          <span>•</span>
          <span>{player?.team}</span>
          <span>•</span>
          <span>{season} Season</span>
        </div>
      </div>

      <div className="space-y-8">
        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weekly Projections Chart */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <ProjectionChart
              data={projectionData}
              title="Weekly Projections"
              showUncertainty={true}
              currentWeek={currentWeekForSeason}
            />
          </div>

          {/* Usage/Performance Trends Chart */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            {isDefense ? (
              // Defense-specific chart showing defensive performance metrics
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Defense Performance</h3>
                <p className="text-gray-600 text-sm">
                  Defense performance metrics would show sacks, interceptions, points allowed trends
                </p>
                {/* TODO: Implement defense-specific chart component */}
              </div>
            ) : (
              <UsageChart
                data={usageData?.items || []}
                title="Usage Trends"
                metrics={['snap_pct', 'target_share']}
              />
            )}
          </div>
        </div>

        {/* Detailed Usage/Performance Chart */}
        {!isDefense && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <UsageChart
              data={usageData?.items || []}
              title="Usage & Volume Trends"
              metrics={['snap_pct', 'route_pct', 'target_share']}
              showVolume={true}
            />
          </div>
        )}

        {/* Weekly Stats Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Weekly Statistics</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Week
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projection
                  </th>
                  {isDefense ? (
                    // Defense-specific columns
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points Allowed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sacks
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Interceptions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fumble Rec
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Def TDs
                      </th>
                    </>
                  ) : (
                    // Offensive player columns
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Snap %
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Route %
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Target Share
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Targets
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Routes
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isDefense ? (
                  // Defense stats rows
                  defenseProjectionData?.items?.map((item) => {
                    const components = item.components || {};
                    return (
                      <tr key={item.week} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.week}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                          {item.proj ? item.proj.toFixed(1) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {components.points_allowed_proj ? components.points_allowed_proj.toFixed(1) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {components.sacks_proj ? components.sacks_proj.toFixed(1) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {components.interceptions_proj ? components.interceptions_proj.toFixed(1) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {components.fumble_recoveries_proj ? components.fumble_recoveries_proj.toFixed(1) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {components.def_tds_proj ? components.def_tds_proj.toFixed(2) : '-'}
                        </td>
                      </tr>
                    );
                  }) || []
                ) : (
                  // Offensive player stats rows
                  usageData?.items.map((item) => (
                    <tr key={item.week} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.week}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                        {item.proj ? item.proj.toFixed(1) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(item.snap_pct !== null && item.snap_pct !== undefined) ? (item.snap_pct * 100).toFixed(1) + '%' : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(item.route_pct !== null && item.route_pct !== undefined) ? (item.route_pct * 100).toFixed(1) + '%' : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.target_share ? (item.target_share * 100).toFixed(1) + '%' : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.targets || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(item.routes !== null && item.routes !== undefined && item.routes !== 0) ? item.routes : '-'}
                      </td>
                    </tr>
                  )) || []
                )}
              </tbody>
            </table>
          </div>

          {((isDefense && (!defenseProjectionData?.items || defenseProjectionData.items.length === 0)) ||
            (!isDefense && (!usageData?.items || usageData.items.length === 0))) && (
            <div className="text-center py-8 text-gray-500">
              {isDefense ? 'No defense statistics available for this player' : 'No usage data available for this player'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}