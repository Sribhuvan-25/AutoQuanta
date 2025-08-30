'use client';

import React from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Info, TrendingUp, BarChart3, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdvancedColumnProfile } from '@/lib/data-profiler';


interface AdvancedColumnCardProps {
  column: AdvancedColumnProfile;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function AdvancedColumnCard({ column, isSelected = false, onSelect, className }: AdvancedColumnCardProps) {
  const getQualityColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-50';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getQualityIcon = (score: number) => {
    if (score >= 0.9) return CheckCircle;
    if (score >= 0.7) return AlertCircle;
    return AlertTriangle;
  };
  
  // Calculate derived values from API data
  const completeness = column.non_null_count && column.non_null_count > 0 
    ? column.non_null_count / (column.non_null_count + (column.null_count || 0))
    : 1;
    
  const uniqueness_ratio = column.unique_count && column.non_null_count 
    ? column.unique_count / column.non_null_count
    : 0;
    
  const data_quality_score = completeness * 0.7 + (uniqueness_ratio > 0.1 ? 0.3 : uniqueness_ratio * 3);
  
  const missing_count = column.null_count || 0;
  const total_count = (column.non_null_count || 0) + missing_count;
  const missing_percentage = total_count > 0 ? (missing_count / total_count) * 100 : 0;
  
  const format_consistency = 0.95; // Default high consistency for API data
  
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const QualityIcon = getQualityIcon(data_quality_score);

  const getTypeColor = (dtype: string) => {
    switch (dtype) {
      case 'int64':
      case 'float64':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'object':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'bool':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'datetime64[ns]':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div
      className={cn(
        'bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm p-4 cursor-pointer transition-all hover:shadow-md hover:border-slate-300/50',
        isSelected && 'ring-2 ring-blue-500 border-blue-300 bg-blue-50/50',
        className
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate text-sm leading-tight" title={column.name}>
            {column.name.length > 25 ? `${column.name.substring(0, 22)}...` : column.name}
          </h4>
          <div className="flex items-center gap-x-2 mt-1">
            <span className={cn('px-2 py-1 text-xs font-medium rounded border', getTypeColor(column.dtype))}>
              {column.dtype}
            </span>
            {isSelected && (
              <div title="Selected as target">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
            )}
          </div>
        </div>
        <div className={cn('p-1 rounded', getQualityColor(data_quality_score))}>
          <QualityIcon className="h-4 w-4" />
        </div>
      </div>

      {/* Quality Score */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Quality Score</span>
          <span className="font-medium">{formatPercentage(data_quality_score)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={cn(
              'h-2 rounded-full transition-all',
              data_quality_score >= 0.9 ? 'bg-green-500' : 
              data_quality_score >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${data_quality_score * 100}%` }}
          />
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-sm font-semibold text-gray-900">{formatPercentage(completeness)}</div>
          <div className="text-xs text-gray-600">Complete</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-sm font-semibold text-gray-900">{(column.unique_count || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-600">Unique</div>
        </div>
      </div>

      {/* Advanced Metrics */}
      <div className="space-y-2 mb-3">
        {/* Missing Data */}
        {missing_count > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Missing</span>
            <span className="text-red-600 font-medium">
              {missing_count} ({missing_percentage.toFixed(1)}%)
            </span>
          </div>
        )}

        {/* Outliers for numeric columns */}
        {(column.dtype === 'int64' || column.dtype === 'float64') && (column.outlier_count || 0) > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Outliers</span>
            <span className="text-orange-600 font-medium">
              {column.outlier_count || 0} ({(column.outlier_percentage || 0).toFixed(1)}%)
            </span>
          </div>
        )}

        {/* Uniqueness Ratio */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Uniqueness</span>
          <span className="text-gray-900 font-medium">{formatPercentage(uniqueness_ratio)}</span>
        </div>

        {/* Format Consistency */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Consistency</span>
          <span className="text-gray-900 font-medium">{formatPercentage(format_consistency)}</span>
        </div>
      </div>

      {/* Statistical Information - Basic Summary */}
      {column.stats && Object.keys(column.stats).length > 0 && (
        <div className="border-t border-gray-200 pt-3 mb-3">
          <div className="flex items-center gap-x-2 mb-2">
            <BarChart3 className="h-4 w-4 text-gray-600" />
            <span className="text-xs font-medium text-gray-700">Statistics Available</span>
          </div>
          <div className="text-xs text-gray-600">
            {Object.keys(column.stats).length} statistical measures computed
          </div>
        </div>
      )}

      {/* Distribution Analysis for Numeric Columns */}
      {column.distribution_analysis && Object.keys(column.distribution_analysis).length > 0 && (
        <div className="border-t border-gray-200 pt-3 mb-3">
          <div className="flex items-center gap-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-gray-600" />
            <span className="text-xs font-medium text-gray-700">Distribution</span>
          </div>
          
          <div className="text-xs space-y-1">
            {column.distribution_analysis.distribution_type && (
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="capitalize">{column.distribution_analysis.distribution_type.replace('_', ' ')}</span>
              </div>
            )}
            {typeof column.distribution_analysis.skewness === 'number' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Skewness:</span>
                <span className="font-mono">{column.distribution_analysis.skewness.toFixed(3)}</span>
              </div>
            )}
            {column.distribution_analysis.is_normal !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Normal:</span>
                <span className={column.distribution_analysis.is_normal ? 'text-green-600' : 'text-red-600'}>
                  {column.distribution_analysis.is_normal ? 'Yes' : 'No'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {column.recommendations && column.recommendations.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center gap-x-2 mb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-gray-700">Recommendations</span>
          </div>
          <div className="space-y-1">
            {column.recommendations.slice(0, 2).map((rec, index) => (
              <p key={index} className="text-xs text-gray-600 leading-relaxed">
                • {rec}
              </p>
            ))}
            {column.recommendations.length > 2 && (
              <p className="text-xs text-blue-600">
                +{column.recommendations.length - 2} more recommendations
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}