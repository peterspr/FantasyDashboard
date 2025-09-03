'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatPercentage, formatNumber } from '@/lib/utils';

interface UsageDataPoint {
  week: number;
  snap_pct?: number;
  route_pct?: number;
  target_share?: number;
  rush_share?: number;
  routes?: number;
  targets?: number;
  rush_att?: number;
}

interface UsageChartProps {
  data: UsageDataPoint[];
  title?: string;
  metrics?: ('snap_pct' | 'route_pct' | 'target_share' | 'rush_share')[];
  showVolume?: boolean;
}

export function UsageChart({
  data,
  title = "Usage Trends",
  metrics = ['snap_pct', 'target_share'],
  showVolume = false,
}: UsageChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No usage data available
      </div>
    );
  }

  const metricConfig = {
    snap_pct: { color: '#3b82f6', name: 'Snap %' },
    route_pct: { color: '#06b6d4', name: 'Route %' },
    target_share: { color: '#10b981', name: 'Target Share' },
    rush_share: { color: '#f59e0b', name: 'Rush Share' },
  };

  const volumeConfig = {
    routes: { color: '#8b5cf6', name: 'Routes' },
    targets: { color: '#ec4899', name: 'Targets' },
    rush_att: { color: '#ef4444', name: 'Rush Attempts' },
  };

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          
          <XAxis
            dataKey="week"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          
          <YAxis
            yAxisId="percentage"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => formatPercentage(value)}
            domain={[0, 1]}
          />

          {showVolume && (
            <YAxis
              yAxisId="volume"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(value) => formatNumber(value, 0)}
            />
          )}
          
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900">Week {label}</p>
                    <div className="space-y-1 mt-2">
                      {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                          {entry.name}: {
                            ['snap_pct', 'route_pct', 'target_share', 'rush_share'].includes(entry.dataKey as string)
                              ? formatPercentage(entry.value as number)
                              : formatNumber(entry.value as number, 0)
                          }
                        </p>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />

          <Legend />

          {metrics.map((metric) => (
            <Line
              key={metric}
              yAxisId="percentage"
              type="monotone"
              dataKey={metric}
              stroke={metricConfig[metric].color}
              strokeWidth={2}
              name={metricConfig[metric].name}
              connectNulls={false}
              dot={{ r: 4 }}
            />
          ))}

          {showVolume && (
            <>
              <Line
                yAxisId="volume"
                type="monotone"
                dataKey="routes"
                stroke={volumeConfig.routes.color}
                strokeWidth={2}
                strokeDasharray="5 5"
                name={volumeConfig.routes.name}
                connectNulls={false}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="volume"
                type="monotone"
                dataKey="targets"
                stroke={volumeConfig.targets.color}
                strokeWidth={2}
                strokeDasharray="5 5"
                name={volumeConfig.targets.name}
                connectNulls={false}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="volume"
                type="monotone"
                dataKey="rush_att"
                stroke={volumeConfig.rush_att.color}
                strokeWidth={2}
                strokeDasharray="5 5"
                name={volumeConfig.rush_att.name}
                connectNulls={false}
                dot={{ r: 3 }}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}