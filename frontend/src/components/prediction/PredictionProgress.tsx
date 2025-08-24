'use client';

import React from 'react';
import { Loader2, StopCircle, Brain, Database, BarChart3, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PredictionProgressProps {
  isPredicting: boolean;
  progress: number;
  stage: string;
  onStop?: () => void;
}

export function PredictionProgress({
  isPredicting,
  progress,
  stage,
  onStop,
}: PredictionProgressProps) {
  
  const getStageInfo = (currentStage: string) => {
    const stages = {
      'loading': {
        icon: Database,
        title: 'Loading Data',
        description: 'Reading and parsing input data...',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      },
      'preprocessing': {
        icon: BarChart3,
        title: 'Preprocessing',
        description: 'Preparing data for prediction...',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
      },
      'predicting': {
        icon: Brain,
        title: 'Making Predictions',
        description: 'Running model inference...',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      },
      'processing': {
        icon: BarChart3,
        title: 'Processing Results',
        description: 'Analyzing prediction results...',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      },
      'completed': {
        icon: CheckCircle,
        title: 'Completed',
        description: 'Prediction completed successfully!',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      },
      'error': {
        icon: StopCircle,
        title: 'Error',
        description: 'An error occurred during prediction',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      },
    };
    
    return stages[currentStage as keyof typeof stages] || stages.loading;
  };

  if (!isPredicting && stage !== 'completed') {
    return null;
  }

  const stageInfo = getStageInfo(stage);
  const StageIcon = stageInfo.icon;
  
  const progressPercentage = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${stageInfo.bgColor}`}>
            <StageIcon className={`h-5 w-5 ${stageInfo.color}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Prediction Progress</h3>
            <p className="text-sm text-gray-600">{stageInfo.description}</p>
          </div>
        </div>
        
        {isPredicting && onStop && (
          <Button 
            variant="outline" 
            onClick={onStop}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <StopCircle className="h-4 w-4 mr-2" />
            Stop
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className={`font-medium ${stageInfo.color}`}>
            {stageInfo.title}
          </span>
          <span className="text-gray-600">
            {progressPercentage.toFixed(0)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-out ${
              stage === 'completed' 
                ? 'bg-green-500' 
                : stage === 'error' 
                  ? 'bg-red-500'
                  : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-gray-500">
          {[
            { key: 'loading', label: 'Load Data' },
            { key: 'preprocessing', label: 'Preprocess' },
            { key: 'predicting', label: 'Predict' },
            { key: 'processing', label: 'Process' },
            { key: 'completed', label: 'Complete' }
          ].map((item, index) => {
            const isActive = stage === item.key;
            const isCompleted = ['loading', 'preprocessing', 'predicting', 'processing'].indexOf(stage) > index;
            
            return (
              <div
                key={item.key}
                className={`flex flex-col items-center ${
                  isActive 
                    ? stageInfo.color
                    : isCompleted 
                      ? 'text-green-600' 
                      : 'text-gray-400'
                }`}
              >
                <div className={`w-3 h-3 rounded-full mb-1 ${
                  isActive 
                    ? stageInfo.color.replace('text-', 'bg-')
                    : isCompleted 
                      ? 'bg-green-600' 
                      : 'bg-gray-300'
                }`} />
                <span className="whitespace-nowrap">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading Animation */}
      {isPredicting && (
        <div className="flex items-center justify-center mt-4 pt-4 border-t border-gray-100">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-gray-600">Processing...</span>
        </div>
      )}
    </div>
  );
}