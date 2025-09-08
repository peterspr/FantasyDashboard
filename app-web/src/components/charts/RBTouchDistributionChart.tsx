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
import { formatNumber, formatPercentage } from '@/lib/utils';

interface RBDataPoint {
  week: number;
  rush_att_pred?: number;
  targets_pred?: number;
  total_touches?: number;
  touch_share?: number;
  rush_share?: number;
  target_share?: number;
}

interface RBTouchDistributionChartProps {
  data: any[];
  usageData?: any[];
  title?: string;
}

export function RBTouchDistributionChart({
  data,
  usageData = [],
  title = "Touch Distribution & Share",
}: RBTouchDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No RB data available
      </div>
    );
  }

  // Create usage data map for easier lookup
  const usageMap = new Map(usageData.map(item => [item.week, item]));

  // Transform data for the chart
  const chartData: RBDataPoint[] = data.map(item => {
    const components = item.components || {};
    const week = item.week;
    const usage = usageMap.get(week);

    const rushAtt = components.rush_att_pred || 0;
    const targets = components.targets_pred || 0;
    const totalTouches = rushAtt + targets;

    return {
      week,
      rush_att_pred: rushAtt,
      targets_pred: targets,
      total_touches: totalTouches,
      touch_share: usage?.touch_share || ((usage?.rush_share || 0) + (usage?.target_share || 0)),
      rush_share: usage?.rush_share,
      target_share: usage?.target_share,
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
            yAxisId="volume"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => formatNumber(value, 0)}
          />

          <YAxis
            yAxisId="share"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => formatPercentage(value)}
            domain={[0, 1]}
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
                        <p className="text-sm font-medium text-gray-700">Projected Volume</p>
                        <p className="text-red-600">
                          Rush Attempts: {formatNumber(data.rush_att_pred || 0, 0)}
                        </p>
                        <p className="text-blue-600">
                          Targets: {formatNumber(data.targets_pred || 0, 0)}
                        </p>
                        <p className="text-purple-600 font-semibold">
                          Total Touches: {formatNumber(data.total_touches || 0, 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Team Share</p>
                        {data.rush_share !== undefined && (
                          <p className="text-orange-600">
                            Rush Share: {formatPercentage(data.rush_share)}
                          </p>
                        )}
                        {data.target_share !== undefined && (
                          <p className="text-cyan-600">
                            Target Share: {formatPercentage(data.target_share)}
                          </p>
                        )}
                        {data.touch_share !== undefined && (
                          <p className="text-green-600 font-semibold">
                            Touch Share: {formatPercentage(data.touch_share)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />

          <Legend />

          {/* Rush Attempts - Stacked Bar */}
          <Bar
            yAxisId="volume"
            dataKey="rush_att_pred"
            stackId="touches"
            fill="#ef4444"
            name="Rush Attempts"
          />

          {/* Targets - Stacked Bar */}
          <Bar
            yAxisId="volume"
            dataKey="targets_pred"
            stackId="touches"
            fill="#3b82f6"
            name="Targets"
          />

          {/* Touch Share - Line */}
          <Line
            yAxisId="share"
            type="monotone"
            dataKey="touch_share"
            stroke="#10b981"
            strokeWidth={3}
            name="Touch Share"
            dot={{ r: 4, fill: '#10b981' }}
            connectNulls={false}
          />

          {/* Rush Share - Line */}
          <Line
            yAxisId="share"
            type="monotone"
            dataKey="rush_share"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Rush Share"
            dot={{ r: 3, fill: '#f59e0b' }}
            connectNulls={false}
          />

          {/* Target Share - Line */}
          <Line
            yAxisId="share"
            type="monotone"
            dataKey="target_share"
            stroke="#06b6d4"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Target Share"
            dot={{ r: 3, fill: '#06b6d4' }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Stacked bars show projected rush attempts + targets (left axis)</p>
        <p>• Solid line shows total touch share, dashed lines show individual shares (right axis)</p>
        <p>• RB fantasy success strongly correlates with total touches</p>
      </div>
    </div>
  );
}
