'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setTrainingConfig, clearError } from '@/store/slices/trainingSlice';
import { selectCurrentDataset, selectAdvancedColumns } from '@/store/slices/dataSlice';
import type { TrainingConfig, PreprocessingConfig } from '@/lib/types';
import { PreprocessingConfigPanel, DEFAULT_PREPROCESSING_CONFIG } from './PreprocessingConfigPanel';
import { 
  Settings, 
  Target, 
  Play, 
  AlertTriangle, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TrainingConfigProps {
  onStartTraining: (config: TrainingConfig) => void;
  isTraining: boolean;
  className?: string;
}

const AVAILABLE_MODELS = [
  { id: 'random_forest', name: 'Random Forest', type: 'both', description: 'Robust ensemble method, good for most datasets' },
  { id: 'gradient_boosting', name: 'Gradient Boosting', type: 'both', description: 'High performance, handles mixed data types well' },
  { id: 'xgboost', name: 'XGBoost', type: 'both', description: 'State-of-the-art gradient boosting' },
  { id: 'linear_regression', name: 'Linear Regression', type: 'regression', description: 'Simple, interpretable for linear relationships' },
  { id: 'logistic_regression', name: 'Logistic Regression', type: 'classification', description: 'Fast, interpretable for classification' },
  { id: 'svm', name: 'Support Vector Machine', type: 'both', description: 'Effective for high-dimensional data' },
  { id: 'neural_network', name: 'Neural Network', type: 'both', description: 'Deep learning for complex patterns' }
];

export function TrainingConfig({ onStartTraining, isTraining, className }: TrainingConfigProps) {
  const dispatch = useAppDispatch();
  const currentDataset = useAppSelector(selectCurrentDataset);
  const columnInfo = useAppSelector(selectAdvancedColumns);
  
  const [config, setConfig] = useState<TrainingConfig>({
    target_column: '',
    task_type: 'classification',
    test_size: 0.2,
    cv_folds: 5,
    random_seed: 42,
    models_to_try: ['random_forest', 'gradient_boosting'],
    preprocessing: DEFAULT_PREPROCESSING_CONFIG
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreprocessing, setShowPreprocessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get numeric and categorical columns for target selection
  const availableTargets = columnInfo?.filter(col => 
    col.dtype === 'int64' || 
    col.dtype === 'float64' || 
    (col.dtype === 'object' && col.unique_count < 50) ||
    col.dtype === 'bool'
  ) || [];

  // Auto-detect task type based on target column
  useEffect(() => {
    if (config.target_column && columnInfo) {
      const targetCol = columnInfo.find(col => col.name === config.target_column);
      if (targetCol) {
        const newTaskType = 
          targetCol.dtype === 'object' || 
          targetCol.dtype === 'bool' ||
          (targetCol.dtype === 'int64' && targetCol.unique_count < 10)
            ? 'classification' 
            : 'regression';
        
        if (newTaskType !== config.task_type) {
          setConfig(prev => ({ ...prev, task_type: newTaskType }));
        }
      }
    }
  }, [config.target_column, columnInfo, config.task_type]);

  // Filter models based on task type
  const availableModels = AVAILABLE_MODELS.filter(model => 
    model.type === 'both' || model.type === config.task_type
  );

  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!config.target_column) {
      newErrors.target_column = 'Target column is required';
    }
    
    if (config.models_to_try.length === 0) {
      newErrors.models_to_try = 'At least one model must be selected';
    }
    
    if (config.test_size <= 0 || config.test_size >= 1) {
      newErrors.test_size = 'Test size must be between 0 and 1';
    }
    
    if (config.cv_folds < 2 || config.cv_folds > 20) {
      newErrors.cv_folds = 'CV folds must be between 2 and 20';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartTraining = () => {
    if (validateConfig()) {
      dispatch(setTrainingConfig(config));
      dispatch(clearError());
      onStartTraining(config);
    }
  };

  const handleModelToggle = (modelId: string) => {
    setConfig(prev => ({
      ...prev,
      models_to_try: prev.models_to_try.includes(modelId)
        ? prev.models_to_try.filter(id => id !== modelId)
        : [...prev.models_to_try, modelId]
    }));
  };

  if (!currentDataset || !currentDataset.data || currentDataset.data.length === 0) {
    return (
      <div className={cn('p-6 bg-white/60 backdrop-blur-2xl border border-orange-200 rounded-2xl shadow-sm', className)}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">No data loaded</p>
            <p className="text-gray-600 mt-1 text-sm">
              Please load and process your data before configuring training.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (availableTargets.length === 0) {
    return (
      <div className={cn('p-6 bg-white/60 backdrop-blur-2xl border border-orange-200 rounded-2xl shadow-sm', className)}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">No suitable target columns</p>
            <p className="text-gray-600 mt-1 text-sm">
              No numeric or categorical columns found that can be used as training targets.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-xl border border-gray-200">
          <Settings className="h-5 w-5 text-gray-900" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Training Configuration</h3>
      </div>

      {/* Target Column Selection */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Target className="h-4 w-4" />
          Target Column
        </label>
        <select
          value={config.target_column}
          onChange={(e) => setConfig(prev => ({ ...prev, target_column: e.target.value }))}
          className={cn(
            'w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white',
            errors.target_column ? 'border-red-300' : 'border-gray-300'
          )}
        >
          <option value="">Select target column...</option>
          {availableTargets.map((col) => (
            <option key={col.name} value={col.name}>
              {col.name} ({col.dtype}, {col.unique_count} unique)
            </option>
          ))}
        </select>
        {errors.target_column && (
          <p className="text-sm text-red-600">{errors.target_column}</p>
        )}

        {config.target_column && (
          <div className="bg-gray-100 p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-900">
              <strong>Task Type:</strong> {config.task_type === 'classification' ? 'Classification' : 'Regression'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Auto-detected based on target column characteristics
            </p>
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Select Models to Train</label>
          <div title="Choose algorithms to compare">
            <Info className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableModels.map((model) => (
            <div
              key={model.id}
              className={cn(
                'p-4 border rounded-xl cursor-pointer transition-all duration-200',
                config.models_to_try.includes(model.id)
                  ? 'border-gray-900 bg-gray-100 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
              onClick={() => handleModelToggle(model.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.models_to_try.includes(model.id)}
                      onChange={() => handleModelToggle(model.id)}
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                    />
                    <span className="font-medium text-gray-900">{model.name}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">{model.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {errors.models_to_try && (
          <p className="text-sm text-red-600">{errors.models_to_try}</p>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="border-t pt-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Advanced Settings
        </button>
        
        {showAdvanced && (
          <div className="mt-4 space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Test Size ({(config.test_size * 100).toFixed(0)}%)
              </label>
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.05"
                value={config.test_size}
                onChange={(e) => setConfig(prev => ({ ...prev, test_size: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10%</span>
                <span>50%</span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Cross-Validation Folds
              </label>
              <input
                type="number"
                min="2"
                max="20"
                value={config.cv_folds}
                onChange={(e) => setConfig(prev => ({ ...prev, cv_folds: parseInt(e.target.value) || 5 }))}
                className={cn(
                  'w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white',
                  errors.cv_folds ? 'border-red-300' : 'border-gray-300'
                )}
              />
              {errors.cv_folds && (
                <p className="text-sm text-red-600 mt-1">{errors.cv_folds}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Random Seed
              </label>
              <input
                type="number"
                value={config.random_seed}
                onChange={(e) => setConfig(prev => ({ ...prev, random_seed: parseInt(e.target.value) || 42 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Preprocessing Configuration */}
      <div className="border-t pt-4">
        <button
          onClick={() => setShowPreprocessing(!showPreprocessing)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {showPreprocessing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Preprocessing Configuration
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Optional</span>
        </button>

        {showPreprocessing && (
          <div className="mt-4">
            <PreprocessingConfigPanel
              config={config.preprocessing || DEFAULT_PREPROCESSING_CONFIG}
              onChange={(preprocessingConfig) => setConfig(prev => ({ ...prev, preprocessing: preprocessingConfig }))}
            />
          </div>
        )}
      </div>

      {/* Start Training Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={handleStartTraining}
          disabled={isTraining || !config.target_column}
          className="px-6 py-2"
        >
          <Play className="h-4 w-4 mr-2" />
          {isTraining ? 'Training...' : 'Start Training'}
        </Button>
      </div>
    </div>
  );
}