'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PreprocessingConfig {
  // Data Validation
  enable_validation: boolean;
  remove_duplicates: boolean;
  fix_data_types: boolean;
  remove_constant_features: boolean;
  remove_high_missing: boolean;

  // Missing Values
  handle_missing: boolean;
  missing_strategy: 'median' | 'mean' | 'mode' | 'knn' | 'iterative';

  // Outlier Handling
  handle_outliers: boolean;
  outlier_method: 'iqr' | 'zscore';

  // Feature Scaling
  scaling_strategy: 'standard' | 'minmax' | 'robust' | 'none';

  // Categorical Encoding
  categorical_encoding: 'onehot' | 'target' | 'ordinal' | 'frequency';
  max_cardinality: number;

  // Feature Engineering
  enable_feature_engineering: boolean;
  create_polynomial: boolean;
  polynomial_degree: number;
  create_interactions: boolean;
  create_binning: boolean;
}

export const DEFAULT_PREPROCESSING_CONFIG: PreprocessingConfig = {
  enable_validation: true,
  remove_duplicates: true,
  fix_data_types: true,
  remove_constant_features: true,
  remove_high_missing: true,

  handle_missing: true,
  missing_strategy: 'median',

  handle_outliers: true,
  outlier_method: 'iqr',

  scaling_strategy: 'standard',

  categorical_encoding: 'onehot',
  max_cardinality: 50,

  enable_feature_engineering: false,
  create_polynomial: false,
  polynomial_degree: 2,
  create_interactions: false,
  create_binning: false,
};

interface PreprocessingConfigPanelProps {
  config: PreprocessingConfig;
  onChange: (config: PreprocessingConfig) => void;
  className?: string;
}

export function PreprocessingConfigPanel({ config, onChange, className }: PreprocessingConfigPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    validation: false,
    missing: false,
    outliers: false,
    scaling: true,
    encoding: true,
    engineering: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateConfig = (updates: Partial<PreprocessingConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Preprocessing Configuration</h3>
      </div>

      {/* Data Validation Section */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection('validation')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">Data Validation & Cleaning</span>
            {config.enable_validation && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Enabled</span>
            )}
          </div>
          {expandedSections.validation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expandedSections.validation && (
          <div className="p-4 border-t border-gray-200 space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.enable_validation}
                onChange={(e) => updateConfig({ enable_validation: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Enable data validation</span>
            </label>

            {config.enable_validation && (
              <div className="ml-6 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.remove_duplicates}
                    onChange={(e) => updateConfig({ remove_duplicates: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Remove duplicate rows</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.fix_data_types}
                    onChange={(e) => updateConfig({ fix_data_types: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Auto-fix data types</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.remove_constant_features}
                    onChange={(e) => updateConfig({ remove_constant_features: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Remove constant features (&gt;95% same value)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.remove_high_missing}
                    onChange={(e) => updateConfig({ remove_high_missing: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Remove high missing columns (&gt;80% missing)</span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Missing Values Section */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection('missing')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">Missing Value Handling</span>
            {config.handle_missing && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{config.missing_strategy}</span>
            )}
          </div>
          {expandedSections.missing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expandedSections.missing && (
          <div className="p-4 border-t border-gray-200 space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.handle_missing}
                onChange={(e) => updateConfig({ handle_missing: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Handle missing values</span>
            </label>

            {config.handle_missing && (
              <div className="ml-6 space-y-2">
                <label className="text-sm text-gray-600 block mb-1">Imputation Strategy:</label>
                <select
                  value={config.missing_strategy}
                  onChange={(e) => updateConfig({ missing_strategy: e.target.value as PreprocessingConfig['missing_strategy'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="median">Median (Fast, robust to outliers)</option>
                  <option value="mean">Mean (Fast, for normal distributions)</option>
                  <option value="mode">Mode (Most frequent value)</option>
                  <option value="knn">KNN (Uses similar samples)</option>
                  <option value="iterative">Iterative/MICE (Most accurate, slower)</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outlier Handling Section */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection('outliers')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">Outlier Detection & Handling</span>
            {config.handle_outliers && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{config.outlier_method}</span>
            )}
          </div>
          {expandedSections.outliers ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expandedSections.outliers && (
          <div className="p-4 border-t border-gray-200 space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.handle_outliers}
                onChange={(e) => updateConfig({ handle_outliers: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Handle outliers</span>
            </label>

            {config.handle_outliers && (
              <div className="ml-6 space-y-2">
                <label className="text-sm text-gray-600 block mb-1">Detection Method:</label>
                <select
                  value={config.outlier_method}
                  onChange={(e) => updateConfig({ outlier_method: e.target.value as PreprocessingConfig['outlier_method'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="iqr">IQR (Interquartile Range)</option>
                  <option value="zscore">Z-Score (3 std deviations)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Outliers will be clipped to boundary values</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feature Scaling Section */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection('scaling')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">Feature Scaling</span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{config.scaling_strategy}</span>
          </div>
          {expandedSections.scaling ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expandedSections.scaling && (
          <div className="p-4 border-t border-gray-200 space-y-3">
            <label className="text-sm text-gray-600 block mb-1">Scaling Strategy:</label>
            <select
              value={config.scaling_strategy}
              onChange={(e) => updateConfig({ scaling_strategy: e.target.value as PreprocessingConfig['scaling_strategy'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="standard">Standard Scaler (mean=0, std=1)</option>
              <option value="minmax">MinMax Scaler (0-1 range)</option>
              <option value="robust">Robust Scaler (median-based, resistant to outliers)</option>
              <option value="none">None (for tree-based models)</option>
            </select>
            <div className="bg-blue-50 p-3 rounded-lg mt-2">
              <p className="text-xs text-blue-800">
                <Info className="h-3 w-3 inline mr-1" />
                Standard scaling recommended for SVM, Neural Networks, KNN
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Categorical Encoding Section */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection('encoding')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">Categorical Encoding</span>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{config.categorical_encoding}</span>
          </div>
          {expandedSections.encoding ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expandedSections.encoding && (
          <div className="p-4 border-t border-gray-200 space-y-3">
            <label className="text-sm text-gray-600 block mb-1">Encoding Strategy:</label>
            <select
              value={config.categorical_encoding}
              onChange={(e) => updateConfig({ categorical_encoding: e.target.value as PreprocessingConfig['categorical_encoding'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="onehot">One-Hot (Binary columns per category)</option>
              <option value="target">Target Encoding (Mean target per category)</option>
              <option value="ordinal">Ordinal (Integer mapping)</option>
              <option value="frequency">Frequency (Count-based encoding)</option>
            </select>

            <div className="space-y-2 mt-3">
              <label className="text-sm text-gray-600 block">Maximum Cardinality:</label>
              <input
                type="number"
                value={config.max_cardinality}
                onChange={(e) => updateConfig({ max_cardinality: parseInt(e.target.value) || 50 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                min="5"
                max="200"
              />
              <p className="text-xs text-gray-500">Columns with more unique values will be dropped</p>
            </div>
          </div>
        )}
      </div>

      {/* Feature Engineering Section */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection('engineering')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">Feature Engineering</span>
            {config.enable_feature_engineering && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Enabled</span>
            )}
          </div>
          {expandedSections.engineering ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expandedSections.engineering && (
          <div className="p-4 border-t border-gray-200 space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.enable_feature_engineering}
                onChange={(e) => updateConfig({ enable_feature_engineering: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Enable feature engineering</span>
            </label>

            {config.enable_feature_engineering && (
              <div className="ml-6 space-y-3">
                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={config.create_polynomial}
                      onChange={(e) => updateConfig({ create_polynomial: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">Create polynomial features</span>
                  </label>
                  {config.create_polynomial && (
                    <div className="ml-6">
                      <label className="text-xs text-gray-500 block mb-1">Polynomial Degree:</label>
                      <input
                        type="number"
                        value={config.polynomial_degree}
                        onChange={(e) => updateConfig({ polynomial_degree: parseInt(e.target.value) || 2 })}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        min="2"
                        max="3"
                      />
                      <p className="text-xs text-gray-400 mt-1">Creates x², x³, x₁×x₂ combinations</p>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.create_interactions}
                    onChange={(e) => updateConfig({ create_interactions: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Create interaction features</span>
                  <Info className="h-3 w-3 text-gray-400" title="Multiplies promising feature pairs" />
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.create_binning}
                    onChange={(e) => updateConfig({ create_binning: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Create binned features</span>
                  <Info className="h-3 w-3 text-gray-400" title="Discretizes continuous features into bins" />
                </label>

                <div className="bg-yellow-50 p-3 rounded-lg mt-2">
                  <p className="text-xs text-yellow-800">
                    <Info className="h-3 w-3 inline mr-1" />
                    Feature engineering may significantly increase training time
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