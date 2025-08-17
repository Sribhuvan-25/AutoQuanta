'use client';

import React from 'react';
import { Hash, Calendar, Tag, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ColumnInfo } from '@/lib/types';

interface ColumnCardProps {
  column: ColumnInfo;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function ColumnCard({ column, isSelected, onSelect, className }: ColumnCardProps) {
  const getDataTypeIcon = (dtype: string) => {
    if (dtype.includes('int') || dtype.includes('float')) {
      return <Hash className="h-4 w-4" />;
    }
    if (dtype.includes('datetime')) {
      return <Calendar className="h-4 w-4" />;
    }
    return <Tag className="h-4 w-4" />;
  };

  const getDataTypeColor = (dtype: string) => {
    if (dtype.includes('int') || dtype.includes('float')) {
      return 'text-blue-600 bg-blue-50';
    }
    if (dtype.includes('datetime')) {
      return 'text-purple-600 bg-purple-50';
    }
    return 'text-green-600 bg-green-50';
  };

  const getMissingStatus = (percentage: number) => {
    if (percentage === 0) {
      return { color: 'text-green-600', icon: '✅', label: 'Complete' };
    }
    if (percentage < 5) {
      return { color: 'text-yellow-600', icon: '⚠️', label: 'Good' };
    }
    return { color: 'text-red-600', icon: '❌', label: 'High missing' };
  };

  const missingStatus = getMissingStatus(column.missing_percentage);

  // Type guard for numeric stats
  const isNumericStats = (stats: Record<string, unknown>): stats is Record<string, number> => {
    return typeof stats.mean === 'number' || typeof stats.min === 'number';
  };

  // Type guard for categorical stats
  const isCategoricalStats = (stats: Record<string, unknown>): stats is { top_categories: Array<{ value: string; count: number }> } => {
    return Array.isArray(stats.top_categories);
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all hover:shadow-md',
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white',
        className
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-x-2">
          {getDataTypeIcon(column.dtype)}
          <h3 className="font-medium text-gray-900 truncate">{column.name}</h3>
        </div>
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
          getDataTypeColor(column.dtype)
        )}>
          {column.dtype}
        </span>
      </div>

      {/* Missing data indicator */}
      <div className="mb-3">
        <div className="flex items-center gap-x-2 mb-1">
          <span className="text-sm text-gray-600">Missing:</span>
          <span className={cn('text-sm font-medium', missingStatus.color)}>
            {missingStatus.icon} {missingStatus.label}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gray-400 h-2 rounded-full"
            style={{ width: `${column.missing_percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {column.missing_count} of {column.missing_count + (column.unique_count / column.unique_percentage * 100)} values ({column.missing_percentage.toFixed(1)}%)
        </p>
      </div>

      {/* Statistics */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Unique values:</span>
          <span className="font-medium text-gray-900">{column.unique_count.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Memory usage:</span>
          <span className="font-medium text-gray-900">
            {(column.memory_usage / 1024).toFixed(1)} KB
          </span>
        </div>

        {/* Basic stats for numeric columns */}
        {column.dtype.includes('int') || column.dtype.includes('float') ? (
          <div className="pt-2 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {isNumericStats(column.stats) && column.stats.mean !== undefined && (
                <div>
                  <span className="text-gray-500">Mean:</span>
                  <span className="ml-1 font-medium">{column.stats.mean.toFixed(2)}</span>
                </div>
              )}
              {isNumericStats(column.stats) && column.stats.std !== undefined && (
                <div>
                  <span className="text-gray-500">Std:</span>
                  <span className="ml-1 font-medium">{column.stats.std.toFixed(2)}</span>
                </div>
              )}
              {isNumericStats(column.stats) && column.stats.min !== undefined && (
                <div>
                  <span className="text-gray-500">Min:</span>
                  <span className="ml-1 font-medium">{column.stats.min.toFixed(2)}</span>
                </div>
              )}
              {isNumericStats(column.stats) && column.stats.max !== undefined && (
                <div>
                  <span className="text-gray-500">Max:</span>
                  <span className="ml-1 font-medium">{column.stats.max.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          // For categorical columns, show top categories
          isCategoricalStats(column.stats) && (
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Top categories:</div>
              <div className="space-y-1">
                {column.stats.top_categories.slice(0, 3).map((cat, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="truncate">{cat.value}</span>
                    <span className="font-medium">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Warnings */}
      {column.warnings.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-x-1 text-xs text-yellow-600">
            <AlertTriangle className="h-3 w-3" />
            <span>{column.warnings.length} warning{column.warnings.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
}
