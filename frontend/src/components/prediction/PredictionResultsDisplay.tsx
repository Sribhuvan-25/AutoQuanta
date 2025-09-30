'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Table2,
  Eye,
  EyeOff,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PredictionResult } from '@/lib/types';

interface PredictionResultsDisplayProps {
  results: PredictionResult;
  taskType: 'classification' | 'regression';
  onExport?: () => void;
  className?: string;
}

export function PredictionResultsDisplay({
  results,
  taskType,
  onExport,
  className
}: PredictionResultsDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'table'>('summary');

  const predictions = results.predictions;
  const probabilities = results.probabilities;
  const metadata = results.prediction_metadata;

  // Calculate statistics
  const stats = {
    total: predictions.length,
    mean: predictions.reduce((a, b) => a + b, 0) / predictions.length,
    min: Math.min(...predictions),
    max: Math.max(...predictions),
    median: [...predictions].sort((a, b) => a - b)[Math.floor(predictions.length / 2)]
  };

  // For classification, count class predictions
  const classCounts = taskType === 'classification'
    ? predictions.reduce((acc, pred) => {
        acc[pred] = (acc[pred] || 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    : null;

  // Format prediction value
  const formatPrediction = (value: number): string => {
    if (taskType === 'classification') {
      return `Class ${value}`;
    }
    return value.toFixed(4);
  };

  // Format probability
  const formatProbability = (prob: number): string => {
    return `${(prob * 100).toFixed(1)}%`;
  };

  // Get confidence level
  const getConfidenceLevel = (prob: number): { label: string; color: string } => {
    if (prob >= 0.8) return { label: 'High', color: 'text-green-600 bg-green-50' };
    if (prob >= 0.6) return { label: 'Medium', color: 'text-yellow-600 bg-yellow-50' };
    return { label: 'Low', color: 'text-red-600 bg-red-50' };
  };

  // Export results
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      // Default CSV export
      const headers = ['Index', 'Prediction'];
      if (probabilities) {
        headers.push('Confidence');
      }

      const rows = predictions.map((pred, idx) => {
        const row = [idx + 1, pred];
        if (probabilities && probabilities[idx]) {
          const maxProb = Math.max(...probabilities[idx]);
          row.push(maxProb);
        }
        return row.join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `predictions_${new Date().toISOString()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Prediction Results</h3>
              <p className="text-sm text-gray-600">
                {stats.total} prediction{stats.total !== 1 ? 's' : ''} completed
                {metadata && ` • ${metadata.model_name}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Details
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Details
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* View Mode Tabs */}
        {showDetails && (
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setViewMode('summary')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === 'summary'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <BarChart3 className="h-4 w-4 inline mr-1" />
              Summary
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === 'table'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <Table2 className="h-4 w-4 inline mr-1" />
              Table
            </button>
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-medium text-blue-700">Total</p>
            </div>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-xs font-medium text-green-700">
                {taskType === 'classification' ? 'Most Common' : 'Maximum'}
              </p>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {formatPrediction(stats.max)}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <p className="text-xs font-medium text-orange-700">
                {taskType === 'classification' ? 'Least Common' : 'Minimum'}
              </p>
            </div>
            <p className="text-2xl font-bold text-orange-900">
              {formatPrediction(stats.min)}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <p className="text-xs font-medium text-purple-700">
                {taskType === 'classification' ? 'Classes' : 'Mean'}
              </p>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {taskType === 'classification'
                ? Object.keys(classCounts || {}).length
                : stats.mean.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Detailed Views */}
        {showDetails && (
          <div className="mt-6">
            {/* Summary View */}
            {viewMode === 'summary' && (
              <div className="space-y-4">
                {/* Classification Distribution */}
                {taskType === 'classification' && classCounts && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Class Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(classCounts)
                        .sort(([, a], [, b]) => b - a)
                        .map(([classLabel, count]) => {
                          const percentage = (count / stats.total) * 100;
                          return (
                            <div key={classLabel} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700">
                                  Class {classLabel}
                                </span>
                                <span className="text-gray-600">
                                  {count} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Regression Statistics */}
                {taskType === 'regression' && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Statistical Summary</h4>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm text-gray-600">Mean</dt>
                        <dd className="text-lg font-semibold text-gray-900">
                          {stats.mean.toFixed(4)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-600">Median</dt>
                        <dd className="text-lg font-semibold text-gray-900">
                          {stats.median.toFixed(4)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-600">Range</dt>
                        <dd className="text-lg font-semibold text-gray-900">
                          {(stats.max - stats.min).toFixed(4)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-600">Std Dev</dt>
                        <dd className="text-lg font-semibold text-gray-900">
                          {Math.sqrt(
                            predictions.reduce((sum, val) =>
                              sum + Math.pow(val - stats.mean, 2), 0
                            ) / predictions.length
                          ).toFixed(4)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                {/* Confidence Warning for Low Confidence Predictions */}
                {probabilities && metadata?.confidence_scores && (
                  <>
                    {metadata.confidence_scores.filter(c => c < 0.6).length > 0 && (
                      <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-900">
                            Low Confidence Warning
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            {metadata.confidence_scores.filter(c => c < 0.6).length} prediction(s)
                            have confidence below 60%. Review these carefully.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">#</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Prediction</th>
                      {probabilities && (
                        <>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Confidence</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Level</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {predictions.slice(0, 100).map((pred, idx) => {
                      const prob = probabilities?.[idx];
                      const maxProb = prob ? Math.max(...prob) : undefined;
                      const confidence = maxProb ? getConfidenceLevel(maxProb) : null;

                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-600">{idx + 1}</td>
                          <td className="px-4 py-2 font-medium text-gray-900">
                            {formatPrediction(pred)}
                          </td>
                          {probabilities && (
                            <>
                              <td className="px-4 py-2 text-gray-700">
                                {maxProb ? formatProbability(maxProb) : 'N/A'}
                              </td>
                              <td className="px-4 py-2">
                                {confidence && (
                                  <span className={cn(
                                    'px-2 py-1 text-xs font-medium rounded-full',
                                    confidence.color
                                  )}>
                                    {confidence.label}
                                  </span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {predictions.length > 100 && (
                  <p className="text-xs text-gray-500 text-center mt-3">
                    Showing first 100 of {predictions.length} predictions. Export to see all.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}