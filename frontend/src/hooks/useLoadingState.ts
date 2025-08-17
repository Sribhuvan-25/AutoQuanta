'use client';

import { useState, useCallback, useRef } from 'react';

export interface LoadingState {
  isLoading: boolean;
  progress: number;
  message: string;
  stage: string;
  error: string | null;
  startTime: number | null;
  estimatedTimeRemaining: number | null;
}

export interface LoadingStage {
  id: string;
  label: string;
  estimatedDuration?: number; // in milliseconds
}

const DEFAULT_LOADING_STATE: LoadingState = {
  isLoading: false,
  progress: 0,
  message: '',
  stage: '',
  error: null,
  startTime: null,
  estimatedTimeRemaining: null
};

export function useLoadingState(stages: LoadingStage[] = []) {
  const [loadingState, setLoadingState] = useState<LoadingState>(DEFAULT_LOADING_STATE);
  const currentStageIndex = useRef(0);
  const stageStartTime = useRef<number | null>(null);

  // Start loading process
  const startLoading = useCallback((initialMessage: string = 'Loading...') => {
    setLoadingState({
      ...DEFAULT_LOADING_STATE,
      isLoading: true,
      message: initialMessage,
      startTime: Date.now(),
      stage: stages[0]?.id || 'loading'
    });
    currentStageIndex.current = 0;
    stageStartTime.current = Date.now();
  }, [stages]);

  // Update progress within current stage
  const updateProgress = useCallback((progress: number, message?: string) => {
    setLoadingState(prev => {
      const now = Date.now();
      let estimatedTimeRemaining = null;

      // Calculate estimated time remaining based on current progress
      if (prev.startTime && progress > 0) {
        const elapsed = now - prev.startTime;
        const estimatedTotal = elapsed / (progress / 100);
        estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
      }

      return {
        ...prev,
        progress: Math.max(0, Math.min(100, progress)),
        message: message || prev.message,
        estimatedTimeRemaining
      };
    });
  }, []);

  // Move to next stage
  const nextStage = useCallback((message?: string) => {
    if (currentStageIndex.current < stages.length - 1) {
      currentStageIndex.current += 1;
      const nextStage = stages[currentStageIndex.current];
      stageStartTime.current = Date.now();
      
      setLoadingState(prev => ({
        ...prev,
        stage: nextStage.id,
        message: message || nextStage.label,
        progress: 0
      }));
    }
  }, [stages]);

  // Complete loading successfully
  const completeLoading = useCallback((finalMessage: string = 'Completed successfully') => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      progress: 100,
      message: finalMessage,
      error: null
    }));
  }, []);

  // Fail loading with error
  const failLoading = useCallback((error: string) => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      error,
      message: 'Operation failed'
    }));
  }, []);

  // Reset to initial state
  const resetLoading = useCallback(() => {
    setLoadingState(DEFAULT_LOADING_STATE);
    currentStageIndex.current = 0;
    stageStartTime.current = null;
  }, []);

  // Get current stage info
  const getCurrentStage = useCallback(() => {
    return stages[currentStageIndex.current];
  }, [stages]);

  // Get overall progress across all stages
  const getOverallProgress = useCallback(() => {
    if (stages.length === 0) return loadingState.progress;
    
    const stageProgress = (currentStageIndex.current / stages.length) * 100;
    const currentStageProgress = (loadingState.progress / 100) * (100 / stages.length);
    
    return Math.min(100, stageProgress + currentStageProgress);
  }, [stages, loadingState.progress]);

  return {
    loadingState,
    startLoading,
    updateProgress,
    nextStage,
    completeLoading,
    failLoading,
    resetLoading,
    getCurrentStage,
    getOverallProgress,
    // Computed values
    isLoading: loadingState.isLoading,
    hasError: loadingState.error !== null,
    currentStageIndex: currentStageIndex.current,
    totalStages: stages.length
  };
}

// Hook for file processing operations
export function useFileProcessingState() {
  const stages: LoadingStage[] = [
    { id: 'uploading', label: 'Uploading file...', estimatedDuration: 2000 },
    { id: 'parsing', label: 'Parsing CSV data...', estimatedDuration: 1000 },
    { id: 'validating', label: 'Validating data quality...', estimatedDuration: 1500 },
    { id: 'profiling', label: 'Analyzing data characteristics...', estimatedDuration: 3000 }
  ];

  return useLoadingState(stages);
}

// Hook for model training operations
export function useModelTrainingState() {
  const stages: LoadingStage[] = [
    { id: 'preparing', label: 'Preparing training data...', estimatedDuration: 2000 },
    { id: 'splitting', label: 'Splitting into train/test sets...', estimatedDuration: 1000 },
    { id: 'training', label: 'Training models...', estimatedDuration: 30000 },
    { id: 'evaluating', label: 'Evaluating performance...', estimatedDuration: 5000 },
    { id: 'finalizing', label: 'Finalizing results...', estimatedDuration: 1000 }
  ];

  return useLoadingState(stages);
}

// Hook for project operations
export function useProjectState() {
  const stages: LoadingStage[] = [
    { id: 'creating', label: 'Creating project structure...', estimatedDuration: 1000 },
    { id: 'saving', label: 'Saving project metadata...', estimatedDuration: 500 },
    { id: 'initializing', label: 'Initializing workspace...', estimatedDuration: 1500 }
  ];

  return useLoadingState(stages);
}

// Utility hook for async operations with loading state
export function useAsyncOperation<T = unknown>(operation: () => Promise<T>) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [operation]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    execute,
    reset,
    isLoading,
    data,
    error,
    hasError: error !== null,
    hasData: data !== null
  };
}

// Format time remaining for display
export function formatTimeRemaining(milliseconds: number | null): string {
  if (!milliseconds || milliseconds <= 0) return '';
  
  const seconds = Math.ceil(milliseconds / 1000);
  
  if (seconds < 60) {
    return `${seconds}s remaining`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m remaining`;
  } else {
    const hours = Math.ceil(seconds / 3600);
    return `${hours}h remaining`;
  }
}