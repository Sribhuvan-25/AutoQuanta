'use client';

import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin ${className}`} />
  );
}

interface LoadingOverlayProps {
  message?: string;
  transparent?: boolean;
}

export function LoadingOverlay({ message = 'Loading...', transparent = false }: LoadingOverlayProps) {
  return (
    <div className={`
      fixed inset-0 z-50 flex items-center justify-center
      ${transparent ? 'bg-black/20' : 'bg-white/90'}
      backdrop-blur-sm
    `}>
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="xl" className="text-gray-900" />
        <p className="text-lg font-medium text-gray-900">{message}</p>
      </div>
    </div>
  );
}

interface InlineLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function InlineLoading({ message = 'Loading...', size = 'md' }: InlineLoadingProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <LoadingSpinner size={size} className="text-gray-700" />
      <span className="text-gray-600 font-medium">{message}</span>
    </div>
  );
}

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'gray';
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  progress,
  label,
  showPercentage = true,
  color = 'blue',
  size = 'md',
}: ProgressBarProps) {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    gray: 'bg-gray-600',
  };

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm font-semibold text-gray-900">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

interface StepProgressProps {
  steps: string[];
  currentStep: number;
  completedSteps?: number[];
}

export function StepProgress({ steps, currentStep, completedSteps = [] }: StepProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = currentStep === index;
          const isPast = index < currentStep;

          return (
            <React.Fragment key={index}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                    transition-all duration-200
                    ${
                      isCompleted || isPast
                        ? 'bg-green-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                        : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {isCompleted || isPast ? '✓' : index + 1}
                </div>
                <span
                  className={`
                    mt-2 text-xs font-medium text-center max-w-[80px]
                    ${isCurrent ? 'text-blue-900' : 'text-gray-600'}
                  `}
                >
                  {step}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-1 mx-2 rounded transition-all duration-200
                    ${isPast || isCompleted ? 'bg-green-600' : 'bg-gray-200'}
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '100%'),
  };

  return (
    <div
      className={`
        bg-gray-200
        ${variantClasses[variant]}
        ${animationClasses[animation]}
        ${className}
      `}
      style={style}
    />
  );
}

interface LoadingCardProps {
  rows?: number;
}

export function LoadingCard({ rows = 3 }: LoadingCardProps) {
  return (
    <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6 space-y-4">
      <Skeleton height="24px" width="60%" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height="16px" width={`${100 - i * 10}%`} />
      ))}
    </div>
  );
}

interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingButton({
  isLoading,
  children,
  loadingText = 'Loading...',
  disabled,
  onClick,
  className = '',
}: LoadingButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
