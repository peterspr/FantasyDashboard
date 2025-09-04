'use client';

import React, { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useWeeklyProjections } from '@/lib/queries';
import { ProjectionItem, ProjectionList } from '@/lib/api-types';
import { DataTable } from '@/components/DataTable';
import { Filters } from '@/components/Filters';
import { Pagination } from '@/components/Pagination';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { formatNumber } from '@/lib/utils';

export default function ProjectionsPage() {
  const [filters, setFilters] = useState({
    search: '',
    position: '',
    team: '',
    scoring: 'ppr',
    season: 2025,
    week: 1,
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
  });

  const [sorting, setSorting] = useState([{ id: 'proj', desc: true }]);

  const queryParams = {
    scoring: filters.scoring,
    search: filters.search || undefined,
    position: filters.position || undefined,
    team: filters.team || undefined,
    sort_by: sorting[0]?.id || 'proj',
    sort_desc: sorting[0]?.desc ?? true,
    limit: pagination.pageSize,
    offset: (pagination.page - 1) * pagination.pageSize,
  };

  const { data, isLoading, error } = useWeeklyProjections(
    filters.season,
    filters.week,
    queryParams
  ) as { data: ProjectionList | undefined; isLoading: boolean; error: any };


  const columns: ColumnDef<ProjectionItem>[] = useMemo(() => [
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
      accessorKey: 'proj',
      header: 'Projection',
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
      id: 'components',
      header: 'Key Stats',
      cell: ({ row }) => {
        const comp = row.original.components;
        const position = row.original.position;
        
        const getPositionStats = () => {
          switch (position) {
            case 'QB':
              return (
                <>
                  {comp.pass_yds_pred && <div>Pass Yds: {formatNumber(comp.pass_yds_pred)}</div>}
                  {comp.rush_yds_pred && <div>Rush Yds: {formatNumber(comp.rush_yds_pred)}</div>}
                  {comp.total_td_pred && <div>Total TD: {formatNumber(comp.total_td_pred)}</div>}
                </>
              );
            case 'RB':
              return (
                <>
                  {comp.rush_yds_pred && <div>Rush Yds: {formatNumber(comp.rush_yds_pred)}</div>}
                  {comp.rec_yds_pred && <div>Rec Yds: {formatNumber(comp.rec_yds_pred)}</div>}
                  {comp.total_td_pred && <div>Total TD: {formatNumber(comp.total_td_pred)}</div>}
                </>
              );
            case 'WR':
            case 'TE':
              return (
                <>
                  {comp.rec_yds_pred && <div>Rec Yds: {formatNumber(comp.rec_yds_pred)}</div>}
                  {comp.rec_pred && <div>Rec: {formatNumber(comp.rec_pred)}</div>}
                  {comp.total_td_pred && <div>Total TD: {formatNumber(comp.total_td_pred)}</div>}
                </>
              );
            default:
              return (
                <>
                  {comp.targets_pred && <div>Tgt: {formatNumber(comp.targets_pred)}</div>}
                  {comp.rec_pred && <div>Rec: {formatNumber(comp.rec_pred)}</div>}
                  {comp.rush_att_pred && <div>Rush: {formatNumber(comp.rush_att_pred)}</div>}
                </>
              );
          }
        };

        return (
          <div className="text-xs space-y-1">
            {getPositionStats()}
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

  const totalPages = Math.ceil((data?.total || 0) / pagination.pageSize);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Weekly Projections
        </h1>
        <p className="text-gray-600">
          Week {filters.week}, {filters.season} • {filters.scoring.toUpperCase()} Scoring
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
                { label: '2025', value: '2025' },
                { label: '2024', value: '2024' },
                { label: '2023', value: '2023' },
              ],
            },
            {
              key: 'week',
              label: 'Week',
              value: filters.week.toString(),
              onChange: (value) => setFilters(prev => ({ ...prev, week: parseInt(value) })),
              options: Array.from({ length: 18 }, (_, i) => ({
                label: `Week ${i + 1}`,
                value: (i + 1).toString(),
              })),
            },
          ]}
          
          onClearFilters={handleClearFilters}
        />


        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">
              Error loading projections: {error.message}
            </div>
          </div>
        )}

        {isLoading ? (
          <TableSkeleton />
        ) : (
          <DataTable
            data={data?.items || []}
            columns={columns}
            loading={isLoading}
            sorting={sorting}
            onSortingChange={setSorting}
            exportFilename={`projections-${filters.season}-week${filters.week}`}
          />
        )}

        {data && (
          <Pagination
            currentPage={pagination.page}
            totalPages={totalPages}
            pageSize={pagination.pageSize}
            totalItems={data.total}
            onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
            onPageSizeChange={(pageSize) => 
              setPagination({ page: 1, pageSize })
            }
          />
        )}
      </div>
    </div>
  );
}