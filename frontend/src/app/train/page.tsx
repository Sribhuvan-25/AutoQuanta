'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TrainingConfig } from '@/components/training/TrainingConfig';
import { TrainingProgress } from '@/components/training/TrainingProgress';
import { TrainingResults } from '@/components/training/TrainingResults';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { 
  startTraining, 
  stopTraining,
  selectIsTraining,
  selectTrainingStage,
  selectTrainingProgress,
  selectEstimatedTimeRemaining,
  selectCurrentResults,
  selectModelComparison,
  selectBestModel,
  selectTrainingError,
  clearError
} from '@/store/slices/trainingSlice';
import { selectCurrentDataset } from '@/store/slices/dataSlice';
import type { TrainingConfig as TrainingConfigType } from '@/lib/types';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TrainPage() {
  const dispatch = useAppDispatch();
  const isTraining = useAppSelector(selectIsTraining);
  const trainingStage = useAppSelector(selectTrainingStage);
  const trainingProgress = useAppSelector(selectTrainingProgress);
  const estimatedTimeRemaining = useAppSelector(selectEstimatedTimeRemaining);
  const currentResults = useAppSelector(selectCurrentResults);
  const modelComparison = useAppSelector(selectModelComparison);
  const bestModel = useAppSelector(selectBestModel);
  const trainingError = useAppSelector(selectTrainingError);
  const currentDataset = useAppSelector(selectCurrentDataset);
  
  const [showResults, setShowResults] = useState(false);

  const handleStartTraining = async (config: TrainingConfigType) => {
    try {
      setShowResults(false);
      
      // Prepare dataset data if available
      const datasetData = currentDataset ? {
        data: currentDataset.data,
        filePath: currentDataset.filePath
      } : undefined;
      
      const result = await dispatch(startTraining({ config, datasetData }));
      if (startTraining.fulfilled.match(result)) {
        setShowResults(true);
      }
    } catch (error) {
      console.error('Training failed:', error);
    }
  };

  const handleStopTraining = () => {
    dispatch(stopTraining());
  };

  const handleRetryTraining = () => {
    dispatch(clearError());
  };

  const handleExportResults = () => {
    if (currentResults) {
      // Create downloadable JSON file
      const dataStr = JSON.stringify(currentResults, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `training_results_${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Model Training</h1>
          <p className="text-gray-600 mt-1">
            Configure and train machine learning models on your data.
          </p>
        </div>

        {/* Error Display */}
        {trainingError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Training Error</h3>
                  <p className="text-sm text-red-700 mt-1">{trainingError}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryTraining}
                className="text-red-600 border-red-300"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Training Configuration */}
        <TrainingConfig
          onStartTraining={handleStartTraining}
          isTraining={isTraining}
        />

        {/* Training Progress */}
        {(isTraining || trainingStage) && (
          <TrainingProgress
            isTraining={isTraining}
            stage={trainingStage}
            progress={trainingProgress}
            estimatedTimeRemaining={estimatedTimeRemaining}
            onStopTraining={handleStopTraining}
          />
        )}

        {/* Training Results */}
        {(showResults || currentResults) && (
          <TrainingResults
            results={currentResults}
            modelComparison={modelComparison}
            bestModel={bestModel}
            onExportResults={handleExportResults}
            onViewDetails={(modelName) => {
              console.log('View details for model:', modelName);
              // In a real app, this would open a detailed model view
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
