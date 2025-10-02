'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Layers,
  Info,
  Plus,
  Trash2,
  TrendingUp,
  GitMerge,
  Award,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EnsembleMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  requiresWeights: boolean;
}

const ENSEMBLE_METHODS: EnsembleMethod[] = [
  {
    id: 'voting',
    name: 'Voting Ensemble',
    description: 'Combine predictions by majority vote (classification) or averaging (regression)',
    icon: <Award className="h-5 w-5" />,
    requiresWeights: true,
  },
  {
    id: 'stacking',
    name: 'Stacking',
    description: 'Use a meta-model to combine base model predictions',
    icon: <Layers className="h-5 w-5" />,
    requiresWeights: false,
  },
  {
    id: 'blending',
    name: 'Blending',
    description: 'Weighted average of model predictions',
    icon: <GitMerge className="h-5 w-5" />,
    requiresWeights: true,
  },
];

const META_MODELS = [
  'Logistic Regression',
  'Linear Regression',
  'Ridge Regression',
  'Lasso Regression',
  'Random Forest'
];

interface EnsembleConfigProps {
  availableModels: string[];
  taskType: 'classification' | 'regression';
  onConfigChange?: (config: any) => void;
  className?: string;
}

export function EnsembleConfig({
  availableModels,
  taskType,
  onConfigChange,
  className
}: EnsembleConfigProps) {
  const [ensembleMethod, setEnsembleMethod] = useState<string>('voting');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [modelWeights, setModelWeights] = useState<Record<string, number>>({});
  const [metaModel, setMetaModel] = useState<string>('Logistic Regression');
  const [votingType, setVotingType] = useState<'hard' | 'soft'>('soft');

  const currentMethod = ENSEMBLE_METHODS.find(m => m.id === ensembleMethod);

  const handleToggleModel = (model: string) => {
    setSelectedModels(prev => {
      if (prev.includes(model)) {
        const newWeights = { ...modelWeights };
        delete newWeights[model];
        setModelWeights(newWeights);
        return prev.filter(m => m !== model);
      } else {
        setModelWeights(prev => ({ ...prev, [model]: 1.0 }));
        return [...prev, model];
      }
    });
  };

  const handleWeightChange = (model: string, weight: number) => {
    setModelWeights(prev => ({ ...prev, [model]: weight }));
  };

  const normalizeWeights = () => {
    const total = Object.values(modelWeights).reduce((sum, w) => sum + w, 0);
    if (total === 0) return;

    const normalized: Record<string, number> = {};
    Object.entries(modelWeights).forEach(([model, weight]) => {
      normalized[model] = weight / total;
    });
    setModelWeights(normalized);
  };

  const getEnsembleConfig = () => {
    const config: any = {
      method: ensembleMethod,
      models: selectedModels,
      task_type: taskType,
    };

    if (currentMethod?.requiresWeights) {
      config.weights = modelWeights;
    }

    if (ensembleMethod === 'voting') {
      config.voting_type = votingType;
    }

    if (ensembleMethod === 'stacking') {
      config.meta_model = metaModel;
    }

    return config;
  };

  React.useEffect(() => {
    onConfigChange?.(getEnsembleConfig());
  }, [ensembleMethod, selectedModels, modelWeights, metaModel, votingType]);

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-center gap-2 mb-6">
        <Layers className="h-6 w-6 text-indigo-600" />
        <h3 className="text-xl font-semibold text-gray-900">Ensemble Configuration</h3>
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-900">
          <p>Ensemble methods combine multiple models to improve prediction accuracy and robustness. Select at least 2 models to create an ensemble.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Ensemble Method
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ENSEMBLE_METHODS.map(method => (
              <button
                key={method.id}
                onClick={() => setEnsembleMethod(method.id)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all text-left',
                  ensembleMethod === method.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    'p-2 rounded-lg',
                    ensembleMethod === method.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                  )}>
                    {method.icon}
                  </div>
                  <h4 className={cn(
                    'font-medium',
                    ensembleMethod === method.id ? 'text-indigo-900' : 'text-gray-900'
                  )}>
                    {method.name}
                  </h4>
                </div>
                <p className="text-xs text-gray-600">{method.description}</p>
              </button>
            ))}
          </div>
        </div>

        {ensembleMethod === 'voting' && taskType === 'classification' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voting Type
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setVotingType('hard')}
                className={cn(
                  'flex-1 p-3 rounded-lg border-2 transition-all',
                  votingType === 'hard'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <p className="font-medium text-gray-900">Hard Voting</p>
                <p className="text-xs text-gray-600 mt-1">Majority vote</p>
              </button>
              <button
                onClick={() => setVotingType('soft')}
                className={cn(
                  'flex-1 p-3 rounded-lg border-2 transition-all',
                  votingType === 'soft'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <p className="font-medium text-gray-900">Soft Voting</p>
                <p className="text-xs text-gray-600 mt-1">Probability average</p>
              </button>
            </div>
          </div>
        )}

        {ensembleMethod === 'stacking' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meta-Model (Final Estimator)
            </label>
            <select
              value={metaModel}
              onChange={(e) => setMetaModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {META_MODELS.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-600">
              The meta-model learns how to best combine the base model predictions
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Base Models ({selectedModels.length} selected)
          </label>

          {availableModels.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Layers className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Train multiple models first to create an ensemble
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableModels.map(model => {
                const isSelected = selectedModels.includes(model);
                const weight = modelWeights[model] || 1.0;

                return (
                  <div
                    key={model}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all',
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleModel(model)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="font-medium text-gray-900">{model}</span>
                      </div>
                    </div>

                    {isSelected && currentMethod?.requiresWeights && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm text-gray-700">Weight</label>
                          <span className="text-sm font-medium text-gray-900">
                            {weight.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={2}
                          step={0.1}
                          value={weight}
                          onChange={(e) => handleWeightChange(model, parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                          <span>0.0</span>
                          <span>2.0</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {currentMethod?.requiresWeights && selectedModels.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={normalizeWeights}
                  className="w-full"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Normalize Weights to Sum = 1.0
                </Button>
              )}
            </div>
          )}
        </div>

        {selectedModels.length < 2 && (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              ⚠ Select at least 2 models to create an ensemble
            </p>
          </div>
        )}

        {selectedModels.length >= 2 && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-2">
              <Award className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900 mb-1">
                  Ensemble Ready
                </p>
                <p className="text-xs text-green-700">
                  {selectedModels.length} models will be combined using {currentMethod?.name}
                  {currentMethod?.requiresWeights && ` with ${Object.values(modelWeights).some(w => w !== 1) ? 'custom' : 'equal'} weights`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
