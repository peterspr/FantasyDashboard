'use client';

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatNumber } from '@/lib/utils';

interface DSTDataPoint {
  week: number;
  sacks_proj?: number;
  interceptions_proj?: number;
  fumble_recoveries_proj?: number;
  def_tds_proj?: number;
  points_allowed_proj?: number;
  fantasy_points_from_turnovers?: number;
  fantasy_points_from_pressure?: number;
}

interface DSTDefensiveImpactChartProps {
  data: any[];
  title?: string;
}

export function DSTDefensiveImpactChart({
  data,
  title = "Defensive Impact Metrics",
}: DSTDefensiveImpactChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No DST data available
      </div>
    );
  }

  // Transform data for the chart
  const chartData: DSTDataPoint[] = data.map(item => {
    const components = item.components || {};
    const week = item.week;

    const sacks = components.sacks_proj || 0;
    const interceptions = components.interceptions_proj || 0;
    const fumbleRec = components.fumble_recoveries_proj || 0;
    const defTds = components.def_tds_proj || 0;

    // Calculate fantasy points from different sources
    const fantasyFromTurnovers = (interceptions * 2) + (fumbleRec * 2) + (defTds * 6);
    const fantasyFromPressure = sacks * 1;

    return {
      week,
      sacks_proj: sacks,
      interceptions_proj: interceptions,
      fumble_recoveries_proj: fumbleRec,
      def_tds_proj: defTds,
      points_allowed_proj: components.points_allowed_proj || 0,
      fantasy_points_from_turnovers: fantasyFromTurnovers,
      fantasy_points_from_pressure: fantasyFromPressure,
    };
  });

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          
          <XAxis
            dataKey="week"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          
          <YAxis
            yAxisId="stats"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => formatNumber(value, 1)}
          />

          <YAxis
            yAxisId="points"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => formatNumber(value, 0)}
          />
          
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = chartData.find(d => d.week === label);
                if (!data) return null;

                return (
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900">Week {label}</p>
                    <div className="space-y-1 mt-2">
                      <div className="border-b pb-1 mb-2">
                        <p className="text-sm font-medium text-gray-700">Defensive Stats</p>
                        <p className="text-blue-600">
                          Sacks: {formatNumber(data.sacks_proj || 0, 1)}
                        </p>
                        <p className="text-green-600">
                          Interceptions: {formatNumber(data.interceptions_proj || 0, 1)}
                        </p>
                        <p className="text-orange-600">
                          Fumble Rec: {formatNumber(data.fumble_recoveries_proj || 0, 1)}
                        </p>
                        <p className="text-purple-600">
                          Def TDs: {formatNumber(data.def_tds_proj || 0, 2)}
                        </p>
                        <p className="text-red-600">
                          Points Allowed: {formatNumber(data.points_allowed_proj || 0, 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Fantasy Impact</p>
                        <p className="text-cyan-600">
                          From Pressure: {formatNumber(data.fantasy_points_from_pressure || 0, 1)} pts
                        </p>
                        <p className="text-pink-600">
                          From Turnovers: {formatNumber(data.fantasy_points_from_turnovers || 0, 1)} pts
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />

          <Legend />

          {/* Defensive stats as bars */}
          <Bar
            yAxisId="stats"
            dataKey="sacks_proj"
            fill="#3b82f6"
            fillOpacity={0.7}
            name="Sacks"
          />

          <Bar
            yAxisId="stats"
            dataKey="interceptions_proj"
            fill="#10b981"
            fillOpacity={0.7}
            name="Interceptions"
          />

          <Bar
            yAxisId="stats"
            dataKey="fumble_recoveries_proj"
            fill="#f59e0b"
            fillOpacity={0.7}
            name="Fumble Recoveries"
          />

          {/* Defensive TDs as line (rare but high impact) */}
          <Line
            yAxisId="stats"
            type="monotone"
            dataKey="def_tds_proj"
            stroke="#8b5cf6"
            strokeWidth={3}
            name="Def TDs"
            dot={{ r: 4, fill: '#8b5cf6' }}
            connectNulls={false}
          />

          {/* Points allowed as line (lower is better) */}
          <Line
            yAxisId="points"
            type="monotone"
            dataKey="points_allowed_proj"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Points Allowed"
            dot={{ r: 3, fill: '#ef4444' }}
            connectNulls={false}
          />

          {/* Fantasy points from turnovers */}
          <Line
            yAxisId="points"
            type="monotone"
            dataKey="fantasy_points_from_turnovers"
            stroke="#ec4899"
            strokeWidth={3}
            name="Fantasy Pts (Turnovers)"
            dot={{ r: 4, fill: '#ec4899' }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Bars show defensive stats (left axis): sacks, interceptions, fumble recoveries</p>
        <p>• Lines show points allowed and fantasy points from turnovers (right axis)</p>
        <p>• Lower points allowed generally correlates with higher DST fantasy scores</p>
        <p>• Turnovers and defensive TDs provide highest fantasy point upside</p>
      </div>
    </div>
  );
}
