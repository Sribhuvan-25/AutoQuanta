'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  BarChart3,
  Zap
} from 'lucide-react';
import { TrainingProgress, TrainingMetric } from '@/hooks/useTrainingSSE';

interface TrainingMonitorProps {
  progress: TrainingProgress;
  metrics: TrainingMetric[];
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
  isConnected: boolean;
  className?: string;
}

export function TrainingMonitor({
  progress,
  metrics,
  status,
  isConnected,
  className
}: TrainingMonitorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'connecting':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'connected':
        return <Activity className="h-5 w-5 text-green-600 animate-pulse" />;
      case 'disconnected':
        return <CheckCircle className="h-5 w-5 text-gray-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connecting':
        return 'bg-blue-50 border-blue-200';
      case 'connected':
        return 'bg-green-50 border-green-200';
      case 'disconnected':
        return 'bg-gray-50 border-gray-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStageIcon = (stage?: string) => {
    switch (stage) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'preparing':
        return <Zap className="h-4 w-4" />;
      case 'training':
        return <Activity className="h-4 w-4 animate-pulse" />;
      case 'evaluating':
        return <BarChart3 className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const latestMetrics = metrics.slice(-5).reverse();

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
      {/* Header */}
      <div className={cn('p-4 border-b border-gray-200', getStatusColor())}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold text-gray-900">Training Monitor</h3>
              <p className="text-xs text-gray-600 capitalize">{status}</p>
            </div>
          </div>
          {isConnected && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <div className="h-2 w-2 bg-green-600 rounded-full animate-pulse" />
              Live
            </div>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {progress.message && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            {getStageIcon(progress.stage)}
            <span className="text-sm font-medium text-gray-900 capitalize">
              {progress.stage || 'Processing'}
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-700">{progress.message}</p>

            {typeof progress.progress === 'number' && (
              <div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span className="font-medium">{Math.round(progress.progress)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-500 rounded-full',
                      progress.stage === 'completed'
                        ? 'bg-green-500'
                        : progress.stage === 'error'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    )}
                    style={{ width: `${Math.min(progress.progress, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metrics Section */}
      {latestMetrics.length > 0 && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <h4 className="text-sm font-medium text-gray-900">Recent Metrics</h4>
          </div>

          <div className="space-y-2">
            {latestMetrics.map((metric, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-700">
                    {metric.metric.replace(/_/g, ' ').toUpperCase()}
                  </p>
                  {metric.model_name && (
                    <p className="text-xs text-gray-500">{metric.model_name}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {typeof metric.value === 'number'
                      ? metric.value.toFixed(4)
                      : metric.value}
                  </p>
                  {metric.std_score !== undefined && (
                    <p className="text-xs text-gray-500">
                      ± {metric.std_score.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!progress.message && latestMetrics.length === 0 && (
        <div className="p-8 text-center">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            {status === 'idle' ? 'Waiting to start training...' : 'No data available'}
          </p>
        </div>
      )}
    </div>
  );
}
