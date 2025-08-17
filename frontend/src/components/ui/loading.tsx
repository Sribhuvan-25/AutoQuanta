'use client';

import React from 'react';
import { Loader2, FileText, Brain, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  return (
    <Loader2 className={cn('animate-spin text-blue-600', sizeClasses[size], className)} />
  );
}

interface ProgressBarProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export function ProgressBar({ 
  progress, 
  label, 
  showPercentage = true, 
  variant = 'default',
  className 
}: ProgressBarProps) {
  const variantClasses = {
    default: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-gray-500">{clampedProgress.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full transition-all duration-300', variantClasses[variant])}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

interface LoadingStateProps {
  state: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  progress?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ 
  state, 
  message, 
  progress,
  className,
  size = 'md'
}: LoadingStateProps) {
  const getIcon = () => {
    switch (state) {
      case 'loading':
        return <LoadingSpinner size={size} />;
      case 'success':
        return <CheckCircle className={cn('text-green-600', size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6')} />;
      case 'error':
        return <AlertCircle className={cn('text-red-600', size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6')} />;
      default:
        return <Clock className={cn('text-gray-400', size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6')} />;
    }
  };

  const getTextColor = () => {
    switch (state) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'loading':
        return 'text-blue-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={cn('flex items-center gap-x-3', className)}>
      {getIcon()}
      <div className="flex-1">
        {message && (
          <p className={cn('text-sm font-medium', getTextColor())}>
            {message}
          </p>
        )}
        {progress !== undefined && state === 'loading' && (
          <ProgressBar progress={progress} showPercentage={false} className="mt-2" />
        )}
      </div>
    </div>
  );
}

interface ProcessingStepsProps {
  steps: Array<{
    id: string;
    label: string;
    status: 'pending' | 'loading' | 'completed' | 'error';
    message?: string;
    progress?: number;
  }>;
  className?: string;
}

export function ProcessingSteps({ steps, className }: ProcessingStepsProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-start gap-x-3">
          {/* Step number/icon */}
          <div className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
            step.status === 'completed' ? 'bg-green-100 text-green-600' :
            step.status === 'loading' ? 'bg-blue-100 text-blue-600' :
            step.status === 'error' ? 'bg-red-100 text-red-600' :
            'bg-gray-100 text-gray-400'
          )}>
            {step.status === 'completed' ? (
              <CheckCircle className="h-4 w-4" />
            ) : step.status === 'loading' ? (
              <LoadingSpinner size="sm" />
            ) : step.status === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <span>{index + 1}</span>
            )}
          </div>

          {/* Step content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-x-2">
              <h3 className={cn(
                'text-sm font-medium',
                step.status === 'completed' ? 'text-green-600' :
                step.status === 'loading' ? 'text-blue-600' :
                step.status === 'error' ? 'text-red-600' :
                'text-gray-500'
              )}>
                {step.label}
              </h3>
            </div>
            
            {step.message && (
              <p className="mt-1 text-xs text-gray-500">{step.message}</p>
            )}
            
            {step.progress !== undefined && step.status === 'loading' && (
              <ProgressBar 
                progress={step.progress} 
                showPercentage={false}
                className="mt-2"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({ 
  variant = 'text', 
  width, 
  height,
  className 
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 bg-gray-200 rounded',
    circular: 'bg-gray-200 rounded-full',
    rectangular: 'bg-gray-200 rounded'
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      className={cn('animate-pulse', variantClasses[variant], className)}
      style={style}
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-t-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} variant="text" />
        ))}
      </div>
      
      {/* Rows */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid grid-cols-4 gap-4 p-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface DataProcessingIndicatorProps {
  stage: 'uploading' | 'parsing' | 'validating' | 'profiling' | 'completed' | 'error';
  progress?: number;
  message?: string;
  details?: string;
  className?: string;
}

export function DataProcessingIndicator({ 
  stage, 
  progress = 0,
  message,
  details,
  className 
}: DataProcessingIndicatorProps) {
  const stageConfig = {
    uploading: {
      icon: <FileText className="h-5 w-5" />,
      label: 'Uploading File',
      color: 'text-blue-600'
    },
    parsing: {
      icon: <LoadingSpinner size="sm" />,
      label: 'Parsing CSV',
      color: 'text-blue-600'
    },
    validating: {
      icon: <LoadingSpinner size="sm" />,
      label: 'Validating Data',
      color: 'text-blue-600'
    },
    profiling: {
      icon: <Brain className="h-5 w-5" />,
      label: 'Analyzing Data',
      color: 'text-purple-600'
    },
    completed: {
      icon: <CheckCircle className="h-5 w-5" />,
      label: 'Processing Complete',
      color: 'text-green-600'
    },
    error: {
      icon: <AlertCircle className="h-5 w-5" />,
      label: 'Processing Failed',
      color: 'text-red-600'
    }
  };

  const config = stageConfig[stage];

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-center gap-x-3 mb-4">
        <div className={config.color}>
          {config.icon}
        </div>
        <div>
          <h3 className={cn('text-lg font-semibold', config.color)}>
            {config.label}
          </h3>
          {message && (
            <p className="text-sm text-gray-600">{message}</p>
          )}
        </div>
      </div>

      {progress > 0 && stage !== 'completed' && stage !== 'error' && (
        <ProgressBar progress={progress} showPercentage={true} className="mb-4" />
      )}

      {details && (
        <p className="text-xs text-gray-500">{details}</p>
      )}
    </div>
  );
}

// Loading overlay for full-page loading states
interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  progress?: number;
  className?: string;
}

export function LoadingOverlay({ 
  visible, 
  message = 'Loading...', 
  progress,
  className 
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className={cn(
      'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
      className
    )}>
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{message}</h3>
          {progress !== undefined && (
            <ProgressBar progress={progress} className="mt-4" />
          )}
        </div>
      </div>
    </div>
  );
}