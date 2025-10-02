'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Info,
  Clock,
  Zap,
  Target,
  Brain,
  TrendingUp,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AutoMLConfigProps {
  taskType: 'classification' | 'regression';
  onConfigChange?: (config: any) => void;
  className?: string;
}

const OPTIMIZATION_METRICS = {
  classification: [
    { value: 'accuracy', label: 'Accuracy', description: 'Overall prediction accuracy' },
    { value: 'f1', label: 'F1 Score', description: 'Balanced precision and recall' },
    { value: 'roc_auc', label: 'ROC AUC', description: 'Area under ROC curve' },
    { value: 'precision', label: 'Precision', description: 'True positive rate' },
    { value: 'recall', label: 'Recall', description: 'Sensitivity' },
  ],
  regression: [
    { value: 'r2', label: 'R² Score', description: 'Coefficient of determination' },
    { value: 'mse', label: 'MSE', description: 'Mean squared error (lower is better)' },
    { value: 'mae', label: 'MAE', description: 'Mean absolute error (lower is better)' },
    { value: 'rmse', label: 'RMSE', description: 'Root mean squared error' },
  ]
};

const SEARCH_STRATEGIES = [
  {
    id: 'fast',
    name: 'Fast',
    icon: <Zap className="h-5 w-5" />,
    description: 'Quick exploration with basic models',
    timeEstimate: '5-15 min',
    color: 'green'
  },
  {
    id: 'balanced',
    name: 'Balanced',
    icon: <Target className="h-5 w-5" />,
    description: 'Good balance between speed and performance',
    timeEstimate: '15-45 min',
    color: 'blue'
  },
  {
    id: 'thorough',
    name: 'Thorough',
    icon: <Brain className="h-5 w-5" />,
    description: 'Extensive search for best performance',
    timeEstimate: '45+ min',
    color: 'purple'
  },
];

export function AutoMLConfig({
  taskType,
  onConfigChange,
  className
}: AutoMLConfigProps) {
  const [searchStrategy, setSearchStrategy] = useState('balanced');
  const [optimizationMetric, setOptimizationMetric] = useState(
    taskType === 'classification' ? 'accuracy' : 'r2'
  );
  const [timeLimit, setTimeLimit] = useState(30);
  const [enableEarlyStopping, setEnableEarlyStopping] = useState(true);
  const [enableFeatureEngineering, setEnableFeatureEngineering] = useState(true);
  const [ensembleSize, setEnsembleSize] = useState(5);

  const metrics = OPTIMIZATION_METRICS[taskType];
  const currentStrategy = SEARCH_STRATEGIES.find(s => s.id === searchStrategy);

  const getAutoMLConfig = () => {
    return {
      strategy: searchStrategy,
      optimization_metric: optimizationMetric,
      time_limit_minutes: timeLimit,
      early_stopping: enableEarlyStopping,
      feature_engineering: enableFeatureEngineering,
      ensemble_size: ensembleSize,
      task_type: taskType,
    };
  };

  React.useEffect(() => {
    onConfigChange?.(getAutoMLConfig());
  }, [searchStrategy, optimizationMetric, timeLimit, enableEarlyStopping, enableFeatureEngineering, ensembleSize]);

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-6 w-6 text-amber-500" />
        <h3 className="text-xl font-semibold text-gray-900">AutoML Configuration</h3>
      </div>

      <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2">
        <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-900">
          <p className="font-medium mb-1">Automated Machine Learning</p>
          <p>AutoML will automatically select the best models, tune hyperparameters, and create ensembles. Perfect for getting started quickly or establishing a strong baseline.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Search Strategy
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SEARCH_STRATEGIES.map(strategy => (
              <button
                key={strategy.id}
                onClick={() => setSearchStrategy(strategy.id)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all text-left',
                  searchStrategy === strategy.id
                    ? `border-${strategy.color}-500 bg-${strategy.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    'p-2 rounded-lg',
                    searchStrategy === strategy.id
                      ? `bg-${strategy.color}-600 text-white`
                      : 'bg-gray-100 text-gray-600'
                  )}>
                    {strategy.icon}
                  </div>
                  <div>
                    <h4 className={cn(
                      'font-medium',
                      searchStrategy === strategy.id
                        ? `text-${strategy.color}-900`
                        : 'text-gray-900'
                    )}>
                      {strategy.name}
                    </h4>
                    <p className="text-xs text-gray-500">{strategy.timeEstimate}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">{strategy.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Optimization Metric
          </label>
          <select
            value={optimizationMetric}
            onChange={(e) => setOptimizationMetric(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            {metrics.map(metric => (
              <option key={metric.value} value={metric.value}>
                {metric.label} - {metric.description}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-600">
            AutoML will optimize models to maximize this metric
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Limit (minutes)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={5}
              max={180}
              step={5}
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value))}
              className="flex-1"
            />
            <div className="flex items-center gap-2 min-w-[120px]">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-900">{timeLimit} min</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
            <span>5 min</span>
            <span>180 min (3 hours)</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ensemble Size
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={ensembleSize}
              onChange={(e) => setEnsembleSize(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="font-medium text-gray-900 min-w-[60px]">
              {ensembleSize} {ensembleSize === 1 ? 'model' : 'models'}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-600">
            Number of top models to combine in the final ensemble
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Advanced Options
          </label>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Early Stopping</p>
                <p className="text-xs text-gray-600">Stop training if no improvement is seen</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enableEarlyStopping}
              onChange={(e) => setEnableEarlyStopping(e.target.checked)}
              className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Feature Engineering</p>
                <p className="text-xs text-gray-600">Automatically create new features</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enableFeatureEngineering}
              onChange={(e) => setEnableFeatureEngineering(e.target.checked)}
              className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
            />
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                AutoML Will:
              </p>
              <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                <li>Train and evaluate {currentStrategy?.name.toLowerCase()} set of models</li>
                <li>Optimize for {metrics.find(m => m.value === optimizationMetric)?.label}</li>
                <li>Run for up to {timeLimit} minutes</li>
                <li>Create ensemble of top {ensembleSize} {ensembleSize === 1 ? 'model' : 'models'}</li>
                {enableEarlyStopping && <li>Use early stopping to prevent overfitting</li>}
                {enableFeatureEngineering && <li>Generate engineered features automatically</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
