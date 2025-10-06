'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Trophy, 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target,
  ChevronDown,
  ChevronRight,
  Info,
  Download,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TrainingResults, ModelPerformance } from '@/lib/types';
import { PreprocessingReport } from './PreprocessingReport';
import { FeatureImportanceChart } from '@/components/charts/FeatureImportanceChart';
import { ConfusionMatrixChart } from '@/components/charts/ConfusionMatrixChart';
import { ModelComparisonChart } from '@/components/charts/ModelComparisonChart';
import { ROCCurveChart } from '@/components/charts/ROCCurveChart';
import { ResidualPlot } from '@/components/charts/ResidualPlot';
import { LearningCurveChart } from '@/components/charts/LearningCurveChart';

interface TrainingResultsProps {
  results: TrainingResults | null;
  modelComparison: ModelPerformance[];
  bestModel: ModelPerformance | null;
  onViewDetails?: (modelName: string) => void;
  onExportResults?: () => void;
  className?: string;
}

export function TrainingResults({ 
  results, 
  modelComparison, 
  bestModel,
  onViewDetails,
  onExportResults,
  className 
}: TrainingResultsProps) {
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'models' | 'details' | 'visualizations'>('overview');

  if (!results) {
    return null;
  }

  const formatScore = (score: number): string => {
    if (results.training_config.task_type === 'regression') {
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

  const getScoreColor = (score: number): string => {
    if (results.training_config.task_type === 'regression') {
      if (score >= 0.8) return 'text-green-600';
      if (score >= 0.5) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (score >= 0.9) return 'text-green-600';
      if (score >= 0.7) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  const toggleModelExpansion = (modelName: string) => {
    setExpandedModel(expandedModel === modelName ? null : modelName);
  };

  return (
    <div className={cn('bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm', className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-xl border border-gray-200">
              <Trophy className="h-6 w-6 text-gray-900" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">Training Results</h3>
              <p className="text-sm text-gray-600 mt-1">
                {modelComparison.length} models trained • Target: {results.training_config.target_column}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onExportResults && (
              <Button variant="outline" size="sm" onClick={onExportResults}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mt-6">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'visualizations', label: 'Visualizations', icon: TrendingUp },
            { key: 'models', label: 'Model Comparison', icon: Eye },
            { key: 'details', label: 'Details', icon: Info }
          ].map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key as 'overview' | 'models' | 'details' | 'visualizations')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
                  selectedTab === tab.key
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Best Model Card */}
            {bestModel && (
              <div className="bg-gradient-to-br from-gray-100 to-gray-50 p-6 rounded-2xl border border-gray-300 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-white rounded-xl border border-gray-300 shadow-sm">
                        <Trophy className="h-5 w-5 text-gray-900" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">Best Model</h4>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{bestModel?.model_name || 'Unknown'}</p>
                    {results.training_config.task_type === 'regression' && bestModel?.comprehensive_metrics ? (
                      <div className="text-sm text-gray-600 mt-2 space-y-1">
                        <p>R² Score: <span className="font-semibold text-gray-900">{bestModel.comprehensive_metrics.r2_score?.toFixed(4)}</span></p>
                        <p>MSE: <span className="font-semibold text-gray-900">{bestModel.comprehensive_metrics.mse?.toFixed(6)}</span></p>
                      </div>
                    ) : bestModel ? (
                      <div className="text-sm text-gray-600 mt-2 space-y-1">
                        <p>Accuracy: <span className="font-semibold text-gray-900">{formatScore(bestModel.mean_score)}</span></p>
                        {bestModel.comprehensive_metrics?.f1_score && (
                          <p>F1 Score: <span className="font-semibold text-gray-900">{(bestModel.comprehensive_metrics.f1_score * 100).toFixed(1)}%</span></p>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 mt-2">
                        <p>No performance data available</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs text-gray-600">Training Time</p>
                      <p className="font-semibold text-gray-900 text-lg mt-1">{bestModel ? formatTime(bestModel.training_time) : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-200 text-center shadow-sm">
                <div className="p-2 bg-gray-100 rounded-xl border border-gray-200 w-fit mx-auto mb-3">
                  <Target className="h-5 w-5 text-gray-900" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Task Type</p>
                <p className="font-semibold text-gray-900 capitalize">{results.training_config.task_type}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 text-center shadow-sm">
                <div className="p-2 bg-gray-100 rounded-xl border border-gray-200 w-fit mx-auto mb-3">
                  <BarChart3 className="h-5 w-5 text-gray-900" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Models Trained</p>
                <p className="font-semibold text-gray-900">{modelComparison.length}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 text-center shadow-sm">
                <div className="p-2 bg-gray-100 rounded-xl border border-gray-200 w-fit mx-auto mb-3">
                  <TrendingUp className="h-5 w-5 text-gray-900" />
                </div>
                <p className="text-sm text-gray-600 mb-1">CV Folds</p>
                <p className="font-semibold text-gray-900">{results.training_config.cv_folds}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 text-center shadow-sm">
                <div className="p-2 bg-gray-100 rounded-xl border border-gray-200 w-fit mx-auto mb-3">
                  <Clock className="h-5 w-5 text-gray-900" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Total Time</p>
                <p className="font-semibold text-gray-900">
                  {formatTime(modelComparison.reduce((sum, model) => sum + model.training_time, 0))}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Visualizations Tab */}
        {selectedTab === 'visualizations' && (
          <div className="space-y-6">
            {/* Model Comparison Chart */}
            <ModelComparisonChart
              models={modelComparison}
              taskType={results.training_config.task_type}
            />

            {/* Feature Importance Chart */}
            {bestModel?.feature_importance && Object.keys(bestModel.feature_importance).length > 0 && (
              <FeatureImportanceChart
                featureImportance={bestModel.feature_importance}
                title={`Feature Importance - ${bestModel.model_name}`}
              />
            )}

            {/* Confusion Matrix for Classification */}
            {results.training_config.task_type === 'classification' &&
             bestModel?.comprehensive_metrics?.confusion_matrix &&
             Array.isArray(bestModel.comprehensive_metrics.confusion_matrix) && (
              <ConfusionMatrixChart
                confusionMatrix={bestModel.comprehensive_metrics.confusion_matrix as number[][]}
                classLabels={Array.isArray(bestModel.comprehensive_metrics.class_labels)
                  ? bestModel.comprehensive_metrics.class_labels as string[]
                  : undefined}
              />
            )}

            {/* ROC Curve for Binary Classification */}
            {results.training_config.task_type === 'classification' &&
             bestModel?.comprehensive_metrics?.roc_curve &&
             typeof bestModel.comprehensive_metrics.roc_curve === 'object' && (
              <ROCCurveChart
                rocData={bestModel.comprehensive_metrics.roc_curve as { fpr: number[]; tpr: number[]; auc: number }}
              />
            )}

            {/* Residual Plot for Regression */}
            {results.training_config.task_type === 'regression' &&
             bestModel?.comprehensive_metrics?.all_predictions &&
             bestModel?.comprehensive_metrics?.all_actuals && (
              <ResidualPlot
                predictions={Array.isArray(bestModel.comprehensive_metrics.all_predictions)
                  ? bestModel.comprehensive_metrics.all_predictions
                  : []}
                actuals={Array.isArray(bestModel.comprehensive_metrics.all_actuals)
                  ? bestModel.comprehensive_metrics.all_actuals
                  : []}
              />
            )}

            {/* Learning Curve */}
            {bestModel && 'fold_results' in bestModel && Array.isArray(bestModel.fold_results) && bestModel.fold_results.length > 0 && (
              <LearningCurveChart
                foldResults={bestModel.fold_results}
                taskType={results.training_config.task_type}
              />
            )}

            {/* Info if no visualizations available */}
            {!bestModel?.feature_importance && results.training_config.task_type !== 'classification' && (
              <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No additional visualizations available for this model.</p>
                <p className="text-sm text-gray-500 mt-1">
                  Feature importance and confusion matrix will appear here when available.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Models Tab */}
        {selectedTab === 'models' && (
          <div className="space-y-4">
            {[...modelComparison]
              .sort((a, b) => b.mean_score - a.mean_score)
              .map((model, index) => (
                <div
                  key={model.model_name}
                  className={cn(
                    'border rounded-xl p-5 transition-all duration-200',
                    index === 0 ? 'border-gray-900 bg-gray-100 shadow-sm' : 'border-gray-200 bg-white',
                    expandedModel === model.model_name && 'ring-2 ring-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {index === 0 && (
                        <div className="p-1.5 bg-white rounded-lg border border-gray-300">
                          <Trophy className="h-4 w-4 text-gray-900" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-gray-900">{model.model_name}</h4>
                        {results.training_config.task_type === 'regression' ? (
                          model.comprehensive_metrics ? (
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600">
                                R² Score: <span className={cn('font-medium', getScoreColor(model.comprehensive_metrics.r2_score || 0))}>
                                  {model.comprehensive_metrics.r2_score?.toFixed(4) || 'N/A'}
                                </span>
                              </p>
                              <p className="text-xs text-gray-500">
                                MSE: {model.comprehensive_metrics.mse?.toFixed(4) || 'N/A'} | RMSE: {model.comprehensive_metrics.rmse?.toFixed(4) || 'N/A'}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">
                              R² Score: <span className={cn('font-medium', getScoreColor(model.mean_score))}>
                                {formatScore(model.mean_score)}
                              </span>
                            </p>
                          )
                        ) : (
                          model.comprehensive_metrics ? (
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600">
                                Accuracy: <span className={cn('font-medium', getScoreColor(model.comprehensive_metrics.accuracy || 0))}>
                                  {(model.comprehensive_metrics.accuracy * 100)?.toFixed(1) || 'N/A'}%
                                </span>
                              </p>
                              <p className="text-xs text-gray-500">
                                F1: {(model.comprehensive_metrics.f1_score * 100)?.toFixed(1)}% | Precision: {(model.comprehensive_metrics.precision * 100)?.toFixed(1)}%
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">
                              Accuracy: <span className={cn('font-medium', getScoreColor(model.mean_score))}>
                                {formatScore(model.mean_score)}
                              </span>
                            </p>
                          )
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {formatTime(model.training_time)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleModelExpansion(model.model_name)}
                      >
                        {expandedModel === model.model_name ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </Button>
                      {onViewDetails && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDetails(model.model_name)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Score Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={cn(
                          'h-2.5 rounded-full transition-all duration-300',
                          index === 0 ? 'bg-gray-900' : 'bg-gray-600'
                        )}
                        style={{
                          width: `${results.training_config.task_type === 'regression'
                            ? Math.max(0, Math.min(100, (model.mean_score + 1) * 50))
                            : model.mean_score * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedModel === model.model_name && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      {/* Model Performance Scores */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          {results.training_config.task_type === 'regression' ? 'Fold R² Scores' : 'Fold Accuracy Scores'}
                        </h5>
                        <div className="flex gap-2 flex-wrap">
                          {model.cv_scores.map((score, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 rounded text-xs font-mono"
                            >
                              Fold {idx + 1}: {results.training_config.task_type === 'regression' ? score.toFixed(4) : formatScore(score)}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Feature Importance */}
                      {model.feature_importance && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Top Features</h5>
                          <div className="space-y-1">
                            {Object.entries(model.feature_importance)
                              .sort(([, a], [, b]) => b - a)
                              .slice(0, 5)
                              .map(([feature, importance]) => (
                                <div key={feature} className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600 truncate">{feature}</span>
                                  <span className="text-sm font-mono ml-2">{importance.toFixed(3)}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Comprehensive Metrics */}
                      {model.comprehensive_metrics && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Detailed Metrics</h5>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {results.training_config.task_type === 'regression' ? (
                              <>
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-gray-600">MSE:</span>
                                  <span className="font-mono ml-1">{model.comprehensive_metrics.mse?.toFixed(6)}</span>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-gray-600">RMSE:</span>
                                  <span className="font-mono ml-1">{model.comprehensive_metrics.rmse?.toFixed(6)}</span>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-gray-600">MAE:</span>
                                  <span className="font-mono ml-1">{model.comprehensive_metrics.mae?.toFixed(6)}</span>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-gray-600">R² Score:</span>
                                  <span className="font-mono ml-1">{model.comprehensive_metrics.r2_score?.toFixed(6)}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-gray-600">Accuracy:</span>
                                  <span className="font-mono ml-1">{(model.comprehensive_metrics.accuracy * 100)?.toFixed(2)}%</span>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-gray-600">F1 Score:</span>
                                  <span className="font-mono ml-1">{(model.comprehensive_metrics.f1_score * 100)?.toFixed(2)}%</span>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-gray-600">Precision:</span>
                                  <span className="font-mono ml-1">{(model.comprehensive_metrics.precision * 100)?.toFixed(2)}%</span>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-gray-600">Recall:</span>
                                  <span className="font-mono ml-1">{(model.comprehensive_metrics.recall * 100)?.toFixed(2)}%</span>
                                </div>
                                {model.comprehensive_metrics.roc_auc && (
                                  <div className="bg-gray-50 p-2 rounded col-span-2">
                                    <span className="text-gray-600">ROC AUC:</span>
                                    <span className="font-mono ml-1">{model.comprehensive_metrics.roc_auc?.toFixed(4)}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Best Parameters */}
                      {model.best_params && Object.keys(model.best_params).length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Best Parameters</h5>
                          <div className="bg-gray-50 p-2 rounded text-xs font-mono">
                            {JSON.stringify(model.best_params, null, 2)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Details Tab */}
        {selectedTab === 'details' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Training Configuration</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Target Column</dt>
                    <dd className="text-sm text-gray-900">{results.training_config.target_column}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Task Type</dt>
                    <dd className="text-sm text-gray-900 capitalize">{results.training_config.task_type}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Test Size</dt>
                    <dd className="text-sm text-gray-900">{(results.training_config.test_size * 100).toFixed(0)}%</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600">CV Folds</dt>
                    <dd className="text-sm text-gray-900">{results.training_config.cv_folds}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Random Seed</dt>
                    <dd className="text-sm text-gray-900">{results.training_config.random_seed}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Models Trained</dt>
                    <dd className="text-sm text-gray-900">{results.training_config.models_to_try.join(', ')}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Preprocessing Report */}
            {results.preprocessing_report && (
              <PreprocessingReport
                report={results.preprocessing_report}
                className="mt-0"
              />
            )}

            {/* Data Profile */}
            {results.data_profile && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Data Summary</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Additional data profiling information would be displayed here based on the data_profile object.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}