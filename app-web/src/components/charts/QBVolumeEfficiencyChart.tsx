'use client'

import React from 'react'
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
} from 'recharts'
import { formatNumber, formatPercentage } from '@/lib/utils'

interface QBVolumeDataPoint {
  week: number
  pass_att_pred?: number
  yards_per_attempt?: number
  completion_rate?: number
  int_rate?: number
  pass_td_rate?: number
}

interface QBVolumeEfficiencyChartProps {
  data: any[]
  title?: string
}

export function QBVolumeEfficiencyChart({
  data,
  title = 'Volume & Efficiency Metrics',
}: QBVolumeEfficiencyChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No QB data available
      </div>
    )
  }

  // Transform data for the chart
  const chartData: QBVolumeDataPoint[] = data.map((item) => {
    const components = item.components || {}
    const week = item.week

    const passAtt = components.pass_att_pred || 0
    const passYds = components.pass_yds_pred || 0
    const passTds = components.pass_td_pred || 0
    const ints = components.int_pred || 0
    const completions = components.completions_pred || passAtt * 0.65 // Estimate if not available

    const yardsPerAttempt = passAtt > 0 ? passYds / passAtt : 0
    const completionRate = passAtt > 0 ? completions / passAtt : 0
    const intRate = passAtt > 0 ? ints / passAtt : 0
    const passTdRate = passAtt > 0 ? passTds / passAtt : 0

    return {
      week,
      pass_att_pred: passAtt,
      yards_per_attempt: yardsPerAttempt,
      completion_rate: completionRate,
      int_rate: intRate,
      pass_td_rate: passTdRate,
    }
  })

  return (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            yAxisId="rate"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) =>
              value > 1 ? formatNumber(value, 1) : formatPercentage(value)
            }
          />

          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = chartData.find((d) => d.week === label)
                if (!data) return null

                return (
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900">Week {label}</p>
                    <div className="space-y-1 mt-2">
                      <div className="border-b pb-1 mb-2">
                        <p className="text-sm font-medium text-gray-700">Volume</p>
                        <p className="text-blue-600">
                          Pass Attempts: {formatNumber(data.pass_att_pred || 0, 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Efficiency</p>
                        <p className="text-green-600">
                          Yards/Attempt: {formatNumber(data.yards_per_attempt || 0, 1)}
                        </p>
                        <p className="text-purple-600">
                          Completion Rate: {formatPercentage(data.completion_rate || 0)}
                        </p>
                        <p className="text-orange-600">
                          TD Rate: {formatPercentage(data.pass_td_rate || 0)}
                        </p>
                        <p className="text-red-600">
                          INT Rate: {formatPercentage(data.int_rate || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />

          <Legend />

          {/* Pass attempts as bars (volume) */}
          <Bar
            yAxisId="volume"
            dataKey="pass_att_pred"
            fill="#3b82f6"
            fillOpacity={0.6}
            name="Pass Attempts"
          />

          {/* Efficiency metrics as lines */}
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="yards_per_attempt"
            stroke="#10b981"
            strokeWidth={3}
            name="Yards/Attempt"
            dot={{ r: 4, fill: '#10b981' }}
            connectNulls={false}
          />

          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="completion_rate"
            stroke="#8b5cf6"
            strokeWidth={2}
            name="Completion %"
            dot={{ r: 3, fill: '#8b5cf6' }}
            connectNulls={false}
          />

          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="pass_td_rate"
            stroke="#f59e0b"
            strokeWidth={2}
            name="TD Rate"
            dot={{ r: 3, fill: '#f59e0b' }}
            connectNulls={false}
          />

          {/* INT rate (negative indicator) */}
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="int_rate"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="INT Rate"
            dot={{ r: 3, fill: '#ef4444' }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Blue bars show projected pass attempts (volume opportunity)</p>
        <p>• Solid lines show positive efficiency metrics (higher is better)</p>
        <p>• Dashed red line shows interception rate (lower is better)</p>
        <p>• High volume + high efficiency = elite QB performance</p>
      </div>
    </div>
  )
}
