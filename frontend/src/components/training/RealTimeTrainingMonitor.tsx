'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTrainingSSE } from '@/hooks/useTrainingSSE';
import { TrainingMonitor } from './TrainingMonitor';
import { TrainingLogsViewer } from './TrainingLogsViewer';
import { TrainingControls } from './TrainingControls';
import { AlertCircle, TrendingUp, Terminal } from 'lucide-react';

interface RealTimeTrainingMonitorProps {
  sessionId: string;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
  className?: string;
  showControls?: boolean;
}

export function RealTimeTrainingMonitor({
  sessionId,
  onComplete,
  onError,
  className,
  showControls = false
}: RealTimeTrainingMonitorProps) {
  const [activeTab, setActiveTab] = useState<'monitor' | 'logs'>('monitor');

  const {
    isConnected,
    status,
    progress,
    metrics,
    logs,
    error,
    clearLogs,
    clearMetrics
  } = useTrainingSSE({
    sessionId,
    onComplete: (data) => {
      console.log('Training completed:', data);
      onComplete?.(data);
    },
    onError: (err) => {
      console.error('Training error:', err);
      onError?.(err);
    },
    autoConnect: true
  });

  return (
    <div className={cn('space-y-4', className)}>
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Training Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Training Controls (optional) */}
      {showControls && (
        <TrainingControls
          status={status}
          isTraining={isConnected}
          // Note: Pause/Resume/Stop functionality would require backend support
          // For now, these are disabled
        />
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('monitor')}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'monitor'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              )}
            >
              <TrendingUp className="h-4 w-4" />
              Monitor
              {metrics.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {metrics.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'logs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              )}
            >
              <Terminal className="h-4 w-4" />
              Logs
              {logs.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                  {logs.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'monitor' && (
            <TrainingMonitor
              progress={progress}
              metrics={metrics}
              status={status}
              isConnected={isConnected}
            />
          )}

          {activeTab === 'logs' && (
            <TrainingLogsViewer
              logs={logs}
              onClear={clearLogs}
              maxHeight="500px"
              autoScroll={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
