'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  GitBranch,
  ChevronDown,
  ChevronRight,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModelVersion {
  version: string;
  model_id: string;
  score: number;
  created_at: string;
  changes?: string;
  is_current?: boolean;
  metrics?: {
    [key: string]: number;
  };
  tags?: string[];
  notes?: string;
}

interface ModelVersioningProps {
  modelName: string;
  taskType: 'classification' | 'regression';
  versions: ModelVersion[];
  currentVersion?: string;
  onVersionSelect?: (version: string) => void;
  onRollback?: (version: string) => void;
  onDownload?: (version: string) => void;
  onCompare?: (version1: string, version2: string) => void;
  className?: string;
}

export function ModelVersioning({
  modelName,
  taskType,
  versions,
  currentVersion,
  onVersionSelect,
  onRollback,
  onDownload,
  onCompare,
  className
}: ModelVersioningProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set([versions[0]?.version]));
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set());

  const toggleVersion = (version: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(version)) {
      newExpanded.delete(version);
    } else {
      newExpanded.add(version);
    }
    setExpandedVersions(newExpanded);
  };

  const toggleComparisonSelection = (version: string) => {
    const newSelected = new Set(selectedForComparison);
    if (newSelected.has(version)) {
      newSelected.delete(version);
    } else {
      if (newSelected.size >= 2) {
        // Remove the oldest selection
        const firstItem = newSelected.values().next().value;
        newSelected.delete(firstItem);
      }
      newSelected.add(version);
    }
    setSelectedForComparison(newSelected);
  };

  const formatScore = (score: number): string => {
    if (taskType === 'regression') {
      return `R² ${score.toFixed(4)}`;
    }
    return `${(score * 100).toFixed(1)}% Acc`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreDelta = (currentScore: number, previousScore?: number): {
    value: number;
    trend: 'up' | 'down' | 'same';
  } => {
    if (!previousScore) return { value: 0, trend: 'same' };
    const delta = currentScore - previousScore;
    if (Math.abs(delta) < 0.001) return { value: 0, trend: 'same' };
    return {
      value: delta,
      trend: delta > 0 ? 'up' : 'down'
    };
  };

  const handleCompare = () => {
    if (selectedForComparison.size === 2) {
      const [v1, v2] = Array.from(selectedForComparison);
      onCompare?.(v1, v2);
    }
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Version History</h3>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {versions.length} versions
          </span>
        </div>
        {selectedForComparison.size === 2 && (
          <Button
            size="sm"
            onClick={handleCompare}
          >
            Compare Selected
          </Button>
        )}
      </div>

      {/* Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-900">
          <p>Select up to 2 versions to compare. Click on a version to expand details.</p>
        </div>
      </div>

      {/* Version Timeline */}
      <div className="space-y-2">
        {versions.map((version, index) => {
          const isExpanded = expandedVersions.has(version.version);
          const isSelected = selectedForComparison.has(version.version);
          const isCurrent = version.is_current || version.version === currentVersion;
          const previousVersion = index < versions.length - 1 ? versions[index + 1] : undefined;
          const scoreDelta = getScoreDelta(version.score, previousVersion?.score);

          return (
            <div
              key={version.version}
              className={cn(
                'border rounded-lg transition-all',
                isCurrent ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white',
                isSelected && 'ring-2 ring-blue-400'
              )}
            >
              {/* Version Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => toggleVersion(version.version)}
                      className="mt-1 text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    {/* Version Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          v{version.version}
                        </h4>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Current
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(version.created_at)}
                        </div>
                      </div>

                      {/* Score with Delta */}
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm">
                          {formatScore(version.score)}
                        </div>
                        {scoreDelta.trend !== 'same' && (
                          <div className={cn(
                            'flex items-center gap-1 text-xs font-medium',
                            scoreDelta.trend === 'up' ? 'text-green-600' : 'text-red-600'
                          )}>
                            {scoreDelta.trend === 'up' ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {taskType === 'regression'
                              ? scoreDelta.value.toFixed(4)
                              : `${(scoreDelta.value * 100).toFixed(1)}%`
                            }
                          </div>
                        )}
                        {scoreDelta.trend === 'same' && index > 0 && (
                          <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                            <Minus className="h-3 w-3" />
                            No change
                          </div>
                        )}
                      </div>

                      {/* Changes */}
                      {version.changes && (
                        <p className="text-sm text-gray-600 mt-2">{version.changes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleComparisonSelection(version.version)}
                        disabled={!isSelected && selectedForComparison.size >= 2}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </Button>
                      {onDownload && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownload(version.version)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {!isCurrent && onRollback && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRollback(version.version)}
                        >
                          Rollback
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {/* Detailed Metrics */}
                    {version.metrics && Object.keys(version.metrics).length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-700 mb-2">Detailed Metrics:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(version.metrics).map(([key, value]) => (
                            <div key={key} className="p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-500 capitalize">
                                {key.replace(/_/g, ' ')}
                              </p>
                              <p className="text-sm font-medium text-gray-900">
                                {typeof value === 'number' ? value.toFixed(4) : value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {version.tags && version.tags.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-700 mb-2">Tags:</p>
                        <div className="flex flex-wrap gap-1">
                          {version.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {version.notes && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">Notes:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          {version.notes}
                        </p>
                      </div>
                    )}

                    {/* Warning for old versions */}
                    {!isCurrent && index > 2 && (
                      <div className="mt-4 p-2 bg-yellow-50 rounded flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-yellow-800">
                          This is an older version. Consider using a more recent version for better performance.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {versions.length === 0 && (
        <div className="text-center py-12">
          <GitBranch className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">No version history available</p>
        </div>
      )}
    </div>
  );
}
