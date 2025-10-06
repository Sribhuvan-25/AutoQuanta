'use client';

import React from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Info, TrendingUp, Database, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataQualityReport, DataQualityIssue, StatisticalSummary } from '@/lib/data-profiler';

interface DataQualityReportProps {
  qualityReport: DataQualityReport;
  statisticalSummary: StatisticalSummary;
  className?: string;
}

export function DataQualityReport({ qualityReport, statisticalSummary, className }: DataQualityReportProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };


  const getSeverityColor = (severity: DataQualityIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getSeverityIcon = (severity: DataQualityIssue['severity']) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return AlertTriangle;
      case 'medium':
        return AlertCircle;
      case 'low':
        return Info;
    }
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overall Quality Score */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Data Quality Overview</h3>
          <div className={cn('px-3 py-1 rounded-full border text-sm font-medium', getScoreColor(qualityReport.overall_score))}>
            {formatPercentage(qualityReport.overall_score)} Quality Score
          </div>
        </div>

        {/* Quality Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{formatPercentage(qualityReport.completeness)}</div>
            <div className="text-sm text-gray-600">Completeness</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{formatPercentage(qualityReport.validity)}</div>
            <div className="text-sm text-gray-600">Validity</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{formatPercentage(qualityReport.uniqueness)}</div>
            <div className="text-sm text-gray-600">Uniqueness</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{formatPercentage(qualityReport.consistency)}</div>
            <div className="text-sm text-gray-600">Consistency</div>
          </div>
        </div>
      </div>

      {/* Dataset Statistics */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm p-6">
        <div className="flex items-center gap-x-3 mb-4">
          <Database className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Dataset Statistics</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xl font-bold text-blue-900">{statisticalSummary.dataset_info.total_rows.toLocaleString()}</div>
            <div className="text-xs text-blue-700">Total Rows</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-900">{statisticalSummary.dataset_info.total_columns}</div>
            <div className="text-xs text-green-700">Columns</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-xl font-bold text-purple-900">{statisticalSummary.dataset_info.complete_rows.toLocaleString()}</div>
            <div className="text-xs text-purple-700">Complete Rows</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-xl font-bold text-orange-900">{statisticalSummary.dataset_info.duplicate_rows}</div>
            <div className="text-xs text-orange-700">Duplicates</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-900">{statisticalSummary.dataset_info.memory_usage_mb.toFixed(1)} MB</div>
            <div className="text-xs text-gray-700">Memory Usage</div>
          </div>
        </div>

        {/* Column Types Breakdown */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Column Types</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(statisticalSummary.column_types).map(([type, count]) => (
              count > 0 && (
                <div key={type} className="px-2 py-1 bg-gray-100 rounded text-xs">
                  <span className="font-medium">{count}</span> {type}
                </div>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Quality Issues */}
      {qualityReport.issues.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm p-6">
          <div className="flex items-center gap-x-3 mb-4">
            <Activity className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Data Quality Issues</h3>
            <span className="text-sm text-gray-500">({qualityReport.issues.length} issues)</span>
          </div>

          <div className="space-y-3">
            {qualityReport.issues.map((issue, index) => {
              const SeverityIcon = getSeverityIcon(issue.severity);
              return (
                <div 
                  key={index}
                  className={cn('p-3 rounded-lg border', getSeverityColor(issue.severity))}
                >
                  <div className="flex items-start gap-x-3">
                    <SeverityIcon className="h-5 w-5 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-x-3">
                        <h4 className="font-medium truncate flex-1 min-w-0" title={issue.column}>
                          {issue.column}
                        </h4>
                        <div className="flex items-center gap-x-2 text-sm flex-shrink-0">
                          <span className="capitalize">{issue.severity}</span>
                          <span>•</span>
                          <span>{issue.count} affected</span>
                          <span>•</span>
                          <span>{issue.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <p className="text-sm mt-1">{issue.message}</p>
                      <p className="text-xs mt-1 opacity-75">💡 {issue.suggestion}</p>
                      {issue.examples && issue.examples.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium">Examples: </span>
                          <span className="text-xs font-mono">{issue.examples.slice(0, 3).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Missing Data Analysis */}
      {statisticalSummary.missing_data.total_missing > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm p-6">
          <div className="flex items-center gap-x-3 mb-4">
            <TrendingUp className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">Missing Data Analysis</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-center p-4 bg-red-50 rounded-lg mb-4">
                <div className="text-2xl font-bold text-red-900">
                  {statisticalSummary.missing_data.missing_percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-red-700">Total Missing Data</div>
                <div className="text-xs text-red-600 mt-1">
                  {statisticalSummary.missing_data.total_missing.toLocaleString()} values
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Columns with Missing Data</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {Object.entries(statisticalSummary.missing_data.missing_by_column).map(([column, count]) => (
                  <div key={column} className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-900 truncate">{column}</span>
                    <span className="text-xs text-gray-600 ml-2">
                      {count} ({((count / statisticalSummary.dataset_info.total_rows) * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-blue-50/80 backdrop-blur-sm rounded-lg border border-blue-200/50 shadow-sm p-6">
        <div className="flex items-center gap-x-3 mb-4">
          <CheckCircle className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900">Recommendations</h3>
        </div>

        <div className="space-y-2">
          {qualityReport.recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start gap-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-blue-800">{recommendation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}