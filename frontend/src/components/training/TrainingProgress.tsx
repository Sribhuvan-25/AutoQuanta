'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Brain, 
  Clock, 
  Play, 
  Square,
  CheckCircle,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrainingProgressProps {
  isTraining: boolean;
  stage: string;
  progress: number;
  estimatedTimeRemaining: number | null;
  onStopTraining: () => void;
  className?: string;
}

const TRAINING_STAGES = {
  starting: { label: 'Initializing', color: 'text-blue-600', icon: Play },
  preparing: { label: 'Preparing Data', color: 'text-blue-600', icon: Activity },
  training: { label: 'Training Models', color: 'text-green-600', icon: Brain },
  evaluating: { label: 'Evaluating Performance', color: 'text-purple-600', icon: CheckCircle },
  completed: { label: 'Training Complete', color: 'text-green-600', icon: CheckCircle },
  failed: { label: 'Training Failed', color: 'text-red-600', icon: AlertTriangle },
  stopped: { label: 'Training Stopped', color: 'text-gray-600', icon: Square }
};

export function TrainingProgress({
  isTraining,
  stage,
  progress,
  estimatedTimeRemaining,
  onStopTraining,
  className
}: TrainingProgressProps) {
  const stageInfo = TRAINING_STAGES[stage as keyof typeof TRAINING_STAGES] || {
    label: stage || 'Unknown',
    color: 'text-gray-600',
    icon: Activity
  };

  const StageIcon = stageInfo.icon;

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  if (!isTraining && !stage) {
    return null;
  }

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-full bg-gray-100', isTraining && 'animate-pulse')}>
            <StageIcon className={cn('h-5 w-5', stageInfo.color)} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Training Progress</h3>
            <p className={cn('text-sm', stageInfo.color)}>
              {stageInfo.label}
            </p>
          </div>
        </div>
        
        {isTraining && stage !== 'completed' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onStopTraining}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop Training
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={cn(
              'h-3 rounded-full transition-all duration-300',
              stage === 'failed' ? 'bg-red-500' : 
              stage === 'completed' ? 'bg-green-500' :
              'bg-blue-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Time Information */}
      {(estimatedTimeRemaining !== null || isTraining) && (
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>~{formatTimeRemaining(estimatedTimeRemaining)} remaining</span>
            </div>
          )}
          {isTraining && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Training in progress</span>
            </div>
          )}
        </div>
      )}

      {/* Training Steps */}
      <div className="mt-6 space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Training Steps</h4>
        <div className="space-y-2">
          {Object.entries(TRAINING_STAGES).slice(0, -3).map(([key, info], index) => {
            const isActive = stage === key;
            const isComplete = 
              stage === 'completed' ||
              (Object.keys(TRAINING_STAGES).indexOf(stage) > Object.keys(TRAINING_STAGES).indexOf(key) && 
               stage !== 'failed' && stage !== 'stopped');
            
            return (
              <div
                key={key}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg transition-colors',
                  isActive ? 'bg-blue-50 border border-blue-200' : 
                  isComplete ? 'bg-green-50' : 'bg-gray-50'
                )}
              >
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  isComplete ? 'bg-green-500 text-white' :
                  isActive ? 'bg-blue-500 text-white' :
                  'bg-gray-300 text-gray-600'
                )}>
                  {isComplete ? '✓' : index + 1}
                </div>
                <span className={cn(
                  'text-sm',
                  isActive ? 'text-blue-700 font-medium' :
                  isComplete ? 'text-green-700' :
                  'text-gray-600'
                )}>
                  {info.label}
                </span>
                {isActive && isTraining && (
                  <div className="ml-auto">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}