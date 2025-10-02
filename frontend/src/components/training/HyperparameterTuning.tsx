'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Settings,
  Sliders,
  Play,
  Info,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Zap,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HyperparameterConfig {
  name: string;
  type: 'int' | 'float' | 'categorical' | 'boolean';
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  default?: any;
}

interface ModelHyperparameters {
  [modelType: string]: HyperparameterConfig[];
}

const MODEL_HYPERPARAMETERS: ModelHyperparameters = {
  'Random Forest': [
    { name: 'n_estimators', type: 'int', min: 10, max: 500, step: 10, default: 100 },
    { name: 'max_depth', type: 'int', min: 1, max: 50, step: 1, default: null },
    { name: 'min_samples_split', type: 'int', min: 2, max: 20, step: 1, default: 2 },
    { name: 'min_samples_leaf', type: 'int', min: 1, max: 10, step: 1, default: 1 },
    { name: 'max_features', type: 'categorical', options: ['sqrt', 'log2', 'None'], default: 'sqrt' },
  ],
  'XGBoost': [
    { name: 'n_estimators', type: 'int', min: 10, max: 500, step: 10, default: 100 },
    { name: 'max_depth', type: 'int', min: 1, max: 20, step: 1, default: 6 },
    { name: 'learning_rate', type: 'float', min: 0.01, max: 0.3, step: 0.01, default: 0.1 },
    { name: 'subsample', type: 'float', min: 0.5, max: 1.0, step: 0.1, default: 1.0 },
    { name: 'colsample_bytree', type: 'float', min: 0.5, max: 1.0, step: 0.1, default: 1.0 },
  ],
  'LightGBM': [
    { name: 'n_estimators', type: 'int', min: 10, max: 500, step: 10, default: 100 },
    { name: 'max_depth', type: 'int', min: -1, max: 20, step: 1, default: -1 },
    { name: 'learning_rate', type: 'float', min: 0.01, max: 0.3, step: 0.01, default: 0.1 },
    { name: 'num_leaves', type: 'int', min: 10, max: 200, step: 10, default: 31 },
    { name: 'min_child_samples', type: 'int', min: 5, max: 100, step: 5, default: 20 },
  ],
  'Logistic Regression': [
    { name: 'C', type: 'float', min: 0.001, max: 100, step: 0.1, default: 1.0 },
    { name: 'penalty', type: 'categorical', options: ['l1', 'l2', 'elasticnet', 'none'], default: 'l2' },
    { name: 'solver', type: 'categorical', options: ['lbfgs', 'liblinear', 'saga'], default: 'lbfgs' },
    { name: 'max_iter', type: 'int', min: 100, max: 1000, step: 100, default: 100 },
  ],
  'Linear Regression': [
    { name: 'fit_intercept', type: 'boolean', default: true },
    { name: 'normalize', type: 'boolean', default: false },
  ],
};

interface TuningMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const TUNING_METHODS: TuningMethod[] = [
  {
    id: 'grid',
    name: 'Grid Search',
    description: 'Exhaustive search over specified parameter values',
    icon: <Settings className="h-5 w-5" />,
  },
  {
    id: 'random',
    name: 'Random Search',
    description: 'Random sampling of parameter combinations',
    icon: <Sliders className="h-5 w-5" />,
  },
  {
    id: 'bayesian',
    name: 'Bayesian Optimization',
    description: 'Smart search using probabilistic models',
    icon: <Zap className="h-5 w-5" />,
  },
];

interface HyperparameterTuningProps {
  selectedModels: string[];
  onTuningConfigChange?: (config: any) => void;
  onStartTuning?: (config: any) => void;
  className?: string;
}

export function HyperparameterTuning({
  selectedModels,
  onTuningConfigChange,
  onStartTuning,
  className
}: HyperparameterTuningProps) {
  const [tuningMethod, setTuningMethod] = useState<string>('grid');
  const [cvFolds, setCvFolds] = useState(5);
  const [nIterations, setNIterations] = useState(50);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set(selectedModels));
  const [parameterRanges, setParameterRanges] = useState<Record<string, any>>({});

  const toggleModelExpanded = (model: string) => {
    const newExpanded = new Set(expandedModels);
    if (newExpanded.has(model)) {
      newExpanded.delete(model);
    } else {
      newExpanded.add(model);
    }
    setExpandedModels(newExpanded);
  };

  const handleParameterChange = (modelType: string, paramName: string, value: any) => {
    const key = `${modelType}_${paramName}`;
    setParameterRanges(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getTuningConfig = () => {
    const config: any = {
      method: tuningMethod,
      cv_folds: cvFolds,
      n_iterations: tuningMethod === 'random' || tuningMethod === 'bayesian' ? nIterations : undefined,
      models: {}
    };

    selectedModels.forEach(modelType => {
      const hyperparams = MODEL_HYPERPARAMETERS[modelType] || [];
      config.models[modelType] = {};

      hyperparams.forEach(param => {
        const key = `${modelType}_${param.name}`;
        const value = parameterRanges[key];

        if (value !== undefined && value !== null) {
          config.models[modelType][param.name] = value;
        } else {
          config.models[modelType][param.name] = param.default;
        }
      });
    });

    return config;
  };

  const handleStartTuning = () => {
    const config = getTuningConfig();
    onStartTuning?.(config);
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-center gap-2 mb-6">
        <Target className="h-6 w-6 text-purple-600" />
        <h3 className="text-xl font-semibold text-gray-900">Hyperparameter Tuning</h3>
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-900">
          <p>Configure hyperparameter search to find optimal model settings. Grid search is thorough but slower, while random/Bayesian search is faster but may miss the best combination.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tuning Method
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TUNING_METHODS.map(method => (
              <button
                key={method.id}
                onClick={() => setTuningMethod(method.id)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all text-left',
                  tuningMethod === method.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    'p-2 rounded-lg',
                    tuningMethod === method.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                  )}>
                    {method.icon}
                  </div>
                  <h4 className={cn(
                    'font-medium',
                    tuningMethod === method.id ? 'text-purple-900' : 'text-gray-900'
                  )}>
                    {method.name}
                  </h4>
                </div>
                <p className="text-xs text-gray-600">{method.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cross-Validation Folds
            </label>
            <input
              type="number"
              value={cvFolds}
              onChange={(e) => setCvFolds(parseInt(e.target.value))}
              min={2}
              max={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {(tuningMethod === 'random' || tuningMethod === 'bayesian') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Iterations
              </label>
              <input
                type="number"
                value={nIterations}
                onChange={(e) => setNIterations(parseInt(e.target.value))}
                min={10}
                max={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Parameter Ranges
          </label>

          {selectedModels.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Settings className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Select models in the training configuration to tune hyperparameters
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedModels.map(modelType => {
                const hyperparams = MODEL_HYPERPARAMETERS[modelType] || [];
                const isExpanded = expandedModels.has(modelType);

                return (
                  <div key={modelType} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleModelExpanded(modelType)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                        <h4 className="font-medium text-gray-900">{modelType}</h4>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {hyperparams.length} parameters
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-4">
                        {hyperparams.map(param => (
                          <div key={param.name}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {param.name}
                            </label>

                            {param.type === 'int' || param.type === 'float' ? (
                              <div className="space-y-2">
                                <input
                                  type="range"
                                  min={param.min}
                                  max={param.max}
                                  step={param.step}
                                  value={parameterRanges[`${modelType}_${param.name}`] ?? param.default}
                                  onChange={(e) => handleParameterChange(
                                    modelType,
                                    param.name,
                                    param.type === 'int' ? parseInt(e.target.value) : parseFloat(e.target.value)
                                  )}
                                  className="w-full"
                                />
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <span>{param.min}</span>
                                  <span className="font-medium text-gray-900">
                                    {parameterRanges[`${modelType}_${param.name}`] ?? param.default ?? 'Auto'}
                                  </span>
                                  <span>{param.max}</span>
                                </div>
                              </div>
                            ) : param.type === 'categorical' ? (
                              <select
                                value={parameterRanges[`${modelType}_${param.name}`] ?? param.default}
                                onChange={(e) => handleParameterChange(modelType, param.name, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              >
                                {param.options?.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : param.type === 'boolean' ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={parameterRanges[`${modelType}_${param.name}`] ?? param.default}
                                  onChange={(e) => handleParameterChange(modelType, param.name, e.target.checked)}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-600">Enable</span>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <Button
            onClick={handleStartTuning}
            disabled={selectedModels.length === 0}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Hyperparameter Tuning
          </Button>
        </div>
      </div>
    </div>
  );
}
