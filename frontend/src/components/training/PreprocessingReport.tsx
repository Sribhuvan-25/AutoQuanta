'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Filter,
  Zap,
  BarChart3,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreprocessingReport {
  target_column: string;
  task_type: string;
  original_features: number;
  final_features: number;
  dropped_columns: string[];
  numeric_columns: string[];
  categorical_columns: string[];

  missing_value_strategy: {
    numeric: string;
    categorical: string;
  };

  data_validation?: {
    enabled: boolean;
    remove_duplicates: boolean;
    validation_report?: {
      original_shape: [number, number];
      issues_found: string[];
      fixes_applied: string[];
      columns_dropped: string[];
      data_quality_score: number;
    };
  };

  outlier_handling: {
    enabled: boolean;
    method: string;
    strategy: string;
  };

  scaling_strategy: {
    numeric: string;
  };

  encoding_strategy: {
    categorical: string;
  };

  feature_engineering?: {
    enabled: boolean;
    polynomial_features: boolean;
    polynomial_degree?: number;
    interaction_features: boolean;
    binning_features: boolean;
  };

  target_preprocessing: {
    classification?: string;
    regression?: string;
  };
}

interface PreprocessingReportProps {
  report: PreprocessingReport;
  className?: string;
}

export function PreprocessingReport({ report, className }: PreprocessingReportProps) {
  const [expanded, setExpanded] = useState(false);

  const getQualityColor = (score: number) => {
    if (score >= 0.9) return 'text-green-700 bg-green-50';
    if (score >= 0.7) return 'text-yellow-700 bg-yellow-50';
    return 'text-red-700 bg-red-50';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.7) return 'Good';
    if (score >= 0.5) return 'Fair';
    return 'Poor';
  };

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-blue-600" />
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Preprocessing Report</h3>
            <p className="text-sm text-gray-600">
              {report.original_features} → {report.final_features} features
              {report.data_validation?.validation_report && (
                <span className={cn(
                  "ml-2 px-2 py-0.5 rounded text-xs font-medium",
                  getQualityColor(report.data_validation.validation_report.data_quality_score)
                )}>
                  Quality: {getQualityLabel(report.data_validation.validation_report.data_quality_score)}
                </span>
              )}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {expanded && (
        <div className="px-6 py-4 border-t border-gray-200 space-y-6">
          {/* Data Quality Score */}
          {report.data_validation?.validation_report && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">Data Quality Score</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${report.data_validation.validation_report.data_quality_score * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {(report.data_validation.validation_report.data_quality_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    {report.data_validation.validation_report.issues_found.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Issues Found:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {report.data_validation.validation_report.issues_found.map((issue, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {report.data_validation.validation_report.fixes_applied.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">Fixes Applied:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {report.data_validation.validation_report.fixes_applied.map((fix, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                              {fix}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Features Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600 mb-1">Original Features</div>
              <div className="text-2xl font-bold text-gray-900">{report.original_features}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-sm text-green-700 mb-1">Final Features</div>
              <div className="text-2xl font-bold text-green-700">{report.final_features}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm text-blue-700 mb-1">Numeric Columns</div>
              <div className="text-2xl font-bold text-blue-700">{report.numeric_columns.length}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-sm text-purple-700 mb-1">Categorical Columns</div>
              <div className="text-2xl font-bold text-purple-700">{report.categorical_columns.length}</div>
            </div>
          </div>

          {/* Dropped Columns */}
          {report.dropped_columns.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-gray-600" />
                <h4 className="font-medium text-gray-900">Dropped Columns ({report.dropped_columns.length})</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {report.dropped_columns.map((col, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Preprocessing Strategies */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Zap className="h-4 w-4 text-gray-600" />
              Applied Transformations
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Missing Values */}
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700 mb-1">Missing Values</div>
                <div className="text-sm text-gray-600">
                  <div>Numeric: {report.missing_value_strategy.numeric}</div>
                  <div>Categorical: {report.missing_value_strategy.categorical}</div>
                </div>
              </div>

              {/* Outlier Handling */}
              {report.outlier_handling.enabled && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Outlier Handling</div>
                  <div className="text-sm text-gray-600">
                    <div>Method: {report.outlier_handling.method}</div>
                    <div>Strategy: {report.outlier_handling.strategy}</div>
                  </div>
                </div>
              )}

              {/* Scaling */}
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700 mb-1">Feature Scaling</div>
                <div className="text-sm text-gray-600 capitalize">
                  {report.scaling_strategy.numeric}
                </div>
              </div>

              {/* Encoding */}
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700 mb-1">Categorical Encoding</div>
                <div className="text-sm text-gray-600">
                  {report.encoding_strategy.categorical}
                </div>
              </div>
            </div>
          </div>

          {/* Feature Engineering */}
          {report.feature_engineering?.enabled && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <BarChart3 className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">Feature Engineering Applied</h4>
                  <div className="space-y-1 text-sm text-gray-700">
                    {report.feature_engineering.polynomial_features && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Polynomial features (degree {report.feature_engineering.polynomial_degree})</span>
                      </div>
                    )}
                    {report.feature_engineering.interaction_features && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Interaction terms</span>
                      </div>
                    )}
                    {report.feature_engineering.binning_features && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Feature binning</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Note */}
          <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              These preprocessing steps were automatically applied to ensure optimal model performance.
              All transformations are saved with the model for consistent prediction behavior.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}