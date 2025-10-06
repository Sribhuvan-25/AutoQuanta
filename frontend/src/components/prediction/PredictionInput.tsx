'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileSpreadsheet,
  Hash,
  Type,
  Calendar,
  X,
  AlertCircle,
  Download,
  Info,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SavedModel } from '@/lib/types';

interface PredictionInputProps {
  selectedModel: SavedModel;
  onPredict: (data: PredictionInputData) => void;
  isPredicting?: boolean;
  className?: string;
}

export interface PredictionInputData {
  type: 'single' | 'batch';
  singleData?: Record<string, unknown>;
  batchFile?: File;
  batchData?: string[][];
}

export function PredictionInput({
  selectedModel,
  onPredict,
  isPredicting = false,
  className
}: PredictionInputProps) {
  const [inputMode, setInputMode] = useState<'single' | 'batch'>('single');
  const [singleValues, setSingleValues] = useState<Record<string, string>>({});
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const features = selectedModel.feature_names;

  // Determine input type for each feature
  const getInputType = (featureName: string): 'number' | 'text' | 'date' => {
    const lower = featureName.toLowerCase();
    if (lower.includes('date') || lower.includes('time')) return 'date';
    if (lower.includes('id') || lower.includes('code')) return 'text';
    return 'number'; // Default to number for ML features
  };

  const getIcon = (featureName: string) => {
    const type = getInputType(featureName);
    if (type === 'date') return Calendar;
    if (type === 'text') return Type;
    return Hash;
  };

  // Handle single value input change
  const handleSingleValueChange = (feature: string, value: string) => {
    setSingleValues(prev => ({ ...prev, [feature]: value }));
    // Clear error for this field
    if (errors[feature]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[feature];
        return newErrors;
      });
    }
  };

  // Handle batch file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setErrors({ file: 'Please upload a CSV file' });
        return;
      }
      setBatchFile(file);
      setErrors({});
    }
  };

  // Validate single input
  const validateSingleInput = (): boolean => {
    const newErrors: Record<string, string> = {};

    features.forEach(feature => {
      const value = singleValues[feature];
      if (!value || value.trim() === '') {
        newErrors[feature] = 'Required';
      } else if (getInputType(feature) === 'number') {
        if (isNaN(Number(value))) {
          newErrors[feature] = 'Must be a number';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle prediction submission
  const handleSubmit = () => {
    if (inputMode === 'single') {
      if (!validateSingleInput()) return;

      // Convert values to appropriate types
      const data: Record<string, unknown> = {};
      features.forEach(feature => {
        const value = singleValues[feature];
        const type = getInputType(feature);

        if (type === 'number') {
          data[feature] = Number(value);
        } else {
          data[feature] = value;
        }
      });

      onPredict({ type: 'single', singleData: data });
    } else {
      if (!batchFile) {
        setErrors({ file: 'Please upload a CSV file' });
        return;
      }
      onPredict({ type: 'batch', batchFile });
    }
  };

  // Download template CSV
  const handleDownloadTemplate = () => {
    const headers = features.join(',');
    const exampleRow = features.map(() => '').join(',');
    const csvContent = `${headers}\n${exampleRow}`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedModel.model_name}_input_template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Prediction Input</h3>
        <p className="text-sm text-gray-600 mt-1">
          Using model: <span className="font-medium text-blue-600">{selectedModel.model_name}</span>
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Input Mode Toggle */}
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setInputMode('single')}
            className={cn(
              'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors',
              inputMode === 'single'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Single Prediction
          </button>
          <button
            onClick={() => setInputMode('batch')}
            className={cn(
              'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors',
              inputMode === 'batch'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Batch Prediction
          </button>
        </div>

        {/* Single Prediction Form */}
        {inputMode === 'single' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Enter values for all {features.length} features required by the model
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
              {features.map((feature) => {
                const Icon = getIcon(feature);
                const inputType = getInputType(feature);
                const error = errors[feature];

                return (
                  <div key={feature} className="space-y-1">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Icon className="h-4 w-4 text-gray-400" />
                      {feature}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={inputType === 'date' ? 'date' : 'text'}
                      value={singleValues[feature] || ''}
                      onChange={(e) => handleSingleValueChange(feature, e.target.value)}
                      placeholder={inputType === 'number' ? '0.0' : 'Enter value'}
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg text-sm',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500',
                        error
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      )}
                    />
                    {error && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Batch Prediction Upload */}
        {inputMode === 'batch' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Upload a CSV file with {features.length} columns matching the required features
              </p>
            </div>

            {/* Template Download */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Need a template?</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Download a CSV template with the correct columns
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>

            {/* File Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                batchFile
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              {batchFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{batchFile.name}</p>
                    <p className="text-sm text-gray-600">
                      {(batchFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBatchFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="font-medium text-gray-900">Upload CSV File</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Click to browse or drag and drop
                  </p>
                </>
              )}
            </div>

            {errors.file && (
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {errors.file}
              </p>
            )}

            {/* Required Features List */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-2">
                Required columns ({features.length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {features.map((feature) => (
                  <span
                    key={feature}
                    className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Predict Button */}
        <Button
          onClick={handleSubmit}
          disabled={isPredicting || (inputMode === 'batch' && !batchFile)}
          className="w-full"
        >
          {isPredicting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Predicting...
            </>
          ) : (
            <>
              Make {inputMode === 'batch' ? 'Batch ' : ''}Prediction
            </>
          )}
        </Button>
      </div>
    </div>
  );
}