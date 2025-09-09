'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Plus, Trash2, Settings2 } from 'lucide-react'
import {
  useTeam,
  useTeamRoster,
  useAddPlayerToRoster,
  useRemovePlayerFromRoster,
} from '../../../../lib/team-hooks'
import { useAuth } from '../../../../lib/auth-context'
import { PlayerSearchModal } from '../../../../components/PlayerSearchModal'
import type { PlayerOut, RosterSlot } from '../../../../lib/api-types'

interface RosterPageProps {
  params: { teamId: string }
}

export default function RosterPage({ params }: RosterPageProps) {
  const teamId = params.teamId
  const { isAuthenticated } = useAuth()

  const { data: team, isLoading: teamLoading, error: teamError } = useTeam(teamId)
  const { data: roster, isLoading: rosterLoading, error: rosterError } = useTeamRoster(teamId)
  const addPlayerMutation = useAddPlayerToRoster()
  const removePlayerMutation = useRemovePlayerFromRoster()

  const [isPlayerSearchOpen, setIsPlayerSearchOpen] = useState(false)
  const [defaultSlot, setDefaultSlot] = useState<RosterSlot | null>(null)

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Please log in to manage your roster.</p>
        </div>
      </div>
    )
  }

  if (teamLoading || rosterLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (teamError || rosterError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">
            Failed to load team or roster: {teamError?.message || rosterError?.message}
          </p>
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

  const handleRemovePlayer = async (playerId: string) => {
    if (confirm('Are you sure you want to remove this player from your roster?')) {
      try {
        await removePlayerMutation.mutateAsync({ teamId, playerId })
      } catch (error) {
        console.error('Failed to remove player:', error)
        alert('Failed to remove player from roster')
      }
    }
  }

  const handleAddPlayer = async (player: PlayerOut, rosterSlot: RosterSlot) => {
    try {
      await addPlayerMutation.mutateAsync({
        teamId,
        request: {
          player_id: player.player_id,
          player_position: player.position || 'UNKNOWN',
          roster_slot: rosterSlot,
        },
      })
      setIsPlayerSearchOpen(false)
      setDefaultSlot(null)
    } catch (error) {
      console.error('Failed to add player:', error)
      alert('Failed to add player to roster')
    }
  }

  const openPlayerSearchForSlot = (slot?: RosterSlot) => {
    setDefaultSlot(slot || null)
    setIsPlayerSearchOpen(true)
  }

  // Calculate available slots
  const getAvailableSlots = (): RosterSlot[] => {
    if (!roster || !team) return []

    const availableSlots: RosterSlot[] = []
    const occupiedSlots = new Set(
      roster.players.map(
        (p) => `${p.roster_slot.type}-${p.roster_slot.position || 'bench'}-${p.roster_slot.index}`
      )
    )

    // Starting slots
    for (const [position, count] of Object.entries(team.roster_positions.starters)) {
      const numSlots = Number(count)
      for (let i = 1; i <= numSlots; i++) {
        const slotKey = `starter-${position}-${i}`
        if (!occupiedSlots.has(slotKey)) {
          availableSlots.push({
            type: 'starter',
            position,
            index: i,
          })
        }
      }
    }

    // Bench slots
    for (let i = 1; i <= team.roster_positions.bench; i++) {
      const slotKey = `bench-bench-${i}`
      if (!occupiedSlots.has(slotKey)) {
        availableSlots.push({
          type: 'bench',
          index: i,
        })
      }
    }

    // IR slots
    for (let i = 1; i <= (team.roster_positions.ir || 0); i++) {
      const slotKey = `ir-ir-${i}`
      if (!occupiedSlots.has(slotKey)) {
        availableSlots.push({
          type: 'ir',
          index: i,
        })
      }
    }

    return availableSlots
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/teams/${teamId}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Team Dashboard
        </Link>

        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Users className="w-8 h-8 mr-3" />
              Roster Management
            </h1>
            <p className="text-gray-600 mt-1">{team.name}</p>
          </div>
          <button
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            onClick={() => openPlayerSearchForSlot()}
            disabled={getAvailableSlots().length === 0}
          >
            <Plus className="w-4 h-4" />
            <span>Add Player</span>
          </button>
        </div>

        {/* Roster Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {startingSlots.filter((s) => s.player).length}/{startingSlots.length}
            </div>
            <div className="text-sm text-gray-600">Starting Lineup</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {benchRoster.length}/{team.roster_positions.bench}
            </div>
            <div className="text-sm text-gray-600">Bench</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {irRoster.length}/{team.roster_positions.ir}
            </div>
            <div className="text-sm text-gray-600">Injured Reserve</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{team.roster_count}</div>
            <div className="text-sm text-gray-600">Total Players</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Starting Lineup */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Settings2 className="w-5 h-5 mr-2" />
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
                      <div className="text-right mr-2">
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
                  <div className="flex space-x-2">
                    {slot.player ? (
                      <button
                        onClick={() => handleRemovePlayer(slot.player!.player_id)}
                        className="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
                        disabled={removePlayerMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          openPlayerSearchForSlot({
                            type: 'starter',
                            position: slot.position,
                            index: slot.index,
                          })
                        }
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded-md hover:bg-blue-50"
                        disabled={getAvailableSlots().length === 0}
                      >
                        Add Player
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bench */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Bench ({benchRoster.length}/{team.roster_positions.bench})
              </h3>
              <button
                onClick={() => {
                  const availableBenchSlots = getAvailableSlots().filter((s) => s.type === 'bench')
                  if (availableBenchSlots.length > 0) {
                    openPlayerSearchForSlot(availableBenchSlots[0])
                  } else {
                    openPlayerSearchForSlot()
                  }
                }}
                className="text-green-600 hover:text-green-700 p-1 rounded-md hover:bg-green-50"
                disabled={getAvailableSlots().length === 0}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {benchRoster.length > 0 ? (
                benchRoster.map((player) => (
                  <div
                    key={player.player_id}
                    className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-md"
                  >
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
                      <div className="text-right mr-2">
                        <div className="text-sm font-medium text-blue-600">
                          {player.player_info.projection.proj_pts.toFixed(1)} pts
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => handleRemovePlayer(player.player_id)}
                      className="text-red-600 hover:text-red-700 p-1 rounded-md hover:bg-red-50"
                      disabled={removePlayerMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Injured Reserve ({irRoster.length}/{team.roster_positions.ir})
                </h3>
                <button
                  onClick={() => {
                    const availableIRSlots = getAvailableSlots().filter((s) => s.type === 'ir')
                    if (availableIRSlots.length > 0) {
                      openPlayerSearchForSlot(availableIRSlots[0])
                    } else {
                      openPlayerSearchForSlot()
                    }
                  }}
                  className="text-green-600 hover:text-green-700 p-1 rounded-md hover:bg-green-50"
                  disabled={getAvailableSlots().length === 0}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {irRoster.length > 0 ? (
                  irRoster.map((player) => (
                    <div
                      key={player.player_id}
                      className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-md"
                    >
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
                        <div className="text-right mr-2">
                          <div className="text-sm font-medium text-blue-600">
                            {player.player_info.projection.proj_pts.toFixed(1)} pts
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => handleRemovePlayer(player.player_id)}
                        className="text-red-600 hover:text-red-700 p-1 rounded-md hover:bg-red-50"
                        disabled={removePlayerMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
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
              <button
                onClick={() => openPlayerSearchForSlot()}
                className="block w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={getAvailableSlots().length === 0}
              >
                Add More Players
              </button>
              <button
                onClick={() => alert('Import functionality coming soon!')}
                className="block w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                Import from Platform
              </button>
              <Link
                href={`/teams/${teamId}/settings`}
                className="block w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                Team Settings
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Player Search Modal */}
      <PlayerSearchModal
        isOpen={isPlayerSearchOpen}
        onClose={() => {
          setIsPlayerSearchOpen(false)
          setDefaultSlot(null)
        }}
        onSelectPlayer={handleAddPlayer}
        availableSlots={getAvailableSlots()}
        teamId={teamId}
        defaultSlot={defaultSlot}
      />
    </div>
  )
}
