'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TrainingConfig } from '@/components/training/TrainingConfig';
import { TrainingProgress } from '@/components/training/TrainingProgress';
import { TrainingResults } from '@/components/training/TrainingResults';
import { ModelDetailsModal } from '@/components/training/ModelDetailsModal';
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
  selectResultsSavedToProject,
  selectProjectSavePath,
  clearError
} from '@/store/slices/trainingSlice';
import { selectCurrentDataset } from '@/store/slices/dataSlice';
import { 
  selectCurrentProject, 
  selectIsProjectLoaded,
  showCreateWizard 
} from '@/store/slices/projectSlice';
import type { TrainingConfig as TrainingConfigType } from '@/lib/types';
import { AlertTriangle, RefreshCw, Folder, Plus } from 'lucide-react';
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
  const currentProject = useAppSelector(selectCurrentProject);
  const isProjectLoaded = useAppSelector(selectIsProjectLoaded);
  const resultsSavedToProject = useAppSelector(selectResultsSavedToProject);
  const projectSavePath = useAppSelector(selectProjectSavePath);
  
  const [showResults, setShowResults] = useState(false);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStartTraining = async (config: TrainingConfigType) => {
    try {
      setShowResults(false);
      
      // Prepare dataset data if available
      const datasetData = currentDataset ? {
        data: currentDataset.data,
        headers: currentDataset.headers,
        filePath: currentDataset.filePath
      } : undefined;
      
      // Include project information in training request if available (optional)
      const result = await dispatch(startTraining({ 
        config, 
        datasetData, 
        projectConfig: currentProject || undefined
      }));
      
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
          {currentProject && (
            <div className="mt-3 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
              <Folder className="h-4 w-4" />
              <span>
                Training results will be saved to: <strong>{currentProject.metadata.name}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Project Recommendation Notice */}
        {!isProjectLoaded && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Folder className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Project Recommended</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Create a project to automatically save your training results and models for future use.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch(showCreateWizard())}
                className="text-blue-600 border-blue-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          </div>
        )}

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
          <>
            <TrainingResults
              results={currentResults}
              modelComparison={modelComparison}
              bestModel={bestModel}
              onExportResults={handleExportResults}
              onViewDetails={(modelName) => {
                const model = modelComparison.find(m => m.model_name === modelName);
                if (model) {
                  setSelectedModel(model);
                  setIsModalOpen(true);
                }
              }}
            />

            {/* Project Save Status */}
            {resultsSavedToProject && currentProject && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-green-800">Results Saved to Project</h3>
                    <p className="text-sm text-green-700 mt-1">
                      Training results and models have been saved to <strong>{currentProject.metadata.name}</strong>
                      {projectSavePath && (
                        <>
                          <br />
                          <span className="text-xs font-mono text-green-600">{projectSavePath}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Model Details Modal */}
        <ModelDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          model={selectedModel}
          trainingResults={currentResults}
        />
      </div>
    </AppLayout>
  );
}
