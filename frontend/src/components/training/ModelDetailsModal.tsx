'use client';

import React from 'react';
import { X, Trophy, Clock, BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ModelPerformance, TrainingResults } from '@/lib/types';

interface ModelDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ModelPerformance | null;
  trainingResults: TrainingResults | null;
}

export function ModelDetailsModal({ isOpen, onClose, model, trainingResults }: ModelDetailsModalProps) {
  if (!isOpen || !model || !trainingResults) return null;

  const formatScore = (score: number): string => {
    if (trainingResults.training_config.task_type === 'regression') {
      return score.toFixed(4);
    } else {
      return (score * 100).toFixed(2) + '%';
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const getModelDisplayName = (modelName: string): string => {
    const nameMap: Record<string, string> = {
      'rf': 'Random Forest',
      'lgbm': 'LightGBM',
      'xgb': 'XGBoost',
      'logistic_regression': 'Logistic Regression',
      'linear_regression': 'Linear Regression',
      'random_forest': 'Random Forest',
      'gradient_boosting': 'Gradient Boosting'
    };
    return nameMap[modelName] || modelName.toUpperCase();
  };

  const getPrimaryMetricName = (): string => {
    if (trainingResults.training_config.task_type === 'regression') {
      // For regression, we typically use R² as the primary metric, but if it's not available, use MSE
      if (model.comprehensive_metrics?.r2_score !== undefined) {
        return 'R² Score';
      }
      return 'Mean Score'; // Fallback
    } else {
      // For classification, use accuracy as primary metric
      return 'Accuracy';
    }
  };

  const getPrimaryMetricValue = (): string => {
    if (trainingResults.training_config.task_type === 'regression') {
      if (model.comprehensive_metrics?.r2_score !== undefined) {
        return model.comprehensive_metrics.r2_score.toFixed(4);
      }
      return formatScore(model.mean_score);
    } else {
      if (model.comprehensive_metrics?.accuracy !== undefined) {
        return (model.comprehensive_metrics.accuracy * 100).toFixed(1) + '%';
      }
      return formatScore(model.mean_score);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {getModelDisplayName(model.model_name)} Details
              </h2>
              <p className="text-sm text-gray-600">
                Task: {trainingResults.training_config.task_type} • Target: {trainingResults.training_config.target_column}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Performance Overview */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">{getPrimaryMetricName()}</p>
                <p className="text-2xl font-bold text-blue-600">{getPrimaryMetricValue()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {trainingResults.training_config.task_type === 'regression' ? 'R²' : 'Accuracy'}: {formatScore(model.mean_score)} ± {formatScore(model.std_score)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">Standard Deviation</p>
                <p className="text-2xl font-bold text-orange-600">{formatScore(model.std_score)}</p>
                <p className="text-xs text-gray-500 mt-1">Cross-validation variability</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">Training Time</p>
                <p className="text-2xl font-bold text-green-600">{formatTime(model.training_time)}</p>
                <p className="text-xs text-gray-500 mt-1">{model.cv_scores?.length || 0} folds</p>
              </div>
            </div>
          </div>

          {/* Comprehensive Metrics */}
          {model.comprehensive_metrics && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Detailed Metrics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {trainingResults.training_config.task_type === 'regression' ? (
                  <>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 font-medium">R² Score</p>
                      <p className="text-lg font-bold text-blue-700">{model.comprehensive_metrics.r2_score?.toFixed(4) || 'N/A'}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-xs text-red-600 font-medium">MSE</p>
                      <p className="text-lg font-bold text-red-700">{model.comprehensive_metrics.mse?.toFixed(6) || 'N/A'}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <p className="text-xs text-orange-600 font-medium">RMSE</p>
                      <p className="text-lg font-bold text-orange-700">{model.comprehensive_metrics.rmse?.toFixed(6) || 'N/A'}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <p className="text-xs text-purple-600 font-medium">MAE</p>
                      <p className="text-lg font-bold text-purple-700">{model.comprehensive_metrics.mae?.toFixed(6) || 'N/A'}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-xs text-green-600 font-medium">Accuracy</p>
                      <p className="text-lg font-bold text-green-700">{(model.comprehensive_metrics.accuracy * 100)?.toFixed(1)}%</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 font-medium">F1 Score</p>
                      <p className="text-lg font-bold text-blue-700">{(model.comprehensive_metrics.f1_score * 100)?.toFixed(1)}%</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <p className="text-xs text-purple-600 font-medium">Precision</p>
                      <p className="text-lg font-bold text-purple-700">{(model.comprehensive_metrics.precision * 100)?.toFixed(1)}%</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <p className="text-xs text-orange-600 font-medium">Recall</p>
                      <p className="text-lg font-bold text-orange-700">{(model.comprehensive_metrics.recall * 100)?.toFixed(1)}%</p>
                    </div>
                    {model.comprehensive_metrics.roc_auc && (
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 col-span-2 md:col-span-1">
                        <p className="text-xs text-yellow-600 font-medium">ROC AUC</p>
                        <p className="text-lg font-bold text-yellow-700">{model.comprehensive_metrics.roc_auc?.toFixed(4)}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Cross-Validation Scores */}
          {model.cv_scores && model.cv_scores.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Cross-Validation Scores
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex gap-2 flex-wrap mb-3">
                  {model.cv_scores.map((score, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-2 bg-white border rounded-lg text-sm font-mono"
                    >
                      Fold {idx + 1}: {trainingResults.training_config.task_type === 'regression' ? score.toFixed(4) : formatScore(score)}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Mean:</span> {formatScore(model.mean_score)} ± {formatScore(model.std_score)}
                </div>
              </div>
            </div>
          )}

          {/* Feature Importance */}
          {model.feature_importance && Object.keys(model.feature_importance).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Feature Importance (Top 10)
              </h3>
              <div className="space-y-2">
                {(() => {
                  const sortedFeatures = Object.entries(model.feature_importance)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10);
                  const maxImportance = Math.max(...sortedFeatures.map(([, imp]) => imp));
                  
                  return sortedFeatures.map(([feature, importance], idx) => (
                    <div key={feature} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate flex-1 mr-2" title={feature}>{feature}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 w-40">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ 
                              width: `${Math.min(100, (importance / maxImportance) * 100)}%`,
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                        <span className="text-sm font-mono w-12 text-right">{(importance * 100).toFixed(0)}</span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Best Parameters */}
          {model.best_params && Object.keys(model.best_params).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Best Hyperparameters
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm font-mono overflow-x-auto">
                  {JSON.stringify(model.best_params, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button>
            Export Model Details
          </Button>
        </div>
      </div>
    </div>
  );
}