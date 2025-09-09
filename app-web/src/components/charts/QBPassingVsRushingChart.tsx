'use client'

import React from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatNumber } from '@/lib/utils'

interface QBDataPoint {
  week: number
  pass_yds_pred?: number
  rush_yds_pred?: number
  pass_td_pred?: number
  rush_td_pred?: number
  pass_yds_actual?: number
  rush_yds_actual?: number
  pass_td_actual?: number
  rush_td_actual?: number
}

interface QBPassingVsRushingChartProps {
  data: any[]
  title?: string
  actualData?: Map<number, any> | Record<number, any>
}

export function QBPassingVsRushingChart({
  data,
  title = 'Passing vs Rushing Production',
  actualData,
}: QBPassingVsRushingChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No QB data available
      </div>
    )
  }

  // Transform data for the chart
  const chartData: QBDataPoint[] = data.map((item) => {
    const components = item.components || {}
    const week = item.week
    const actual = actualData instanceof Map ? actualData.get(week) : actualData?.[week]

    return {
      week,
      // Projected stats
      pass_yds_pred: components.pass_yds_pred || 0,
      rush_yds_pred: components.rush_yds_pred || 0,
      pass_td_pred: components.pass_td_pred || 0,
      rush_td_pred: components.rush_td_pred || 0,
      // Actual stats (if available)
      pass_yds_actual: actual?.pass_yds,
      rush_yds_actual: actual?.rush_yds,
      pass_td_actual: actual?.pass_td,
      rush_td_actual: actual?.rush_td,
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
            yAxisId="yards"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => formatNumber(value, 0)}
          />

          <YAxis
            yAxisId="tds"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => formatNumber(value, 1)}
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
                        <p className="text-sm font-medium text-gray-700">Passing</p>
                        <p className="text-blue-600">
                          Proj: {formatNumber(data.pass_yds_pred || 0)} yds,{' '}
                          {formatNumber(data.pass_td_pred || 0, 1)} TDs
                        </p>
                        {data.pass_yds_actual !== undefined && (
                          <p className="text-green-600">
                            Actual: {formatNumber(data.pass_yds_actual)} yds,{' '}
                            {formatNumber(data.pass_td_actual || 0, 0)} TDs
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Rushing</p>
                        <p className="text-red-600">
                          Proj: {formatNumber(data.rush_yds_pred || 0)} yds,{' '}
                          {formatNumber(data.rush_td_pred || 0, 1)} TDs
                        </p>
                        {data.rush_yds_actual !== undefined && (
                          <p className="text-orange-600">
                            Actual: {formatNumber(data.rush_yds_actual)} yds,{' '}
                            {formatNumber(data.rush_td_actual || 0, 0)} TDs
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />

          <Legend />

          {/* Passing Yards - Bar */}
          <Bar
            yAxisId="yards"
            dataKey="pass_yds_pred"
            fill="#3b82f6"
            fillOpacity={0.6}
            name="Pass Yds (Proj)"
          />

          {/* Rushing Yards - Bar */}
          <Bar
            yAxisId="yards"
            dataKey="rush_yds_pred"
            fill="#ef4444"
            fillOpacity={0.6}
            name="Rush Yds (Proj)"
          />

          {/* Passing TDs - Line */}
          <Line
            yAxisId="tds"
            type="monotone"
            dataKey="pass_td_pred"
            stroke="#1d4ed8"
            strokeWidth={3}
            name="Pass TDs (Proj)"
            dot={{ r: 4, fill: '#1d4ed8' }}
            connectNulls={false}
          />

          {/* Rushing TDs - Line */}
          <Line
            yAxisId="tds"
            type="monotone"
            dataKey="rush_td_pred"
            stroke="#dc2626"
            strokeWidth={3}
            name="Rush TDs (Proj)"
            dot={{ r: 4, fill: '#dc2626' }}
            connectNulls={false}
          />

          {/* Actual data lines (if available) */}
          <Line
            yAxisId="yards"
            type="monotone"
            dataKey="pass_yds_actual"
            stroke="#059669"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Pass Yds (Actual)"
            dot={{ r: 3, fill: '#059669' }}
            connectNulls={false}
          />

          <Line
            yAxisId="yards"
            type="monotone"
            dataKey="rush_yds_actual"
            stroke="#ea580c"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Rush Yds (Actual)"
            dot={{ r: 3, fill: '#ea580c' }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Bars show projected passing/rushing yards (left axis)</p>
        <p>• Lines show projected touchdown rates (right axis)</p>
        <p>• Dashed lines show actual performance when available</p>
      </div>
    </div>
  )
}
