'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'
import { formatNumber } from '@/lib/utils'

interface FantasyBreakdownDataPoint {
  week: number
  total: number
  // Offensive stats
  receptions?: number
  rec_yards?: number
  rec_tds?: number
  rush_yards?: number
  rush_tds?: number
  // QB stats
  pass_yards?: number
  pass_tds?: number
  interceptions?: number
  // Negative stats
  fumbles?: number
  // DST stats
  points_allowed?: number
  sacks?: number
  def_interceptions?: number
  fumble_recoveries?: number
  def_tds?: number
  safeties?: number
  blocked_kicks?: number
}

interface FantasyBreakdownChartProps {
  data: any[] // Raw projection data with components
  title?: string
  scoring?: 'ppr' | 'half_ppr' | 'standard'
  position?: string
}

// Scoring weights by system
const SCORING_WEIGHTS = {
  ppr: {
    reception: 1.0,
    rec_yd: 0.1,
    rec_td: 6.0,
    rush_yd: 0.1,
    rush_td: 6.0,
    pass_yd: 0.04,
    pass_td: 4.0,
    int: -2.0,
    fumble: -2.0,
    sacks: 1.0,
    def_interceptions: 2.0,
    fumble_recoveries: 2.0,
    def_tds: 6.0,
    safeties: 2.0,
    blocked_kicks: 2.0,
  },
  half_ppr: {
    reception: 0.5,
    rec_yd: 0.1,
    rec_td: 6.0,
    rush_yd: 0.1,
    rush_td: 6.0,
    pass_yd: 0.04,
    pass_td: 4.0,
    int: -2.0,
    fumble: -2.0,
    sacks: 1.0,
    def_interceptions: 2.0,
    fumble_recoveries: 2.0,
    def_tds: 6.0,
    safeties: 2.0,
    blocked_kicks: 2.0,
  },
  standard: {
    reception: 0.0,
    rec_yd: 0.1,
    rec_td: 6.0,
    rush_yd: 0.1,
    rush_td: 6.0,
    pass_yd: 0.04,
    pass_td: 4.0,
    int: -2.0,
    fumble: -2.0,
    sacks: 1.0,
    def_interceptions: 2.0,
    fumble_recoveries: 2.0,
    def_tds: 6.0,
    safeties: 2.0,
    blocked_kicks: 2.0,
  },
}

// DST Points Allowed Scoring (tiered)
const getDSTPointsAllowedScore = (pointsAllowed: number): number => {
  if (pointsAllowed === 0) return 10
  if (pointsAllowed <= 6) return 7
  if (pointsAllowed <= 13) return 4
  if (pointsAllowed <= 20) return 1
  if (pointsAllowed <= 27) return 0
  if (pointsAllowed <= 34) return -1
  return -4 // 35+
}

// Color scheme for different fantasy point sources
const COLORS = {
  // Receiving
  receptions: '#3b82f6', // Blue
  rec_yards: '#1d4ed8', // Dark Blue
  rec_tds: '#fbbf24', // Gold

  // Rushing
  rush_yards: '#ef4444', // Red
  rush_tds: '#dc2626', // Dark Red

  // Passing (QB)
  pass_yards: '#10b981', // Green
  pass_tds: '#059669', // Dark Green

  // Negative
  interceptions: '#6b7280', // Gray
  fumbles: '#6b7280', // Gray

  // Defense
  points_allowed: '#8b5cf6', // Purple
  sacks: '#06b6d4', // Cyan
  def_interceptions: '#84cc16', // Lime
  fumble_recoveries: '#f59e0b', // Amber
  def_tds: '#ec4899', // Pink
  safeties: '#14b8a6', // Teal
  blocked_kicks: '#f97316', // Orange
}

export function FantasyBreakdownChart({
  data,
  title = 'Fantasy Points Breakdown',
  scoring = 'ppr',
  position = 'WR',
}: FantasyBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No projection data available
      </div>
    )
  }

  const weights = SCORING_WEIGHTS[scoring]

  // Transform data to breakdown format
  const breakdownData: FantasyBreakdownDataPoint[] = data.map((item) => {
    const components = item.components || {}
    const week = item.week

    const breakdown: FantasyBreakdownDataPoint = { week, total: item.proj || 0 }

    if (position === 'DST') {
      // Defense scoring
      const pointsAllowed = components.points_allowed_proj || 0
      breakdown.points_allowed = getDSTPointsAllowedScore(pointsAllowed)
      breakdown.sacks = (components.sacks_proj || 0) * weights.sacks
      breakdown.def_interceptions = (components.interceptions_proj || 0) * weights.def_interceptions
      breakdown.fumble_recoveries =
        (components.fumble_recoveries_proj || 0) * weights.fumble_recoveries
      breakdown.def_tds = (components.def_tds_proj || 0) * weights.def_tds
      breakdown.safeties = (components.safeties_proj || 0) * weights.safeties
      breakdown.blocked_kicks = (components.blocked_kicks_proj || 0) * weights.blocked_kicks
    } else {
      // Offensive positions
      if (position !== 'QB') {
        // Receiving stats (WR, TE, RB)
        breakdown.receptions = (components.rec_pred || 0) * weights.reception
        breakdown.rec_yards = (components.rec_yds_pred || 0) * weights.rec_yd
        breakdown.rec_tds = (components.rec_td_pred || 0) * weights.rec_td
      }

      if (position === 'QB' || position === 'RB') {
        // Rushing stats
        breakdown.rush_yards = (components.rush_yds_pred || 0) * weights.rush_yd
        breakdown.rush_tds = (components.rush_td_pred || 0) * weights.rush_td
      }

      if (position === 'QB') {
        // Passing stats
        breakdown.pass_yards = (components.pass_yds_pred || 0) * weights.pass_yd
        breakdown.pass_tds = (components.pass_td_pred || 0) * weights.pass_td
        breakdown.interceptions = (components.int_pred || 0) * weights.int
      }

      // Fumbles for all offensive positions - set to 0 as per database calculation
      // (fumbles are too random to project reliably, but included for calculation completeness)
      breakdown.fumbles = 0 * weights.fumble // Always 0 as per backend calculation
    }

    return breakdown
  })

  // Determine which stats to show based on position
  const getDataKeys = (): string[] => {
    switch (position) {
      case 'QB':
        return ['pass_yards', 'pass_tds', 'rush_yards', 'rush_tds', 'interceptions', 'fumbles']
      case 'RB':
        return ['rush_yards', 'rush_tds', 'receptions', 'rec_yards', 'rec_tds', 'fumbles']
      case 'WR':
      case 'TE':
        return ['receptions', 'rec_yards', 'rec_tds', 'rush_yards', 'rush_tds', 'fumbles']
      case 'DST':
        return [
          'points_allowed',
          'sacks',
          'def_interceptions',
          'fumble_recoveries',
          'def_tds',
          'safeties',
          'blocked_kicks',
        ]
      default:
        return ['receptions', 'rec_yards', 'rec_tds', 'rush_yards', 'rush_tds', 'fumbles']
    }
  }

  const dataKeys = getDataKeys()

  // Custom label formatter
  const getLabelText = (key: string): string => {
    const labels: Record<string, string> = {
      receptions: 'Receptions',
      rec_yards: 'Rec Yards',
      rec_tds: 'Rec TDs',
      rush_yards: 'Rush Yards',
      rush_tds: 'Rush TDs',
      pass_yards: 'Pass Yards',
      pass_tds: 'Pass TDs',
      interceptions: 'Interceptions',
      fumbles: 'Fumbles',
      points_allowed: 'Points Allowed',
      sacks: 'Sacks',
      def_interceptions: 'Interceptions',
      fumble_recoveries: 'Fumble Rec',
      def_tds: 'Def TDs',
      safeties: 'Safeties',
      blocked_kicks: 'Blocked Kicks',
    }
    return labels[key] || key
  }

  // Helper function to get scoring weight for a stat
  const getWeightForKey = (key: string, weights: any): number => {
    const weightMap: Record<string, string> = {
      receptions: 'reception',
      rec_yards: 'rec_yd',
      rec_tds: 'rec_td',
      rush_yards: 'rush_yd',
      rush_tds: 'rush_td',
      pass_yards: 'pass_yd',
      pass_tds: 'pass_td',
      interceptions: 'int',
      fumbles: 'fumble',
      sacks: 'sacks',
      def_interceptions: 'def_interceptions',
      fumble_recoveries: 'fumble_recoveries',
      def_tds: 'def_tds',
      safeties: 'safeties',
      blocked_kicks: 'blocked_kicks',
    }

    const weightKey = weightMap[key]
    return weightKey ? weights[weightKey] || 0 : 0
  }

  // Helper function to format raw stats appropriately
  const formatRawStat = (key: string, value: number): string => {
    // Special case for points allowed (shows range instead of exact number)
    if (key === 'points_allowed') {
      if (value >= 10) return '0 pts allowed'
      if (value >= 7) return '1-6 pts allowed'
      if (value >= 4) return '7-13 pts allowed'
      if (value >= 1) return '14-20 pts allowed'
      if (value >= 0) return '21-27 pts allowed'
      if (value >= -1) return '28-34 pts allowed'
      return '35+ pts allowed'
    }

    // Decimal stats (TDs, some defensive stats)
    if (
      key.includes('td') ||
      key === 'interceptions' ||
      key === 'sacks' ||
      key === 'def_interceptions' ||
      key === 'fumble_recoveries' ||
      key === 'safeties' ||
      key === 'blocked_kicks'
    ) {
      return formatNumber(value, 1)
    }

    // Whole number stats (yards, receptions)
    return formatNumber(value, 0)
  }

  return (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={breakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                const total = breakdownData.find((d) => d.week === label)?.total || 0
                const calculatedTotal = payload.reduce(
                  (sum, entry) => sum + (entry.value as number),
                  0
                )
                const discrepancy = Math.abs(total - calculatedTotal)
                const hasDiscrepancy = discrepancy > 0.01 // Allow for small rounding differences

                return (
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900">Week {label}</p>
                    <p className="font-semibold text-blue-600 mb-2">
                      Total: {formatNumber(total)} pts
                      {hasDiscrepancy && (
                        <span className="text-orange-600 text-xs ml-2">
                          (Components: {formatNumber(calculatedTotal)})
                        </span>
                      )}
                    </p>
                    <div className="space-y-1">
                      {payload
                        .filter((entry) => (entry.value as number) !== 0)
                        .sort((a, b) => Math.abs(b.value as number) - Math.abs(a.value as number))
                        .map((entry, index) => {
                          const key = entry.dataKey as string
                          const fantasyPoints = entry.value as number
                          const weight = getWeightForKey(key, weights)
                          const rawStat = weight !== 0 ? fantasyPoints / weight : 0

                          return (
                            <p key={index} style={{ color: entry.color }}>
                              {getLabelText(key)}: {formatRawStat(key, rawStat)} ={' '}
                              {formatNumber(fantasyPoints)} pts
                              {total > 0 && (
                                <span className="text-gray-500 ml-1">
                                  ({((fantasyPoints / total) * 100).toFixed(1)}%)
                                </span>
                              )}
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

          <Legend formatter={(value) => getLabelText(value)} wrapperStyle={{ fontSize: '12px' }} />

          {dataKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="breakdown"
              fill={COLORS[key as keyof typeof COLORS]}
              name={getLabelText(key)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Stacked bars show the source of each week's projected fantasy points</p>
        <p>• Hover over bars to see raw stats + fantasy points earned</p>
        <p>• Scoring system: {scoring.toUpperCase().replace('_', ' ')}</p>
        <p>• Note: Fumbles set to 0 (too random to project reliably)</p>
      </div>
    </div>
  )
}
