import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-10 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = '300px' }: { height?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="w-full" style={{ height }} />
      <div className="flex justify-center gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('border border-gray-200 rounded-lg p-6 space-y-4', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function ModelCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <div className="flex gap-2 pt-2 border-t">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function TrainingProgressSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-8 rounded-full animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

export function DataPreviewSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="p-4">
        <TableSkeleton rows={rows} columns={5} />
      </div>
    </div>
  );
}

export function VisualizationGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ChartSkeleton key={i} height="250px" />
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}
