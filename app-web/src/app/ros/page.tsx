'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useROSProjections } from '@/lib/queries';
import { ROSItem, ROSList } from '@/lib/api-types';
import { apiClient } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { Filters } from '@/components/Filters';
import { Pagination } from '@/components/Pagination';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { formatNumber } from '@/lib/utils';

export default function ROSPage() {
  const [filters, setFilters] = useState({
    search: '',
    position: '',
    team: '',
    scoring: 'ppr',
    season: 2024,
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
  });

  const [sorting, setSorting] = useState([{ id: 'proj_total', desc: true }]);

  const queryParams = {
    scoring: filters.scoring,
    search: filters.search || undefined,
    position: filters.position || undefined,
    team: filters.team || undefined,
    sort_by: sorting[0]?.id || 'proj_total',
    sort_desc: sorting[0]?.desc ?? true,
    limit: pagination.pageSize,
    offset: (pagination.page - 1) * pagination.pageSize,
  };

  // React Query approach
  const { data, isLoading, error } = useROSProjections(filters.season, queryParams);

  // Remove hardcoded data - now using React Query only

  const columns: ColumnDef<ROSItem>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Player',
      cell: ({ row }) => (
        <div>
          <Link 
            href={`/players/${row.original.player_id}`}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {row.original.name}
          </Link>
          <div className="text-sm text-gray-500">
            {row.original.position} • {row.original.team}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'proj_total',
      header: 'ROS Total',
      cell: ({ getValue }) => (
        <span className="font-semibold text-blue-600">
          {formatNumber(getValue() as number)}
        </span>
      ),
    },
    {
      accessorKey: 'low',
      header: 'Low',
      cell: ({ getValue }) => formatNumber(getValue() as number),
    },
    {
      accessorKey: 'high',
      header: 'High',
      cell: ({ getValue }) => formatNumber(getValue() as number),
    },
    {
      id: 'weekly_avg',
      header: 'Weekly Avg',
      cell: ({ row }) => {
        const weeksRemaining = 18 - 10; // Simplified calculation
        const weeklyAvg = row.original.proj_total / weeksRemaining;
        return formatNumber(weeklyAvg);
      },
    },
    {
      id: 'range',
      header: 'Range',
      cell: ({ row }) => {
        const range = row.original.high - row.original.low;
        const rangePct = (range / row.original.proj_total) * 100;
        return (
          <div className="text-xs">
            <div>±{formatNumber(range / 2)}</div>
            <div className="text-gray-500">({formatNumber(rangePct)}%)</div>
          </div>
        );
      },
    },
  ], []);

  const handleClearFilters = () => {
    setFilters(prev => ({
      ...prev,
      search: '',
      position: '',
      team: '',
    }));
    setPagination({ page: 1, pageSize: 50 });
  };

  const totalPages = Math.ceil(((data as ROSList)?.total || 0) / pagination.pageSize);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Rest of Season Projections
        </h1>
        <p className="text-gray-600">
          {filters.season} Season • {filters.scoring.toUpperCase()} Scoring
        </p>
      </div>

      <div className="space-y-6">
        <Filters
          searchValue={filters.search}
          onSearchChange={(value) => setFilters(prev => ({ ...prev, search: value }))}
          
          positionValue={filters.position}
          onPositionChange={(value) => setFilters(prev => ({ ...prev, position: value }))}
          
          teamValue={filters.team}
          onTeamChange={(value) => setFilters(prev => ({ ...prev, team: value }))}
          
          scoringValue={filters.scoring}
          onScoringChange={(value) => setFilters(prev => ({ ...prev, scoring: value }))}
          
          customFilters={[
            {
              key: 'season',
              label: 'Season',
              value: filters.season.toString(),
              onChange: (value) => setFilters(prev => ({ ...prev, season: parseInt(value) })),
              options: [
                { label: '2024', value: '2024' },
                { label: '2023', value: '2023' },
              ],
            },
          ]}
          
          onClearFilters={handleClearFilters}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">
              Error loading ROS projections: {error.message}
            </div>
          </div>
        )}


        {isLoading ? (
          <TableSkeleton />
        ) : (
          <DataTable
            data={(data as ROSList)?.items || []}
            columns={columns}
            loading={isLoading}
            sorting={sorting}
            onSortingChange={setSorting}
            exportFilename={`ros-projections-${filters.season}`}
          />
        )}

        {data ? (
          <Pagination
            currentPage={pagination.page}
            totalPages={totalPages}
            pageSize={pagination.pageSize}
            totalItems={(data as ROSList)?.total || 0}
            onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
            onPageSizeChange={(pageSize) => 
              setPagination({ page: 1, pageSize })
            }
          />
        ) : null}
      </div>
    </div>
  );
}