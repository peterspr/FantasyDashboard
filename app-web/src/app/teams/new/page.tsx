"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import { useCreateTeam } from '../../../lib/team-hooks';
import { useAuth } from '../../../lib/auth-context';
import type { CreateTeamRequest, RosterPositions } from '../../../lib/api-types';
import Link from 'next/link';

const DEFAULT_ROSTER: RosterPositions = {
  starters: {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,
    K: 1,
    DST: 1,
  },
  bench: 6,
  ir: 1,
};

const POSITION_LABELS: Record<string, string> = {
  QB: 'Quarterback',
  RB: 'Running Back',
  WR: 'Wide Receiver', 
  TE: 'Tight End',
  FLEX: 'Flex (RB/WR/TE)',
  SUPER_FLEX: 'Super Flex (All)',
  K: 'Kicker',
  DST: 'Defense/Special Teams',
};

export default function NewTeamPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const createTeamMutation = useCreateTeam();
  
  const [formData, setFormData] = useState<CreateTeamRequest>({
    name: '',
    league_name: '',
    scoring_system: 'ppr',
    league_size: 12,
    roster_positions: DEFAULT_ROSTER,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.push('/teams');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    }
    if (formData.league_size < 4 || formData.league_size > 32) {
      newErrors.league_size = 'League size must be between 4 and 32';
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      const team = await createTeamMutation.mutateAsync(formData);
      router.push(`/teams/${team.id}`);
    } catch (error) {
      console.error('Failed to create team:', error);
      setErrors({ submit: 'Failed to create team. Please try again.' });
    }
  };

  const updateStarterPosition = (position: string, count: number) => {
    if (count <= 0) {
      // Remove position if count is 0
      const { [position]: removed, ...rest } = formData.roster_positions.starters;
      setFormData({
        ...formData,
        roster_positions: {
          ...formData.roster_positions,
          starters: rest,
        },
      });
    } else {
      setFormData({
        ...formData,
        roster_positions: {
          ...formData.roster_positions,
          starters: {
            ...formData.roster_positions.starters,
            [position]: count,
          },
        },
      });
    }
  };

  const addPosition = (position: string) => {
    updateStarterPosition(position, 1);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link 
          href="/teams"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Teams
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Team</h1>
        <p className="text-gray-600 mt-1">Set up your fantasy football team configuration</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter team name"
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              League Name
            </label>
            <input
              type="text"
              value={formData.league_name}
              onChange={(e) => setFormData({ ...formData, league_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter league name (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scoring System
              </label>
              <select
                value={formData.scoring_system}
                onChange={(e) => setFormData({ ...formData, scoring_system: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ppr">PPR (Point per Reception)</option>
                <option value="half_ppr">Half PPR</option>
                <option value="standard">Standard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                League Size
              </label>
              <input
                type="number"
                min="4"
                max="32"
                value={formData.league_size}
                onChange={(e) => setFormData({ ...formData, league_size: parseInt(e.target.value) || 12 })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.league_size ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.league_size && <p className="text-red-600 text-sm mt-1">{errors.league_size}</p>}
            </div>
          </div>
        </div>

        {/* Roster Configuration */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Roster Configuration</h2>
          
          <div className="space-y-3">
            <h3 className="text-md font-medium text-gray-800">Starting Positions</h3>
            {Object.entries(formData.roster_positions.starters).map(([position, count]) => (
              <div key={position} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                <span className="font-medium text-gray-700">
                  {POSITION_LABELS[position] || position}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => updateStarterPosition(position, count - 1)}
                    className="p-1 text-gray-500 hover:text-red-600 rounded"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{count}</span>
                  <button
                    type="button"
                    onClick={() => updateStarterPosition(position, count + 1)}
                    className="p-1 text-gray-500 hover:text-green-600 rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {/* Add position selector */}
            <div className="mt-3">
              <select
                value=""
                onChange={(e) => e.target.value && addPosition(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Add Position...</option>
                {Object.entries(POSITION_LABELS)
                  .filter(([pos]) => !formData.roster_positions.starters[pos])
                  .map(([pos, label]) => (
                    <option key={pos} value={pos}>{label}</option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bench Slots
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.roster_positions.bench}
                onChange={(e) => setFormData({
                  ...formData,
                  roster_positions: {
                    ...formData.roster_positions,
                    bench: parseInt(e.target.value) || 1,
                  },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IR Slots
              </label>
              <input
                type="number"
                min="0"
                max="5"
                value={formData.roster_positions.ir || 0}
                onChange={(e) => setFormData({
                  ...formData,
                  roster_positions: {
                    ...formData.roster_positions,
                    ir: parseInt(e.target.value) || 0,
                  },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Error display */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{errors.submit}</p>
          </div>
        )}

        {/* Submit buttons */}
        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={createTeamMutation.isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
          >
            {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
          </button>
          <Link
            href="/teams"
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md font-medium text-center transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}