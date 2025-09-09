'use client'

import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { formatNumber } from '@/lib/utils'

interface ProjectionDataPoint {
  week: number
  proj: number | null
  low: number | null
  high: number | null
  actual?: number | undefined
}

interface ProjectionChartProps {
  data: ProjectionDataPoint[]
  title?: string
  showUncertainty?: boolean
  showActual?: boolean
  currentWeek?: number
}

export function ProjectionChart({
  data,
  title = 'Weekly Projections',
  showUncertainty = true,
  showActual = true,
  currentWeek,
}: ProjectionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No projection data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

          <XAxis
            dataKey="week"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => formatNumber(value)}
          />

          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900">Week {label}</p>
                    <div className="space-y-1 mt-2">
                      {payload.map((entry, index) => {
                        // Check if this is a bye week (null projection)
                        if (entry.dataKey === 'proj' && entry.value === null) {
                          return (
                            <p key={index} style={{ color: '#6b7280' }}>
                              Bye Week
                            </p>
                          )
                        }
                        return (
                          <p key={index} style={{ color: entry.color }}>
                            {entry.dataKey}: {formatNumber(entry.value as number)}
                          </p>
                        )
                      })}
                    </div>
                  </div>
                )
              }
              return null
            }}
          />

          {showUncertainty && (
            <Area
              type="monotone"
              dataKey="high"
              stroke="transparent"
              fill="#dbeafe"
              fillOpacity={0.6}
            />
          )}

          {showUncertainty && (
            <Area
              type="monotone"
              dataKey="low"
              stroke="transparent"
              fill="#ffffff"
              fillOpacity={1}
            />
          )}

          <Area
            type="monotone"
            dataKey="proj"
            stroke="#2563eb"
            strokeWidth={2}
            fill="#3b82f6"
            fillOpacity={0.1}
          />

          {showActual && (
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#059669"
              strokeWidth={2}
              fill="transparent"
              strokeDasharray="5 5"
            />
          )}

          {currentWeek && (
            <ReferenceLine
              x={currentWeek}
              stroke="#ef4444"
              strokeDasharray="2 2"
              label={{ value: 'Current', position: 'top' }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Projection</span>
        </div>

        {showUncertainty && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-200 rounded"></div>
            <span>Uncertainty Band</span>
          </div>
        )}

        {showActual && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-green-600" style={{ borderStyle: 'dashed' }}></div>
            <span>Actual</span>
          </div>
        )}
      </div>
    </div>
  )
}
