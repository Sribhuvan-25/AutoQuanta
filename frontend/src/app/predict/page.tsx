'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PredictionResults } from '@/components/prediction/PredictionResults';
import { PredictionProgress } from '@/components/prediction/PredictionProgress';
import { CSVValidator, CSVValidationDisplay, type CSVValidationResult } from '@/components/prediction/CSVValidator';
import { ModelSelectionModal } from '@/components/prediction/ModelSelectionModal';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  loadAvailableModels,
  selectModel,
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
import { AlertTriangle, RefreshCw, Upload, FileText, Calculator, Database, Zap, Play, ChevronDown, Check } from 'lucide-react';

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
  const [csvValidation, setCsvValidation] = useState<CSVValidationResult | null>(null);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  
  // Load models on component mount
  useEffect(() => {
    dispatch(loadAvailableModels());
  }, [dispatch]);

  // Auto-select best model when models are loaded
  useEffect(() => {
    if (availableModels.length > 0 && !selectedModel) {
      // Sort models by score and select the best one
      const bestModel = [...availableModels].sort((a, b) => b.best_score - a.best_score)[0];
      dispatch(selectModel(bestModel));
    }
  }, [availableModels, selectedModel, dispatch]);
  
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
    (inputMode === 'csv' && inputData.csvData && (!csvValidation || csvValidation.isValid)) ||
    (inputMode === 'manual' && inputData.manualValues?.every(v => !isNaN(v)))
  );
  
  // Show results if available
  if (showResults && (predictionResults || singlePredictionResult)) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">Prediction Results</h1>
            <p className="text-lg text-gray-600 mt-3 max-w-3xl">
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
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Make Predictions</h1>
          <p className="text-lg text-gray-600 mt-3 max-w-3xl">
            Use your trained models to make predictions on new data.
          </p>
        </div>

        {/* Error Display */}
        {(modelsError || predictionError) && (
          <div className="bg-white/60 backdrop-blur-2xl border border-red-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Error</h3>
                  <p className="text-sm text-gray-600 mt-2">{modelsError || predictionError}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={modelsError ? handleRetryLoadModels : () => dispatch(clearError())}
                className="flex-shrink-0"
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
        <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gray-100 rounded-xl border border-gray-200">
              <Database className="h-5 w-5 text-gray-900" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Selected Model</h2>
          </div>

          {isLoadingModels ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-700 mr-3" />
              <span className="text-gray-600 font-medium">Loading available models...</span>
            </div>
          ) : availableModels.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-100 rounded-2xl border border-gray-200 w-fit mx-auto mb-6">
                <Database className="h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No Models Available</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                You need to train models first before making predictions.
              </p>
              <Button onClick={() => window.location.href = '/train'} size="lg">
                Go to Training
              </Button>
            </div>
          ) : (
            <>
              {/* Current Selected Model Display */}
              {selectedModel ? (
                <div className="p-5 rounded-2xl border border-gray-300 bg-gradient-to-br from-gray-100 to-gray-50 mb-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-1.5 bg-white rounded-lg border border-gray-300">
                          <Check className="h-5 w-5 text-gray-900" />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {selectedModel.model_name.toUpperCase()}
                        </h3>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-300 text-gray-900 text-xs font-medium rounded-xl shadow-sm">
                          <Zap className="h-3 w-3" />
                          Best Model
                        </span>
                      </div>
                      <div className="flex gap-6 text-sm text-gray-600">
                        <span>Type: <span className="font-semibold text-gray-900">{selectedModel.model_type.toUpperCase()}</span></span>
                        <span>Task: <span className="font-semibold text-gray-900">{selectedModel.task_type}</span></span>
                        <span>Score: <span className="font-semibold text-gray-900">{selectedModel.best_score.toFixed(4)}</span></span>
                        <span>Features: <span className="font-semibold text-gray-900">{selectedModel.feature_count}</span></span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selectedModel.has_onnx && (
                        <span className="px-3 py-1.5 bg-white border border-gray-300 text-gray-900 text-xs font-medium rounded-xl shadow-sm">ONNX</span>
                      )}
                      {selectedModel.has_pickle && (
                        <span className="px-3 py-1.5 bg-white border border-gray-300 text-gray-900 text-xs font-medium rounded-xl shadow-sm">PKL</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Model Selection Button */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600 font-medium">
                  {availableModels.length} model{availableModels.length !== 1 ? 's' : ''} available
                </p>
                <Button
                  variant="outline"
                  onClick={() => setIsModelModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Database className="h-4 w-4" />
                  Choose Different Model
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Input Data */}
        {selectedModel && (
          <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gray-100 rounded-xl border border-gray-200">
                <FileText className="h-5 w-5 text-gray-900" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Input Data</h2>
            </div>

            {/* Input Mode Selection */}
            <div className="flex gap-3 mb-6">
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
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <div className="p-4 bg-gray-100 rounded-2xl border border-gray-200 w-fit mx-auto mb-6">
                      <Upload className="h-12 w-12 text-gray-900" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Upload CSV File</h3>
                    <p className="text-gray-600 mb-4 max-w-md mx-auto">
                      Choose a CSV file with {selectedModel.feature_count} numeric columns
                      {selectedModel.feature_names && selectedModel.feature_names.length > 0 && (
                        <>
                          <br />
                          <span className="text-sm">Expected columns: {getFeatureNames().join(', ')}</span>
                        </>
                      )}
                    </p>
                    <Button size="lg">Choose File</Button>
                  </label>
                </div>

                {csvFile && (
                  <div className="mt-6 space-y-4">
                    <div className="p-4 bg-gray-100 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-gray-200">
                          <FileText className="h-5 w-5 text-gray-900" />
                        </div>
                        <span className="font-semibold text-gray-900">{csvFile.name}</span>
                        <span className="text-gray-600">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    </div>
                    
                    {/* CSV Validation */}
                    {selectedModel && inputData.csvData && (
                      <>
                        <CSVValidator
                          csvData={inputData.csvData}
                          expectedFeatures={getFeatureNames()}
                          onValidation={setCsvValidation}
                        />
                        <CSVValidationDisplay
                          validation={csvValidation}
                          onDismiss={() => setCsvValidation(null)}
                        />
                      </>
                    )}
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

        {/* Model Selection Modal */}
        <ModelSelectionModal
          isOpen={isModelModalOpen}
          onClose={() => setIsModelModalOpen(false)}
          availableModels={availableModels}
          selectedModel={selectedModel}
          onSelectModel={(model) => dispatch(selectModel(model))}
        />
      </div>
    </AppLayout>
  );
}
