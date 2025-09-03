'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200",
        className
      )}
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {/* Table header */}
      <div className="flex space-x-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-18" />
        <Skeleton className="h-4 w-16" />
      </div>
      
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-64 w-full" />
      <div className="flex justify-center space-x-6">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 border border-gray-200 rounded-lg space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function PlayerDetailSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="flex space-x-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Table */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <TableSkeleton rows={10} />
      </div>
    </div>
  );
}