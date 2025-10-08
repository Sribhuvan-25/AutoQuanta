'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TrainingConfig } from '@/components/training/TrainingConfig';
import { TrainingProgress } from '@/components/training/TrainingProgress';
import { TrainingResults } from '@/components/training/TrainingResults';
import { ModelDetailsModal } from '@/components/training/ModelDetailsModal';
import { ExportHub } from '@/components/reports/ExportHub';
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
import type { TrainingConfig as TrainingConfigType, ModelTrainingResult } from '@/lib/types';
import { AlertTriangle, RefreshCw, Folder, Plus, Play, Settings, BarChart3, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TabType = 'train' | 'configure' | 'results' | 'export';

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

  const [activeTab, setActiveTab] = useState<TabType>('train');
  const [selectedModel, setSelectedModel] = useState<ModelTrainingResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Auto-switch to results tab when training completes
  useEffect(() => {
    if (currentResults && !isTraining && activeTab === 'train') {
      setActiveTab('results');
    }
  }, [currentResults, isTraining, activeTab]);

  const handleStartTraining = async (config: TrainingConfigType) => {
    try {
      // Prepare dataset data if available
      const datasetData = currentDataset ? {
        data: currentDataset.data,
        headers: currentDataset.headers,
        filePath: currentDataset.filePath
      } : undefined;

      // Include project information in training request if available (optional)
      await dispatch(startTraining({
        config,
        datasetData,
        projectConfig: currentProject || undefined
      }));

      // Training started successfully - no need to switch tabs, progress shows in Train tab
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

  const tabs = [
    {
      id: 'train' as TabType,
      name: 'Train',
      icon: Play,
      badge: isTraining ? 'In Progress' : undefined
    },
    {
      id: 'configure' as TabType,
      name: 'Configure',
      icon: Settings
    },
    {
      id: 'results' as TabType,
      name: 'Results',
      icon: BarChart3,
      badge: modelComparison.length > 0 ? `${modelComparison.length} models` : undefined,
      disabled: !currentResults
    },
    {
      id: 'export' as TabType,
      name: 'Export',
      icon: FileDown,
      disabled: !currentResults
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Model Training</h1>
          <p className="text-lg text-gray-600 mt-3 max-w-3xl">
            Train machine learning models with automatic hyperparameter optimization
          </p>
        </div>

        {/* Project Status Banner */}
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

        {/* Tab Navigation */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm">
          <div className="border-b border-gray-200">
            <div className="flex space-x-1 p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => !tab.disabled && setActiveTab(tab.id)}
                    disabled={tab.disabled}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all',
                      activeTab === tab.id
                        ? 'bg-gray-900 text-white shadow-sm'
                        : tab.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.name}
                    {tab.badge && (
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        activeTab === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 text-gray-700'
                      )}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {/* Train Tab */}
            {activeTab === 'train' && (
              <div className="space-y-6">
                {/* Error Display */}
                {trainingError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-gray-900">Training Error</h3>
                          <p className="text-sm text-gray-600 mt-1">{trainingError}</p>
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

                {/* Quick Start Section */}
                <div className="text-center py-8">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">Ready to Train</h3>
                  <p className="text-gray-600 mb-6">
                    Start training with default settings or customize in the Configure tab
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button
                      onClick={() => {
                        // Use default config
                        handleStartTraining({
                          target_column: currentDataset?.headers?.[currentDataset.headers.length - 1] || '',
                          task_type: 'classification',
                          test_size: 0.2,
                          cv_folds: 5,
                          random_seed: 42,
                          models_to_try: ['random_forest', 'gradient_boosting']
                        });
                      }}
                      disabled={isTraining || !currentDataset}
                      className="px-8 py-6 text-lg"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      {isTraining ? 'Training...' : 'Quick Start Training'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('configure')}
                      disabled={isTraining}
                      className="px-8 py-6 text-lg"
                    >
                      <Settings className="h-5 w-5 mr-2" />
                      Configure Settings
                    </Button>
                  </div>
                </div>

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

                {/* Project Recommendation */}
                {!isProjectLoaded && !isTraining && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Folder className="h-5 w-5 text-gray-900 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-gray-900">Create a Project</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Save your training results and models for future use
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dispatch(showCreateWizard())}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Project
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Configure Tab */}
            {activeTab === 'configure' && (
              <TrainingConfig
                onStartTraining={(config) => {
                  handleStartTraining(config);
                  setActiveTab('train'); // Switch back to train tab to see progress
                }}
                isTraining={isTraining}
              />
            )}

            {/* Results Tab */}
            {activeTab === 'results' && currentResults && (
              <div className="space-y-6">
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
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h3 className="font-semibold text-gray-900">Results Saved to Project</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Training results saved to <strong>{currentProject.metadata.name}</strong>
                          {projectSavePath && (
                            <span className="block text-xs font-mono text-gray-500 mt-1">{projectSavePath}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Export Tab */}
            {activeTab === 'export' && currentResults && (
              <ExportHub
                modelData={bestModel}
                trainingResults={currentResults}
              />
            )}
          </div>
        </div>

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
