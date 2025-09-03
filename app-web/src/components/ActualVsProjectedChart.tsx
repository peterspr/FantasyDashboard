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
  Cell,
} from 'recharts';
import { formatNumber } from '@/lib/utils';

interface ActualVsProjectedDataPoint {
  player_id: string;
  name: string;
  position: string;
  team?: string;
  projected: number;
  actual: number;
  difference: number;
}

interface ActualVsProjectedChartProps {
  data: ActualVsProjectedDataPoint[];
  title?: string;
  showReferenceLine?: boolean;
  highlightOutliers?: boolean;
}

const positionColors = {
  QB: '#3b82f6',
  RB: '#10b981',
  WR: '#f59e0b',
  TE: '#8b5cf6',
  K: '#6b7280',
  DEF: '#ef4444',
} as const;

export function ActualVsProjectedChart({
  data,
  title = "Actual vs Projected Fantasy Points",
  showReferenceLine = true,
  highlightOutliers = true,
}: ActualVsProjectedChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No comparison data available
      </div>
    );
  }

  // Calculate the range for the reference line
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.projected, d.actual))
  );
  const minValue = Math.min(
    ...data.map(d => Math.min(d.projected, d.actual))
  );

  // Identify outliers (players with large differences between projected and actual)
  const avgDifference = data.reduce((sum, d) => sum + Math.abs(d.difference), 0) / data.length;
  const outlierThreshold = avgDifference * 2;

  return (
    <div className="space-y-4">
      {title && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">
            Each point represents a player&apos;s projected vs actual fantasy points. 
            Points on the diagonal line indicate perfect predictions.
          </p>
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          
          <XAxis
            dataKey="projected"
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => formatNumber(value)}
            label={{ value: 'Projected Fantasy Points', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
          />
          
          <YAxis
            dataKey="actual"
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => formatNumber(value)}
            label={{ value: 'Actual Fantasy Points', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload[0]) {
                const data = payload[0].payload as ActualVsProjectedDataPoint;
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900">{data.name}</p>
                    <p className="text-sm text-gray-600">{data.position}{data.team && ` • ${data.team}`}</p>
                    <div className="space-y-1 mt-2 text-sm">
                      <p>Projected: <span className="font-medium">{formatNumber(data.projected)}</span></p>
                      <p>Actual: <span className="font-medium">{formatNumber(data.actual)}</span></p>
                      <p className={`font-medium ${data.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Difference: {data.difference >= 0 ? '+' : ''}{formatNumber(data.difference)}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />

          {/* Reference line (perfect prediction line) */}
          {showReferenceLine && (
            <ReferenceLine
              segment={[
                { x: minValue, y: minValue },
                { x: maxValue, y: maxValue }
              ]}
              stroke="#6b7280"
              strokeDasharray="2 2"
              strokeWidth={1}
            />
          )}

          <Scatter name="Players" data={data} fill="#8884d8">
            {data.map((entry, index) => {
              const isOutlier = highlightOutliers && Math.abs(entry.difference) > outlierThreshold;
              const position = entry.position as keyof typeof positionColors;
              const color = positionColors[position] || '#6b7280';
              
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={color}
                  stroke={isOutlier ? '#ef4444' : color}
                  strokeWidth={isOutlier ? 2 : 0}
                  r={isOutlier ? 6 : 4}
                  opacity={0.7}
                />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
          {Object.entries(positionColors).map(([position, color]) => (
            <div key={position} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full opacity-70" 
                style={{ backgroundColor: color }}
              ></div>
              <span>{position}</span>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
          {showReferenceLine && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-gray-400" style={{ borderStyle: 'dashed' }}></div>
              <span>Perfect Prediction</span>
            </div>
          )}
          {highlightOutliers && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full border-2 border-red-500 bg-gray-300"></div>
              <span>Large Variance</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}