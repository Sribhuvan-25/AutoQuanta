'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  X,
  Info,
  BarChart3,
  Zap,
  Target,
  Calendar,
  Brain,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';

interface Model {
  model_id: string;
  model_name: string;
  model_type: string;
  task_type: 'classification' | 'regression';
  score: number;
  created_at: string;
  version?: string;
  metrics?: {
    [key: string]: number;
  };
  feature_count?: number;
  training_time?: number;
  dataset_size?: number;
  hyperparameters?: {
    [key: string]: any;
  };
}

interface ModelComparisonProps {
  models: Model[];
  onClose?: () => void;
  onSelectWinner?: (modelId: string) => void;
  className?: string;
}

export function ModelComparison({
  models,
  onClose,
  onSelectWinner,
  className
}: ModelComparisonProps) {
  const [selectedView, setSelectedView] = useState<'overview' | 'metrics' | 'config'>('overview');

  if (models.length < 2) {
    return (
      <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
        <div className="text-center py-12">
          <GitCompare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            Select at least 2 models to compare
          </p>
        </div>
      </div>
    );
  }

  const taskType = models[0].task_type;

  const formatScore = (score: number): string => {
    if (taskType === 'regression') {
      return `R² ${score.toFixed(4)}`;
    }
    return `${(score * 100).toFixed(1)}%`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  // Find the best model by score
  const bestModelId = models.reduce((best, model) =>
    model.score > best.score ? model : best
  , models[0]).model_id;

  // Prepare radar chart data
  const getRadarData = () => {
    if (!models[0].metrics) return [];

    const metricKeys = Object.keys(models[0].metrics);
    return metricKeys.map(key => {
      const dataPoint: any = { metric: key.replace(/_/g, ' ') };
      models.forEach((model, idx) => {
        dataPoint[`model${idx}`] = model.metrics?.[key] || 0;
      });
      return dataPoint;
    });
  };

  const radarData = getRadarData();

  const getComparisonIndicator = (value1: number, value2: number) => {
    const diff = value1 - value2;
    if (Math.abs(diff) < 0.001) {
      return <Minus className="h-4 w-4 text-gray-400" />;
    }
    return diff > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const exportComparison = () => {
    const csv = ['Metric,' + models.map(m => m.model_name).join(',') + '\n'];

    // Add main score
    csv.push('Score,' + models.map(m => m.score.toFixed(4)).join(',') + '\n');

    // Add all metrics
    if (models[0].metrics) {
      Object.keys(models[0].metrics).forEach(key => {
        const values = models.map(m => (m.metrics?.[key] || 0).toFixed(4)).join(',');
        csv.push(`${key},${values}\n`);
      });
    }

    const blob = new Blob(csv, { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'model_comparison.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Model Comparison</h2>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {models.length} models
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={exportComparison}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* View Selector */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setSelectedView('overview')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              selectedView === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedView('metrics')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              selectedView === 'metrics'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Metrics
          </button>
          <button
            onClick={() => setSelectedView('config')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              selectedView === 'config'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Configuration
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {selectedView === 'overview' && (
          <div className="space-y-6">
            {/* Info Box */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-900">
                <p>Comparing {models.length} models. The best performing model is highlighted in green.</p>
              </div>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model) => {
                const isBest = model.model_id === bestModelId;
                return (
                  <div
                    key={model.model_id}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all',
                      isBest
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 bg-white'
                    )}
                  >
                    {/* Model Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="font-semibold text-gray-900">{model.model_name}</h4>
                          {model.version && (
                            <span className="text-xs text-gray-500">v{model.version}</span>
                          )}
                        </div>
                      </div>
                      {isBest && (
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Best
                        </span>
                      )}
                    </div>

                    {/* Score */}
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 mb-1">Performance</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {formatScore(model.score)}
                      </p>
                    </div>

                    {/* Quick Stats */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Target className="h-4 w-4 text-gray-400" />
                        <span className="text-xs">{model.model_type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-xs">{formatDate(model.created_at)}</span>
                      </div>
                      {model.training_time && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Zap className="h-4 w-4 text-gray-400" />
                          <span className="text-xs">{formatDuration(model.training_time)}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {onSelectWinner && !isBest && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-3"
                        onClick={() => onSelectWinner(model.model_id)}
                      >
                        Select as Winner
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Radar Chart Comparison */}
            {radarData.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Performance Metrics Radar
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 1]}
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        padding: '8px'
                      }}
                    />
                    {models.map((model, idx) => (
                      <Radar
                        key={model.model_id}
                        name={model.model_name}
                        dataKey={`model${idx}`}
                        stroke={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][idx % 5]}
                        fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][idx % 5]}
                        fillOpacity={0.3}
                      />
                    ))}
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {selectedView === 'metrics' && (
          <div className="space-y-4">
            {/* Main Score Comparison */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Main Performance Score
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {models.map((model, idx) => {
                  const isBest = model.model_id === bestModelId;
                  return (
                    <div
                      key={model.model_id}
                      className={cn(
                        'p-3 rounded-lg',
                        isBest ? 'bg-green-100' : 'bg-white'
                      )}
                    >
                      <p className="text-xs text-gray-600 mb-1">{model.model_name}</p>
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          'text-xl font-bold',
                          isBest ? 'text-green-700' : 'text-gray-900'
                        )}>
                          {formatScore(model.score)}
                        </p>
                        {idx > 0 && getComparisonIndicator(model.score, models[0].score)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Metrics Comparison */}
            {models[0].metrics && Object.keys(models[0].metrics).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Detailed Metrics
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">
                          Metric
                        </th>
                        {models.map((model) => (
                          <th
                            key={model.model_id}
                            className="px-4 py-2 text-left font-medium text-gray-700"
                          >
                            {model.model_name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.keys(models[0].metrics).map((metricKey) => {
                        const values = models.map(m => m.metrics?.[metricKey] || 0);
                        const maxValue = Math.max(...values);

                        return (
                          <tr key={metricKey} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900 capitalize">
                              {metricKey.replace(/_/g, ' ')}
                            </td>
                            {models.map((model, idx) => {
                              const value = model.metrics?.[metricKey] || 0;
                              const isBest = value === maxValue;

                              return (
                                <td
                                  key={model.model_id}
                                  className={cn(
                                    'px-4 py-3',
                                    isBest && 'bg-green-50 font-semibold text-green-700'
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    {value.toFixed(4)}
                                    {idx > 0 && getComparisonIndicator(value, values[0])}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Configuration Tab */}
        {selectedView === 'config' && (
          <div className="space-y-4">
            {/* Training Configuration */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Training Configuration
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        Property
                      </th>
                      {models.map((model) => (
                        <th
                          key={model.model_id}
                          className="px-4 py-2 text-left font-medium text-gray-700"
                        >
                          {model.model_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">Model Type</td>
                      {models.map((model) => (
                        <td key={model.model_id} className="px-4 py-3 text-gray-600">
                          {model.model_type}
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">Feature Count</td>
                      {models.map((model) => (
                        <td key={model.model_id} className="px-4 py-3 text-gray-600">
                          {model.feature_count || 'N/A'}
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">Training Time</td>
                      {models.map((model) => (
                        <td key={model.model_id} className="px-4 py-3 text-gray-600">
                          {formatDuration(model.training_time)}
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">Dataset Size</td>
                      {models.map((model) => (
                        <td key={model.model_id} className="px-4 py-3 text-gray-600">
                          {model.dataset_size?.toLocaleString() || 'N/A'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hyperparameters */}
            {models.some(m => m.hyperparameters && Object.keys(m.hyperparameters).length > 0) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Hyperparameters
                </h3>
                <div className="space-y-2">
                  {models.map((model) => (
                    <div key={model.model_id} className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        {model.model_name}
                      </h4>
                      {model.hyperparameters && Object.keys(model.hyperparameters).length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(model.hyperparameters).map(([key, value]) => (
                            <div key={key} className="text-xs">
                              <span className="text-gray-500 capitalize">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span className="ml-1 text-gray-900 font-medium">
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">No hyperparameters available</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
