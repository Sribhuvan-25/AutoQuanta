'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PredictionResults } from '@/components/prediction/PredictionResults';
import { PredictionProgress } from '@/components/prediction/PredictionProgress';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  loadAvailableModels,
  selectModel,
  clearSelectedModel,
  setInputData,
  clearInputData,
  makePrediction,
  makeSinglePrediction,
  clearResults,
  clearError,
  selectAvailableModels,
  selectIsLoadingModels,
  selectModelsError,
  selectSelectedModel,
  selectInputData,
  selectIsPredicting,
  selectPredictionProgress,
  selectPredictionStage,
  selectPredictionResults,
  selectSinglePredictionResult,
  selectPredictionError,
  selectShowResults,
} from '@/store/slices/predictionSlice';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Upload, FileText, Calculator, Database, Zap, Download, Play } from 'lucide-react';

export default function PredictPage() {
  const dispatch = useAppDispatch();
  
  // Redux state
  const availableModels = useAppSelector(selectAvailableModels);
  const isLoadingModels = useAppSelector(selectIsLoadingModels);
  const modelsError = useAppSelector(selectModelsError);
  const selectedModel = useAppSelector(selectSelectedModel);
  const inputData = useAppSelector(selectInputData);
  const isPredicting = useAppSelector(selectIsPredicting);
  const predictionProgress = useAppSelector(selectPredictionProgress);
  const predictionStage = useAppSelector(selectPredictionStage);
  const predictionResults = useAppSelector(selectPredictionResults);
  const singlePredictionResult = useAppSelector(selectSinglePredictionResult);
  const predictionError = useAppSelector(selectPredictionError);
  const showResults = useAppSelector(selectShowResults);
  
  // Local state
  const [inputMode, setInputMode] = useState<'csv' | 'manual'>('csv');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [manualValues, setManualValues] = useState<string[]>([]);
  
  // Load models on component mount
  useEffect(() => {
    dispatch(loadAvailableModels());
  }, [dispatch]);
  
  // Initialize manual values when model is selected
  useEffect(() => {
    if (selectedModel && inputMode === 'manual') {
      const numFeatures = selectedModel.feature_count || 5;
      setManualValues(new Array(numFeatures).fill(''));
    }
  }, [selectedModel, inputMode]);
  
  // Get feature names from selected model
  const getFeatureNames = () => {
    if (selectedModel?.feature_names && selectedModel.feature_names.length > 0) {
      return selectedModel.feature_names;
    }
    // Fallback to generic names
    const count = selectedModel?.feature_count || 5;
    return Array.from({ length: count }, (_, i) => `Feature ${i + 1}`);
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvData = e.target?.result as string;
        dispatch(setInputData({
          type: 'csv',
          csvData,
          fileName: file.name,
        }));
      };
      reader.readAsText(file);
    }
  };
  
  const handleManualValueChange = (index: number, value: string) => {
    const newValues = [...manualValues];
    newValues[index] = value;
    setManualValues(newValues);
    
    // Update Redux state
    const numericValues = newValues.map(v => parseFloat(v) || 0);
    dispatch(setInputData({
      type: 'manual',
      manualValues: numericValues,
    }));
  };
  
  const handleStartPrediction = () => {
    if (!selectedModel) return;
    
    dispatch(clearError());
    
    if (inputMode === 'csv' && inputData.csvData) {
      dispatch(makePrediction({
        modelPath: selectedModel.model_path,
        csvData: inputData.csvData,
        useOnnx: selectedModel.has_onnx,
      }));
    } else if (inputMode === 'manual' && inputData.manualValues?.length) {
      dispatch(makeSinglePrediction({
        modelPath: selectedModel.model_path,
        values: inputData.manualValues,
      }));
    }
  };
  
  const handleStartNewPrediction = () => {
    dispatch(clearResults());
    dispatch(clearInputData());
    setCsvFile(null);
    setManualValues([]);
  };
  
  const handleRetryLoadModels = () => {
    dispatch(clearError());
    dispatch(loadAvailableModels());
  };
  
  const canPredict = selectedModel && (
    (inputMode === 'csv' && inputData.csvData) ||
    (inputMode === 'manual' && inputData.manualValues?.every(v => !isNaN(v)))
  );
  
  // Show results if available
  if (showResults && (predictionResults || singlePredictionResult)) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prediction Results</h1>
            <p className="text-gray-600 mt-1">
              Results from your prediction using {selectedModel?.model_name}
            </p>
          </div>
          
          <PredictionResults
            results={predictionResults}
            singleResult={singlePredictionResult}
            onStartNewPrediction={handleStartNewPrediction}
          />
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Make Predictions</h1>
          <p className="text-gray-600 mt-1">
            Use your trained models to make predictions on new data.
          </p>
        </div>

        {/* Error Display */}
        {(modelsError || predictionError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{modelsError || predictionError}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={modelsError ? handleRetryLoadModels : () => dispatch(clearError())}
                className="text-red-600 border-red-300"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Prediction Progress */}
        {isPredicting && (
          <PredictionProgress
            isPredicting={isPredicting}
            progress={predictionProgress}
            stage={predictionStage}
          />
        )}

        {/* Model Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Select Model</h2>
          </div>
          
          {isLoadingModels ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <span className="text-gray-600">Loading available models...</span>
            </div>
          ) : availableModels.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Models Available</h3>
              <p className="text-gray-600 mb-4">
                You need to train models first before making predictions.
              </p>
              <Button onClick={() => window.location.href = '/train'}>
                Go to Training
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {availableModels.map((model, index) => (
                <div
                  key={`${model.model_name}-${model.export_timestamp}-${index}`}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedModel?.model_path === model.model_path
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => dispatch(selectModel(model))}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {model.model_name.toUpperCase()} 
                        <span className="text-sm text-gray-500 ml-2">
                          ({new Date(model.export_timestamp).toLocaleString()})
                        </span>
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600 mt-1">
                        <div className="flex gap-4">
                          <span>Type: {model.model_type.toUpperCase()}</span>
                          <span>Task: {model.task_type}</span>
                          <span>Score: {model.best_score.toFixed(4)}</span>
                          <span>Features: {model.feature_count}</span>
                        </div>
                        {model.feature_names && model.feature_names.length > 0 && (
                          <div className="text-xs text-gray-500">
                            Features: {model.feature_names.slice(0, 3).join(', ')}
                            {model.feature_names.length > 3 && ` ... and ${model.feature_names.length - 3} more`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {model.has_onnx && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">ONNX</span>
                      )}
                      {model.has_pickle && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">PKL</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Data */}
        {selectedModel && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Input Data</h2>
            </div>
            
            {/* Input Mode Selection */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={inputMode === 'csv' ? 'default' : 'outline'}
                onClick={() => {
                  setInputMode('csv');
                  dispatch(clearInputData());
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
              <Button
                variant={inputMode === 'manual' ? 'default' : 'outline'}
                onClick={() => {
                  setInputMode('manual');
                  dispatch(clearInputData());
                  const numFeatures = selectedModel.feature_count || 5;
                  setManualValues(new Array(numFeatures).fill(''));
                }}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Manual Input
              </Button>
            </div>
            
            {/* CSV Upload */}
            {inputMode === 'csv' && (
              <div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Upload CSV File</h3>
                    <p className="text-gray-600 mb-4">
                      Choose a CSV file with {selectedModel.feature_count} numeric columns
                      {selectedModel.feature_names && selectedModel.feature_names.length > 0 && (
                        <>
                          <br />
                          <span className="text-sm">Expected columns: {getFeatureNames().join(', ')}</span>
                        </>
                      )}
                    </p>
                    <Button>Choose File</Button>
                  </label>
                </div>
                
                {csvFile && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">{csvFile.name}</span>
                      <span className="text-green-600">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Manual Input */}
            {inputMode === 'manual' && (
              <div>
                <p className="text-gray-600 mb-4">
                  Enter values for {selectedModel.feature_count} features:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {manualValues.map((value, index) => {
                    const featureNames = getFeatureNames();
                    const featureName = featureNames[index] || `Feature ${index + 1}`;
                    
                    return (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {featureName}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={value}
                          onChange={(e) => handleManualValueChange(index, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Prediction Button */}
            <div className="flex justify-end mt-6">
              <Button
                onClick={handleStartPrediction}
                disabled={!canPredict || isPredicting}
                size="lg"
              >
                {isPredicting ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Predicting...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    {inputMode === 'csv' ? 'Make Predictions' : 'Predict Single Value'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
