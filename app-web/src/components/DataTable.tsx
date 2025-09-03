'use client';

import React, { useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  OnChangeFn,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { cn, generateCsvContent } from '@/lib/utils';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  loading?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  enableSorting?: boolean;
  enableExport?: boolean;
  exportFilename?: string;
  stickyHeader?: boolean;
  maxHeight?: number;
}

export function DataTable<TData>({
  data,
  columns,
  loading = false,
  sorting = [],
  onSortingChange,
  enableSorting = true,
  enableExport = true,
  exportFilename = 'data',
  stickyHeader = true,
  maxHeight = 600,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange,
    state: {
      sorting,
    },
    enableSorting,
  });

  const { rows } = table.getRowModel();
  
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  const handleExport = () => {
    if (data.length > 0) {
      generateCsvContent(data, exportFilename);
    }
  };

  const getSortingIcon = (isSorted: false | 'asc' | 'desc') => {
    if (isSorted === 'asc') {
      return <ArrowUp className="w-4 h-4" />;
    }
    if (isSorted === 'desc') {
      return <ArrowDown className="w-4 h-4" />;
    }
    return <ArrowUpDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {enableExport && data.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg">
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: `${maxHeight}px` }}
        >
          <table className="w-full">
            <thead className={cn(stickyHeader && "sticky top-0 z-10 bg-white")}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-gray-200">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            "flex items-center space-x-2",
                            header.column.getCanSort() && "cursor-pointer select-none"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {header.column.getCanSort() && (
                            <span className="text-gray-400">
                              {getSortingIcon(header.column.getIsSorted())}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr style={{ height: `${virtualizer.getTotalSize()}px` }}>
                <td />
              </tr>
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const row = rows[virtualItem.index];
                return (
                  <tr
                    key={row.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    className="hover:bg-gray-50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-2 text-sm text-gray-900"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {data.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No data available
        </div>
      )}
    </div>
  );
}