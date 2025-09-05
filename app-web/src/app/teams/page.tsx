"use client";

import { useState } from 'react';
import { Plus, Users, Calendar, Settings, Trash2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { useTeams, useDeleteTeam } from '../../lib/team-hooks';
import { LoginButton } from '../../components/auth/LoginButton';
import Link from 'next/link';

export default function TeamsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: teams, isLoading: teamsLoading, error } = useTeams();
  const deleteTeamMutation = useDeleteTeam();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDeleteTeam = async (teamId: string) => {
    if (deleteConfirm === teamId) {
      try {
        await deleteTeamMutation.mutateAsync(teamId);
        setDeleteConfirm(null);
      } catch (error) {
        console.error('Failed to delete team:', error);
      }
    } else {
      setDeleteConfirm(teamId);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  // Show login prompt if not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Teams</h1>
          <p className="text-gray-600 mb-6">
            Sign in to create and manage your fantasy teams
          </p>
          <LoginButton />
        </div>
      </div>
    );
  }

  if (authLoading || teamsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6">
                <div className="h-6 bg-gray-300 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Failed to load teams: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Teams</h1>
          <p className="text-gray-600 mt-1">
            Manage your fantasy football teams and rosters
          </p>
        </div>
        <Link
          href="/teams/new"
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Team</span>
        </Link>
      </div>

      {teams && teams.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No teams yet</h2>
          <p className="text-gray-600 mb-6">
            Get started by creating your first fantasy team
          </p>
          <Link
            href="/teams/new"
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Your First Team</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams?.map((team) => (
            <div key={team.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {team.name}
                    </h3>
                    {team.league_name && (
                      <p className="text-sm text-gray-600">{team.league_name}</p>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <Link
                      href={`/teams/${team.id}/settings`}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
                      title="Team settings"
                    >
                      <Settings className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className={`p-2 rounded-md ${
                        deleteConfirm === team.id
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-gray-400 hover:text-red-600'
                      }`}
                      title={deleteConfirm === team.id ? 'Click again to confirm' : 'Delete team'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Scoring:</span>
                    <span className="font-medium capitalize">{team.scoring_system}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>League Size:</span>
                    <span className="font-medium">{team.league_size} teams</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Roster:</span>
                    <span className="font-medium">{team.roster_count} players</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-medium">
                      {new Date(team.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Link
                    href={`/teams/${team.id}`}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-md text-sm font-medium transition-colors"
                  >
                    View Team
                  </Link>
                  <Link
                    href={`/teams/${team.id}/roster`}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-center py-2 px-4 rounded-md text-sm font-medium transition-colors"
                  >
                    Manage Roster
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}