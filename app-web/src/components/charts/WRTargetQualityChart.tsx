'use client';

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatNumber, formatPercentage } from '@/lib/utils';

interface WRDataPoint {
  week: number;
  target_share: number;
  air_yards_per_target: number;
  targets_pred: number;
  red_zone_target_share?: number;
  size: number; // For bubble size
  color: string; // For color coding
}

interface WRTargetQualityChartProps {
  data: any[];
  usageData?: any[];
  title?: string;
}

export function WRTargetQualityChart({
  data,
  usageData = [],
  title = "Target Quality & Volume",
}: WRTargetQualityChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No WR data available
      </div>
    );
  }

  // Create usage data map for easier lookup
  const usageMap = new Map(usageData.map(item => [item.week, item]));

  // Transform data for the chart
  const chartData: WRDataPoint[] = data.map(item => {
    const components = item.components || {};
    const week = item.week;
    const usage = usageMap.get(week);

    const targets = components.targets_pred || 0;
    const targetShare = usage?.target_share || 0;
    
    // Estimate air yards per target (would need actual data for this)
    // For now, we'll use receiving yards / receptions as a proxy
    const recYards = components.rec_yds_pred || 0;
    const receptions = components.rec_pred || 0;
    const airYardsPerTarget = receptions > 0 ? (recYards / receptions) * 1.2 : 8; // Rough estimate

    // Color code by TD potential (higher = more red zone looks)
    const tdPred = components.rec_td_pred || 0;
    const color = tdPred > 0.6 ? '#dc2626' : tdPred > 0.3 ? '#f59e0b' : '#3b82f6';

    return {
      week,
      target_share: targetShare,
      air_yards_per_target: airYardsPerTarget,
      targets_pred: targets,
      red_zone_target_share: usage?.red_zone_target_share,
      size: Math.max(targets * 3, 30), // Bubble size based on target volume
      color,
    };
  });

  // Calculate averages for reference lines
  const avgTargetShare = chartData.reduce((sum, d) => sum + d.target_share, 0) / chartData.length;
  const avgAirYards = chartData.reduce((sum, d) => sum + d.air_yards_per_target, 0) / chartData.length;

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          
          <XAxis
            dataKey="target_share"
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => formatPercentage(value)}
            domain={[0, 'dataMax']}
          />
          
          <YAxis
            dataKey="air_yards_per_target"
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => formatNumber(value, 1)}
            domain={['dataMin', 'dataMax']}
          />
          
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as WRDataPoint;
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900">Week {data.week}</p>
                    <div className="space-y-1 mt-2">
                      <p className="text-blue-600">
                        Target Share: {formatPercentage(data.target_share)}
                      </p>
                      <p className="text-green-600">
                        Air Yards/Target: {formatNumber(data.air_yards_per_target, 1)}
                      </p>
                      <p className="text-purple-600">
                        Projected Targets: {formatNumber(data.targets_pred, 0)}
                      </p>
                      {data.red_zone_target_share !== undefined && (
                        <p className="text-red-600">
                          RZ Target Share: {formatPercentage(data.red_zone_target_share)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />

          {/* Reference lines for averages */}
          <ReferenceLine
            x={avgTargetShare}
            stroke="#9ca3af"
            strokeDasharray="3 3"
            label={{ value: "Avg Target Share", position: "top" }}
          />
          
          <ReferenceLine
            y={avgAirYards}
            stroke="#9ca3af"
            strokeDasharray="3 3"
            label={{ value: "Avg Air Yards", position: "top" }}
          />

          <Scatter
            dataKey="air_yards_per_target"
            fill="#3b82f6"
          >
            {chartData.map((entry, index) => (
              <Scatter
                key={index}
                cx={entry.target_share * 100} // Convert to percentage scale
                cy={entry.air_yards_per_target}
                r={Math.sqrt(entry.size)}
                fill={entry.color}
                fillOpacity={0.7}
                stroke={entry.color}
                strokeWidth={2}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="space-y-1 text-gray-500">
          <p>• Bubble size = Target volume</p>
          <p>• Higher target share = more volume</p>
          <p>• Higher air yards = big play potential</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-xs">Low TD rate (&lt;0.3)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span className="text-xs">Medium TD rate (0.3-0.6)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span className="text-xs">High TD rate (&gt;0.6)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
