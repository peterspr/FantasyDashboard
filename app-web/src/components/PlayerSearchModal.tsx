"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, User, Plus } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import type { PlayerOut, PlayersParams, RosterSlot } from '../lib/api-types';

interface PlayerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlayer: (player: PlayerOut, rosterSlot: RosterSlot) => void;
  availableSlots: RosterSlot[];
  teamId: string;
  defaultSlot?: RosterSlot | null;
}

export function PlayerSearchModal({
  isOpen,
  onClose,
  onSelectPlayer,
  availableSlots,
  teamId,
  defaultSlot
}: PlayerSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [players, setPlayers] = useState<PlayerOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<RosterSlot | null>(null);

  // Get eligible positions for a roster slot
  const getEligiblePositions = (slot: RosterSlot | null): string[] => {
    if (!slot) return [];
    
    if (slot.type === 'bench' || slot.type === 'ir') {
      return ['QB', 'RB', 'WR', 'TE', 'K', 'DST']; // All positions eligible for bench/IR
    }
    
    // Starting positions
    switch (slot.position?.toLowerCase()) {
      case 'qb':
        return ['QB'];
      case 'rb':
        return ['RB'];
      case 'wr':
        return ['WR'];
      case 'te':
        return ['TE'];
      case 'flex':
        return ['RB', 'WR', 'TE'];
      case 'superflex':
        return ['QB', 'RB', 'WR', 'TE'];
      case 'k':
        return ['K'];
      case 'def':
      case 'dst':
        return ['DST'];
      default:
        return ['QB', 'RB', 'WR', 'TE', 'K', 'DST']; // Fallback to all positions
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedTeam('');
      
      // Use defaultSlot if provided and valid, otherwise use first available slot
      let slotToUse: RosterSlot | null = null;
      
      if (defaultSlot && availableSlots.some(s => 
        s.type === defaultSlot.type && 
        s.position === defaultSlot.position && 
        s.index === defaultSlot.index
      )) {
        slotToUse = defaultSlot;
      } else {
        slotToUse = availableSlots[0] || null;
      }
      
      setSelectedSlot(slotToUse);
      
      // Set position based on selected slot
      const eligiblePositions = getEligiblePositions(slotToUse);
      setSelectedPosition(eligiblePositions.length === 1 ? eligiblePositions[0] : '');
      
      setError(null);
      searchPlayers();
    }
  }, [isOpen, defaultSlot]);

  // Update position filter when slot changes
  useEffect(() => {
    const eligiblePositions = getEligiblePositions(selectedSlot);
    
    // If only one position is eligible, auto-select it
    if (eligiblePositions.length === 1) {
      setSelectedPosition(eligiblePositions[0]);
    } else if (eligiblePositions.length > 1 && !eligiblePositions.includes(selectedPosition)) {
      // Clear position if current selection is not eligible for the new slot
      setSelectedPosition('');
    }
  }, [selectedSlot]);

  // Search players when filters change
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchPlayers();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, selectedPosition, selectedTeam, isOpen]);

  const searchPlayers = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: PlayersParams = {
        limit: 50,
        offset: 0,
      };

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (selectedPosition) {
        params.position = selectedPosition;
      }
      if (selectedTeam) {
        params.team = selectedTeam;
      }

      const response = await apiClient.getPlayers(params);
      setPlayers(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search players');
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlayer = (player: PlayerOut) => {
    if (!selectedSlot) {
      setError('Please select a roster slot');
      return;
    }
    
    // Validate player position is eligible for selected slot
    const eligiblePositions = getEligiblePositions(selectedSlot);
    if (!eligiblePositions.includes(player.position || '')) {
      setError(`${player.position} players cannot be added to this slot. Eligible positions: ${eligiblePositions.join(', ')}`);
      return;
    }
    
    onSelectPlayer(player, selectedSlot);
  };

  // Available slot options grouped by type
  const slotOptions = useMemo(() => {
    const slots = {
      starter: [] as Array<{ slot: RosterSlot; label: string }>,
      bench: [] as Array<{ slot: RosterSlot; label: string }>,
      ir: [] as Array<{ slot: RosterSlot; label: string }>
    };

    availableSlots.forEach(slot => {
      const label = slot.type === 'starter' 
        ? `${slot.position}${slot.index > 1 ? slot.index : ''}`
        : slot.type === 'bench'
        ? `Bench ${slot.index}`
        : `IR ${slot.index}`;
      
      slots[slot.type].push({ slot, label });
    });

    return slots;
  }, [availableSlots]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <User className="w-6 h-6 mr-2" />
            Add Player to Roster
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Position Filter */}
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              disabled={getEligiblePositions(selectedSlot).length <= 1}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {getEligiblePositions(selectedSlot).length > 1 && (
                <option value="">All Eligible Positions</option>
              )}
              {getEligiblePositions(selectedSlot).map(position => (
                <option key={position} value={position}>{position}</option>
              ))}
            </select>

            {/* Team Filter */}
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Teams</option>
              <option value="ARI">ARI</option>
              <option value="ATL">ATL</option>
              <option value="BAL">BAL</option>
              <option value="BUF">BUF</option>
              <option value="CAR">CAR</option>
              <option value="CHI">CHI</option>
              <option value="CIN">CIN</option>
              <option value="CLE">CLE</option>
              <option value="DAL">DAL</option>
              <option value="DEN">DEN</option>
              <option value="DET">DET</option>
              <option value="GB">GB</option>
              <option value="HOU">HOU</option>
              <option value="IND">IND</option>
              <option value="JAX">JAX</option>
              <option value="KC">KC</option>
              <option value="LV">LV</option>
              <option value="LAC">LAC</option>
              <option value="LAR">LAR</option>
              <option value="MIA">MIA</option>
              <option value="MIN">MIN</option>
              <option value="NE">NE</option>
              <option value="NO">NO</option>
              <option value="NYG">NYG</option>
              <option value="NYJ">NYJ</option>
              <option value="PHI">PHI</option>
              <option value="PIT">PIT</option>
              <option value="SF">SF</option>
              <option value="SEA">SEA</option>
              <option value="TB">TB</option>
              <option value="TEN">TEN</option>
              <option value="WAS">WAS</option>
            </select>

            {/* Roster Slot Selector */}
            <select
              value={selectedSlot ? `${selectedSlot.type}-${selectedSlot.position || 'bench'}-${selectedSlot.index}` : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [type, position, index] = e.target.value.split('-');
                  const slot = availableSlots.find(s => 
                    s.type === type && 
                    (s.position || 'bench') === position && 
                    s.index === parseInt(index)
                  );
                  setSelectedSlot(slot || null);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Slot</option>
              {slotOptions.starter.length > 0 && (
                <optgroup label="Starting Lineup">
                  {slotOptions.starter.map(({ slot, label }) => (
                    <option key={`starter-${slot.position}-${slot.index}`} value={`${slot.type}-${slot.position}-${slot.index}`}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              )}
              {slotOptions.bench.length > 0 && (
                <optgroup label="Bench">
                  {slotOptions.bench.map(({ slot, label }) => (
                    <option key={`bench-${slot.index}`} value={`${slot.type}-bench-${slot.index}`}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              )}
              {slotOptions.ir.length > 0 && (
                <optgroup label="Injured Reserve">
                  {slotOptions.ir.map(({ slot, label }) => (
                    <option key={`ir-${slot.index}`} value={`${slot.type}-ir-${slot.index}`}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="p-6">
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-3 p-3 bg-gray-100 rounded-md">
                    <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-96">
              {players.length > 0 ? (
                <div className="p-4 space-y-2">
                  {players.map((player) => (
                    <div
                      key={player.player_id}
                      className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-md transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-700">
                            {player.position || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{player.name}</div>
                          <div className="text-sm text-gray-600">
                            {player.team} • {player.position}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectPlayer(player)}
                        disabled={!selectedSlot}
                        className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No players found</p>
                  <p className="text-sm">Try adjusting your search criteria</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {availableSlots.length > 0 ? (
              `${availableSlots.length} available slot${availableSlots.length !== 1 ? 's' : ''}`
            ) : (
              'No available slots'
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}