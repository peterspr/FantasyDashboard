'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Settings, Calendar, Trophy } from 'lucide-react'
import { useTeam, useTeamRoster } from '../../../lib/team-hooks'
import { useAuth } from '../../../lib/auth-context'

interface TeamDashboardProps {
  params: { teamId: string }
}

export default function TeamDashboard({ params }: TeamDashboardProps) {
  const teamId = params.teamId
  const { isAuthenticated } = useAuth()

  const { data: team, isLoading: teamLoading, error: teamError } = useTeam(teamId)
  const { data: roster, isLoading: rosterLoading } = useTeamRoster(teamId)

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your team.</p>
        </div>
      </div>
    )
  }

  if (teamLoading || rosterLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="h-6 bg-gray-300 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="h-6 bg-gray-300 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-300 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (teamError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Failed to load team: {teamError.message}</p>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Team not found.</p>
        </div>
      </div>
    )
  }

  // Group roster by position types
  const startingRoster = roster?.players.filter((p) => p.roster_slot.type === 'starter') || []
  const benchRoster = roster?.players.filter((p) => p.roster_slot.type === 'bench') || []
  const irRoster = roster?.players.filter((p) => p.roster_slot.type === 'ir') || []

  // Calculate starting lineup slots with custom ordering
  const getPositionOrder = (position: string, index: number) => {
    const positionUpper = position?.toUpperCase() || ''
    const orderMap: Record<string, number> = {
      QB: 0,
      RB: 1,
      WR: 3,
      TE: 5,
      FLEX: 6,
      DST: 7,
      DEF: 7,
      K: 8,
    }

    // Base order for position type, plus index for sub-ordering (RB1, RB2, etc.)
    const baseOrder = orderMap[positionUpper] !== undefined ? orderMap[positionUpper] : 999
    return baseOrder * 10 + index
  }

  const startingSlots = []
  for (const [position, count] of Object.entries(team.roster_positions.starters)) {
    const numSlots = Number(count)
    for (let i = 1; i <= numSlots; i++) {
      const player = startingRoster.find(
        (p) => p.roster_slot.position === position && p.roster_slot.index === i
      )
      startingSlots.push({
        position,
        index: i,
        player,
        slotName: numSlots > 1 ? `${position}${i}` : position,
        sortOrder: getPositionOrder(position, i),
      })
    }
  }

  // Sort slots by the desired order
  startingSlots.sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/teams"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Teams
        </Link>

        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
            {team.league_name && <p className="text-gray-600 mt-1">{team.league_name}</p>}
          </div>
          <div className="flex space-x-2">
            <Link
              href={`/teams/${team.id}/roster`}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Manage Roster</span>
            </Link>
            <Link
              href={`/teams/${team.id}/settings`}
              className="flex items-center space-x-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
          </div>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{team.roster_count}</div>
            <div className="text-sm text-gray-600">Players</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-green-600 capitalize">
              {team.scoring_system}
            </div>
            <div className="text-sm text-gray-600">Scoring</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{team.league_size}</div>
            <div className="text-sm text-gray-600">League Size</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {new Date(team.created_at).toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600">Created</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Starting Lineup */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Starting Lineup
            </h2>
            <div className="space-y-3">
              {startingSlots.map((slot) => (
                <div
                  key={`${slot.position}-${slot.index}`}
                  className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-700">{slot.slotName}</span>
                    </div>
                    <div className="flex-1">
                      {slot.player ? (
                        <>
                          <div className="font-medium text-gray-900">
                            {slot.player.player_info?.name || slot.player.player_id}
                          </div>
                          <div className="text-sm text-gray-600">
                            {slot.player.player_info?.team} • {slot.player.player_info?.position}
                            {slot.player.player_info?.jersey_number &&
                              ` • #${slot.player.player_info.jersey_number}`}
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-500 italic">Empty slot</div>
                      )}
                    </div>
                    {slot.player?.player_info?.projection && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-blue-600">
                          {slot.player.player_info.projection.proj_pts.toFixed(1)} pts
                        </div>
                        <div className="text-xs text-gray-500">
                          {slot.player.player_info.projection.low.toFixed(1)}-
                          {slot.player.player_info.projection.high.toFixed(1)}
                        </div>
                      </div>
                    )}
                  </div>
                  {!slot.player && (
                    <Link
                      href={`/teams/${team.id}/roster`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Add Player
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Team Projections Placeholder */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Projections</h2>
            <div className="text-gray-500 text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Team projections will be available once you add players to your roster.</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bench */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Bench ({benchRoster.length}/{team.roster_positions.bench})
            </h3>
            <div className="space-y-2">
              {benchRoster.length > 0 ? (
                benchRoster.map((player) => (
                  <div key={player.player_id} className="flex justify-between items-center py-2">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {player.player_info?.name || player.player_id}
                      </div>
                      <div className="text-xs text-gray-600">
                        {player.player_info?.team} • {player.player_info?.position}
                        {player.player_info?.jersey_number &&
                          ` • #${player.player_info.jersey_number}`}
                      </div>
                    </div>
                    {player.player_info?.projection && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-blue-600">
                          {player.player_info.projection.proj_pts.toFixed(1)} pts
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No bench players</p>
              )}
            </div>
          </div>

          {/* IR */}
          {team.roster_positions.ir > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Injured Reserve ({irRoster.length}/{team.roster_positions.ir})
              </h3>
              <div className="space-y-2">
                {irRoster.length > 0 ? (
                  irRoster.map((player) => (
                    <div key={player.player_id} className="flex justify-between items-center py-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {player.player_info?.name || player.player_id}
                        </div>
                        <div className="text-xs text-gray-600">
                          {player.player_info?.team} • {player.player_info?.position}
                          {player.player_info?.jersey_number &&
                            ` • #${player.player_info.jersey_number}`}
                        </div>
                      </div>
                      {player.player_info?.projection && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-blue-600">
                            {player.player_info.projection.proj_pts.toFixed(1)} pts
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No IR players</p>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href={`/teams/${team.id}/roster`}
                className="block w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                Add Players to Roster
              </Link>
              <Link
                href={`/teams/${team.id}/projections`}
                className="block w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                View Team Projections
              </Link>
              <Link
                href={`/teams/${team.id}/settings`}
                className="block w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                Edit Team Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
