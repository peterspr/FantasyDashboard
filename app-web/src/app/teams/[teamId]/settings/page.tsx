'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Settings, Save, Trash2 } from 'lucide-react'
import { useTeam, useUpdateTeam, useDeleteTeam } from '../../../../lib/team-hooks'
import { useAuth } from '../../../../lib/auth-context'
import { useRouter } from 'next/navigation'

interface SettingsPageProps {
  params: { teamId: string }
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const teamId = params.teamId
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  const { data: team, isLoading: teamLoading, error: teamError } = useTeam(teamId)
  const updateTeamMutation = useUpdateTeam()
  const deleteTeamMutation = useDeleteTeam()

  const [formData, setFormData] = useState({
    name: '',
    league_name: '',
    scoring_system: 'standard' as 'standard' | 'ppr' | 'half_ppr',
    league_size: 12,
  })

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Update form when team data loads
  React.useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        league_name: team.league_name || '',
        scoring_system: team.scoring_system,
        league_size: team.league_size,
      })
    }
  }, [team])

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Please log in to manage team settings.</p>
        </div>
      </div>
    )
  }

  if (teamLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-300 rounded"></div>
            ))}
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

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    try {
      await updateTeamMutation.mutateAsync({
        teamId,
        request: formData,
      })
      setHasUnsavedChanges(false)
      alert('Team settings saved successfully!')
    } catch (error) {
      console.error('Failed to update team:', error)
      alert('Failed to save team settings')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteTeamMutation.mutateAsync(teamId)
      router.push('/teams')
      alert('Team deleted successfully')
    } catch (error) {
      console.error('Failed to delete team:', error)
      alert('Failed to delete team')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/teams/${teamId}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Team Dashboard
        </Link>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Settings className="w-8 h-8 mr-3" />
              Team Settings
            </h1>
            <p className="text-gray-600 mt-1">Manage your team configuration</p>
          </div>
          {hasUnsavedChanges && (
            <button
              onClick={handleSave}
              disabled={updateTeamMutation.isPending}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  id="team-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your team name"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="league-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  League Name
                </label>
                <input
                  type="text"
                  id="league-name"
                  value={formData.league_name}
                  onChange={(e) => handleInputChange('league_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your league name (optional)"
                />
              </div>
            </div>
          </div>

          {/* League Configuration */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">League Configuration</h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="scoring-system"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Scoring System *
                </label>
                <select
                  id="scoring-system"
                  value={formData.scoring_system}
                  onChange={(e) => handleInputChange('scoring_system', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="standard">Standard (Non-PPR)</option>
                  <option value="half_ppr">Half PPR (0.5 per reception)</option>
                  <option value="ppr">Full PPR (1 per reception)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="league-size"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  League Size *
                </label>
                <select
                  id="league-size"
                  value={formData.league_size}
                  onChange={(e) => handleInputChange('league_size', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={8}>8 Teams</option>
                  <option value={10}>10 Teams</option>
                  <option value={12}>12 Teams</option>
                  <option value={14}>14 Teams</option>
                  <option value={16}>16 Teams</option>
                </select>
              </div>
            </div>
          </div>

          {/* Roster Configuration Display */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Roster Configuration</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.values(team.roster_positions.starters).reduce(
                    (sum: number, count: unknown) => sum + Number(count),
                    0
                  )}
                </div>
                <div className="text-sm text-gray-600">Starting Slots</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <div className="text-2xl font-bold text-green-600">
                  {team.roster_positions.bench}
                </div>
                <div className="text-sm text-gray-600">Bench Slots</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <div className="text-2xl font-bold text-purple-600">{team.roster_positions.ir}</div>
                <div className="text-sm text-gray-600">IR Slots</div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Roster configuration cannot be changed after team creation.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Save Changes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Changes</h3>
            {hasUnsavedChanges ? (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">You have unsaved changes</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={updateTeamMutation.isPending}
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{updateTeamMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-800">All changes saved</p>
              </div>
            )}
          </div>

          {/* Team Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">
                  {new Date(team.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Players:</span>
                <span className="font-medium">{team.roster_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Team ID:</span>
                <span className="font-mono text-xs text-gray-500">{team.id}</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-red-200">
            <h3 className="text-lg font-semibold text-red-700 mb-4">Danger Zone</h3>
            <p className="text-sm text-gray-600 mb-4">
              Once you delete a team, there is no going back. This will permanently delete your team
              and all associated data.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Team</span>
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-red-700">
                  Are you sure you want to delete "{team.name}"?
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleteTeamMutation.isPending}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
                  >
                    {deleteTeamMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
