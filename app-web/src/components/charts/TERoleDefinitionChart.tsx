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
  Legend,
} from 'recharts'
import { formatPercentage, formatNumber } from '@/lib/utils'

interface TEDataPoint {
  week: number
  receiving_snap_pct?: number
  blocking_snap_pct?: number
  route_pct?: number
  target_share?: number
  targets_pred?: number
  snap_pct?: number
}

interface TERoleDefinitionChartProps {
  data: any[]
  usageData?: any[]
  title?: string
}

export function TERoleDefinitionChart({
  data,
  usageData = [],
  title = 'Role Definition & Usage',
}: TERoleDefinitionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No TE data available
      </div>
    )
  }

  // Create usage data map for easier lookup
  const usageMap = new Map(usageData.map((item) => [item.week, item]))

  // Transform data for the chart
  const chartData: TEDataPoint[] = data.map((item) => {
    const components = item.components || {}
    const week = item.week
    const usage = usageMap.get(week)

    const snapPct = usage?.snap_pct || 0
    const routePct = usage?.route_pct || 0

    // Estimate receiving vs blocking snaps
    // If route % is high relative to snap %, more receiving role
    const receivingSnapPct = routePct > 0 ? Math.min(snapPct, routePct * 1.1) : snapPct * 0.6
    const blockingSnapPct = Math.max(0, snapPct - receivingSnapPct)

    return {
      week,
      receiving_snap_pct: receivingSnapPct,
      blocking_snap_pct: blockingSnapPct,
      route_pct: routePct,
      target_share: usage?.target_share || 0,
      targets_pred: components.targets_pred || 0,
      snap_pct: snapPct,
    }
  })

  return (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            tickFormatter={(value) => formatPercentage(value)}
            domain={[0, 1]}
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
                        <p className="text-sm font-medium text-gray-700">Snap Usage</p>
                        <p className="text-blue-600">
                          Receiving Snaps: {formatPercentage(data.receiving_snap_pct || 0)}
                        </p>
                        <p className="text-red-600">
                          Blocking Snaps: {formatPercentage(data.blocking_snap_pct || 0)}
                        </p>
                        <p className="text-gray-600">
                          Total Snaps: {formatPercentage(data.snap_pct || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Receiving Role</p>
                        <p className="text-green-600">
                          Route %: {formatPercentage(data.route_pct || 0)}
                        </p>
                        <p className="text-purple-600">
                          Target Share: {formatPercentage(data.target_share || 0)}
                        </p>
                        <p className="text-orange-600">
                          Projected Targets: {formatNumber(data.targets_pred || 0, 0)}
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

          {/* Stacked areas showing snap allocation */}
          <Area
            type="monotone"
            dataKey="blocking_snap_pct"
            stackId="snaps"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.6}
            name="Blocking Snaps %"
          />

          <Area
            type="monotone"
            dataKey="receiving_snap_pct"
            stackId="snaps"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.6}
            name="Receiving Snaps %"
          />

          {/* Route participation as overlay line */}
          <Area
            type="monotone"
            dataKey="route_pct"
            stroke="#10b981"
            strokeWidth={3}
            fill="transparent"
            name="Route %"
            dot={{ r: 4, fill: '#10b981' }}
          />

          {/* Target share as overlay line */}
          <Area
            type="monotone"
            dataKey="target_share"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="transparent"
            name="Target Share"
            dot={{ r: 3, fill: '#8b5cf6' }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Stacked areas show estimated snap allocation (receiving vs blocking)</p>
        <p>• Green line shows actual route participation rate</p>
        <p>• Purple dashed line shows target share within team offense</p>
        <p>• Higher receiving snap % and route % = better fantasy outlook</p>
      </div>
    </div>
  )
}
