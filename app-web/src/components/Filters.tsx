'use client';

import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { cn, debounce } from '@/lib/utils';

interface FilterOption {
  label: string;
  value: string;
}

interface FiltersProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  
  positionValue?: string;
  onPositionChange?: (value: string) => void;
  positionOptions?: FilterOption[];
  
  teamValue?: string;
  onTeamChange?: (value: string) => void;
  teamOptions?: FilterOption[];
  
  scoringValue?: string;
  onScoringChange?: (value: string) => void;
  scoringOptions?: FilterOption[];
  
  customFilters?: Array<{
    key: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
  }>;
  
  onClearFilters?: () => void;
  className?: string;
}

const DEFAULT_POSITION_OPTIONS: FilterOption[] = [
  { label: 'All Positions', value: '' },
  { label: 'QB', value: 'QB' },
  { label: 'RB', value: 'RB' },
  { label: 'WR', value: 'WR' },
  { label: 'TE', value: 'TE' },
  { label: 'K', value: 'K' },
  { label: 'DST', value: 'DST' },
];

const DEFAULT_SCORING_OPTIONS: FilterOption[] = [
  { label: 'PPR', value: 'ppr' },
  { label: 'Half PPR', value: 'half_ppr' },
  { label: 'Standard', value: 'standard' },
];

export function Filters({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search players...',
  
  positionValue = '',
  onPositionChange,
  positionOptions = DEFAULT_POSITION_OPTIONS,
  
  teamValue = '',
  onTeamChange,
  teamOptions = [],
  
  scoringValue = 'ppr',
  onScoringChange,
  scoringOptions = DEFAULT_SCORING_OPTIONS,
  
  customFilters = [],
  onClearFilters,
  className,
}: FiltersProps) {
  const [localSearch, setLocalSearch] = useState(searchValue);
  
  const debouncedSearchChange = debounce((value: string) => {
    onSearchChange?.(value);
  }, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);
    debouncedSearchChange(value);
  };

  const hasActiveFilters = 
    searchValue || 
    positionValue || 
    teamValue || 
    customFilters.some(f => f.value);

  return (
    <div className={cn("space-y-4 p-4 bg-gray-50 rounded-lg", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </h3>
        {hasActiveFilters && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <X className="w-4 h-4 mr-1" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        {onSearchChange && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={localSearch}
              onChange={handleSearchChange}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Position */}
        {onPositionChange && (
          <select
            value={positionValue}
            onChange={(e) => onPositionChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {positionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {/* Team */}
        {onTeamChange && teamOptions.length > 0 && (
          <select
            value={teamValue}
            onChange={(e) => onTeamChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Teams</option>
            {teamOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {/* Scoring */}
        {onScoringChange && (
          <select
            value={scoringValue}
            onChange={(e) => onScoringChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {scoringOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {/* Custom Filters */}
        {customFilters.map((filter) => (
          <select
            key={filter.key}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}