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
  const [selectedModel, setSelectedModel] = useState<ModelTrainingResult | null>(null);
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
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">Model Training</h1>
            <p className="text-lg text-gray-600 mt-3 max-w-3xl">
              Configure and train machine learning models on your data with automatic hyperparameter optimization.
            </p>
          </div>
          {currentProject && (
            <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-xl border border-gray-200">
                  <Folder className="h-4 w-4 text-gray-900" />
                </div>
                <span className="text-sm text-gray-700">
                  Training results will be saved to <strong className="text-gray-900">{currentProject.metadata.name}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Project Recommendation Notice */}
        {!isProjectLoaded && (
          <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-gray-100 rounded-xl border border-gray-200">
                  <Folder className="h-5 w-5 text-gray-900" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Project Recommended</h3>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                    Create a project to automatically save your training results and models for future use.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch(showCreateWizard())}
                className="flex-shrink-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {trainingError && (
          <div className="bg-white/60 backdrop-blur-2xl border border-red-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Training Error</h3>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{trainingError}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryTraining}
                className="flex-shrink-0"
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
              <div className="bg-white/60 backdrop-blur-2xl border border-green-200 rounded-2xl shadow-sm p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                    <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Results Saved to Project</h3>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                      Training results and models have been saved to <strong className="text-gray-900">{currentProject.metadata.name}</strong>
                      {projectSavePath && (
                        <>
                          <br />
                          <span className="text-xs font-mono text-gray-500 mt-1 block">{projectSavePath}</span>
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
