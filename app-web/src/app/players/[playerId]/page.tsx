'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { usePlayerUsage, usePlayers } from '@/lib/queries';
import { PlayersList } from '@/lib/api-types';
import { UsageChart } from '@/components/UsageChart';
import { ProjectionChart } from '@/components/ProjectionChart';
import { PlayerDetailSkeleton } from '@/components/LoadingSkeleton';

export default function PlayerDetailPage() {
  const params = useParams();
  const playerId = params.playerId as string;
  
  const [season] = useState(2024);
  
  const { data: usageData, isLoading: usageLoading } = usePlayerUsage(
    season,
    playerId
  );

  // Get player info from players list (simplified - in real app might have dedicated endpoint)
  const { data: playersData } = usePlayers({ 
    search: playerId.includes('-') ? undefined : playerId 
  });
  
  const player = (playersData as PlayersList)?.items?.find((p) => p.player_id === playerId) || 
    usageData?.items?.[0];

  if (usageLoading && !usageData) {
    return <PlayerDetailSkeleton />;
  }

  if (!player && !usageLoading) {
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

  const projectionData = usageData?.items.map(item => ({
    week: item.week,
    proj: item.proj || 0,
    low: item.low || 0,
    high: item.high || 0,
  })) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {player?.name || 'Loading...'}
        </h1>
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
              currentWeek={10}
            />
          </div>

          {/* Usage Trends Chart */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <UsageChart
              data={usageData?.items || []}
              title="Usage Trends"
              metrics={['snap_pct', 'target_share']}
            />
          </div>
        </div>

        {/* Detailed Usage Chart with Volume */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <UsageChart
            data={usageData?.items || []}
            title="Usage & Volume Trends"
            metrics={['snap_pct', 'route_pct', 'target_share']}
            showVolume={true}
          />
        </div>

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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usageData?.items.map((item) => (
                  <tr key={item.week} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.week}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                      {item.proj ? item.proj.toFixed(1) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.snap_pct ? (item.snap_pct * 100).toFixed(1) + '%' : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.route_pct ? (item.route_pct * 100).toFixed(1) + '%' : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.target_share ? (item.target_share * 100).toFixed(1) + '%' : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.targets || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.routes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!usageData?.items || usageData.items.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No usage data available for this player
            </div>
          )}
        </div>
      </div>
    </div>
  );
}