'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  StopCircle,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrainingControlsProps {
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
  isTraining: boolean;
  isPaused?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onRestart?: () => void;
  className?: string;
  disabled?: boolean;
}

export function TrainingControls({
  status,
  isTraining,
  isPaused = false,
  onStart,
  onPause,
  onResume,
  onStop,
  onRestart,
  className,
  disabled = false
}: TrainingControlsProps) {
  const isActive = status === 'connected' || status === 'connecting';
  const canControl = isActive && !disabled;

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-gray-900 mb-1">Training Controls</h4>
          <p className="text-xs text-gray-600">
            {status === 'idle' && 'Ready to start training'}
            {status === 'connecting' && 'Connecting to training session...'}
            {status === 'connected' && (isPaused ? 'Training paused' : 'Training in progress')}
            {status === 'disconnected' && 'Training completed'}
            {status === 'error' && 'Training error occurred'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Start Button */}
          {!isTraining && onStart && (
            <Button
              onClick={onStart}
              disabled={disabled}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Training
            </Button>
          )}

          {/* Pause/Resume Button */}
          {isTraining && !isPaused && onPause && (
            <Button
              onClick={onPause}
              disabled={!canControl}
              variant="outline"
              size="sm"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}

          {isTraining && isPaused && onResume && (
            <Button
              onClick={onResume}
              disabled={!canControl}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}

          {/* Stop Button */}
          {isTraining && onStop && (
            <Button
              onClick={onStop}
              disabled={!canControl}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}

          {/* Restart Button */}
          {!isTraining && status === 'disconnected' && onRestart && (
            <Button
              onClick={onRestart}
              disabled={disabled}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
          )}

          {/* Loading Indicator */}
          {status === 'connecting' && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Connecting...</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              status === 'connected' && !isPaused && 'bg-green-500 animate-pulse',
              status === 'connected' && isPaused && 'bg-yellow-500',
              status === 'connecting' && 'bg-blue-500 animate-pulse',
              status === 'disconnected' && 'bg-gray-400',
              status === 'error' && 'bg-red-500'
            )}
          />
          <span className="text-gray-600 capitalize">
            Status: <span className="font-medium">{isPaused ? 'Paused' : status}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
