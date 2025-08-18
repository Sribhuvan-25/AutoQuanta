/**
 * Training slice for Redux store
 * Manages ML model training, evaluation, and results
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { TrainingConfig, TrainingResults, ModelPerformance } from '@/lib/types';
import { tauriAPI } from '@/lib/tauri';

// Training state interface
interface TrainingState {
  // Training configuration
  config: TrainingConfig | null;
  
  // Training status
  isTraining: boolean;
  trainingStage: string;
  trainingProgress: number;
  estimatedTimeRemaining: number | null;
  
  // Results
  currentResults: TrainingResults | null;
  trainingHistory: TrainingResults[];
  
  // Model comparison
  modelComparison: ModelPerformance[];
  bestModel: ModelPerformance | null;
  
  // Error handling
  error: string | null;
  warnings: string[];
  
  // Training settings
  enableEarlyStopping: boolean;
  maxTrainingTime: number; // in seconds
  enableHyperparameterTuning: boolean;
}

// Initial state
const initialState: TrainingState = {
  config: null,
  isTraining: false,
  trainingStage: '',
  trainingProgress: 0,
  estimatedTimeRemaining: null,
  currentResults: null,
  trainingHistory: [],
  modelComparison: [],
  bestModel: null,
  error: null,
  warnings: [],
  enableEarlyStopping: true,
  maxTrainingTime: 3600, // 1 hour
  enableHyperparameterTuning: true,
};

// Async thunks for training operations
export const startTraining = createAsyncThunk(
  'training/start',
  async (config: TrainingConfig, { dispatch, rejectWithValue }) => {
    try {
      // Validate configuration
      if (!config.target_column) {
        throw new Error('Target column is required');
      }
      
      if (config.models_to_try.length === 0) {
        throw new Error('At least one model must be selected');
      }

      // Start training
      dispatch(updateTrainingStage({ stage: 'preparing', progress: 5 }));
      const success = await tauriAPI.startTraining(config);
      
      if (!success) {
        throw new Error('Failed to start training');
      }

      // Monitor training progress
      dispatch(updateTrainingStage({ stage: 'training', progress: 10 }));
      
      // In a real implementation, this would poll for progress
      // For now, simulate training progress
      const progressInterval = setInterval(async () => {
        try {
          const status = await tauriAPI.getTrainingStatus();
          
          dispatch(updateTrainingStage({ 
            stage: status.status, 
            progress: status.progress 
          }));
          
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(progressInterval);
            
            if (status.status === 'completed') {
              const results = await tauriAPI.getTrainingResults();
              if (results) {
                return results;
              } else {
                throw new Error('Training completed but no results available');
              }
            } else {
              throw new Error(status.message);
            }
          }
        } catch (error) {
          clearInterval(progressInterval);
          throw error;
        }
      }, 1000);

      // Return promise that resolves when training completes
      return new Promise<TrainingResults>((resolve, reject) => {
        const checkStatus = async () => {
          try {
            const status = await tauriAPI.getTrainingStatus();
            
            if (status.status === 'completed') {
              const results = await tauriAPI.getTrainingResults();
              if (results) {
                resolve(results);
              } else {
                reject(new Error('Training completed but no results available'));
              }
            } else if (status.status === 'failed') {
              reject(new Error(status.message));
            } else {
              setTimeout(checkStatus, 1000);
            }
          } catch (error) {
            reject(error);
          }
        };
        
        checkStatus();
      });
      
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Training failed');
    }
  }
);

export const stopTraining = createAsyncThunk(
  'training/stop',
  async (_, { rejectWithValue }) => {
    try {
      // In a real implementation, this would send a stop signal to the backend
      console.log('Stopping training...');
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to stop training');
    }
  }
);

export const loadTrainingResults = createAsyncThunk(
  'training/loadResults',
  async (resultsPath: string, { rejectWithValue }) => {
    try {
      // In a real implementation, this would load results from a file
      const results = await tauriAPI.getTrainingResults();
      return results;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load training results');
    }
  }
);

// Training slice
const trainingSlice = createSlice({
  name: 'training',
  initialState,
  reducers: {
    // Set training configuration
    setTrainingConfig: (state, action: PayloadAction<TrainingConfig>) => {
      state.config = action.payload;
    },
    
    // Update training stage and progress
    updateTrainingStage: (state, action: PayloadAction<{ stage: string; progress: number; timeRemaining?: number }>) => {
      state.trainingStage = action.payload.stage;
      state.trainingProgress = action.payload.progress;
      if (action.payload.timeRemaining !== undefined) {
        state.estimatedTimeRemaining = action.payload.timeRemaining;
      }
    },
    
    // Clear training results
    clearResults: (state) => {
      state.currentResults = null;
      state.modelComparison = [];
      state.bestModel = null;
      state.error = null;
    },
    
    // Add to training history
    addToHistory: (state, action: PayloadAction<TrainingResults>) => {
      state.trainingHistory.unshift(action.payload);
      // Keep only last 10 training sessions
      state.trainingHistory = state.trainingHistory.slice(0, 10);
    },
    
    // Update model comparison
    updateModelComparison: (state, action: PayloadAction<ModelPerformance[]>) => {
      state.modelComparison = action.payload;
      
      // Find best model
      if (action.payload.length > 0) {
        state.bestModel = action.payload.reduce((best, current) => 
          current.mean_score > best.mean_score ? current : best
        );
      }
    },
    
    // Add warning
    addWarning: (state, action: PayloadAction<string>) => {
      if (!state.warnings.includes(action.payload)) {
        state.warnings.push(action.payload);
      }
    },
    
    // Clear warnings
    clearWarnings: (state) => {
      state.warnings = [];
    },
    
    // Update training settings
    updateTrainingSettings: (state, action: PayloadAction<Partial<Pick<TrainingState, 'enableEarlyStopping' | 'maxTrainingTime' | 'enableHyperparameterTuning'>>>) => {
      Object.assign(state, action.payload);
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Start training
    builder
      .addCase(startTraining.pending, (state, action) => {
        state.isTraining = true;
        state.trainingStage = 'starting';
        state.trainingProgress = 0;
        state.estimatedTimeRemaining = null;
        state.config = action.meta.arg;
        state.error = null;
        state.warnings = [];
      })
      .addCase(startTraining.fulfilled, (state, action) => {
        state.isTraining = false;
        state.trainingStage = 'completed';
        state.trainingProgress = 100;
        state.currentResults = action.payload;
        state.error = null;
        
        // Add to history
        state.trainingHistory.unshift(action.payload);
        state.trainingHistory = state.trainingHistory.slice(0, 10);
        
        // Update model comparison
        if (action.payload.all_models) {
          state.modelComparison = action.payload.all_models;
          if (action.payload.all_models.length > 0) {
            state.bestModel = action.payload.all_models.reduce((best, current) => 
              current.mean_score > best.mean_score ? current : best
            );
          }
        }
      })
      .addCase(startTraining.rejected, (state, action) => {
        state.isTraining = false;
        state.trainingStage = 'failed';
        state.error = action.payload as string;
      });

    // Stop training
    builder
      .addCase(stopTraining.fulfilled, (state) => {
        state.isTraining = false;
        state.trainingStage = 'stopped';
      })
      .addCase(stopTraining.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Load training results
    builder
      .addCase(loadTrainingResults.fulfilled, (state, action) => {
        if (action.payload) {
          state.currentResults = action.payload;
          
          // Update model comparison
          if (action.payload.all_models) {
            state.modelComparison = action.payload.all_models;
            if (action.payload.all_models.length > 0) {
              state.bestModel = action.payload.all_models.reduce((best, current) => 
                current.mean_score > best.mean_score ? current : best
              );
            }
          }
        }
      })
      .addCase(loadTrainingResults.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  setTrainingConfig,
  updateTrainingStage,
  clearResults,
  addToHistory,
  updateModelComparison,
  addWarning,
  clearWarnings,
  updateTrainingSettings,
  clearError,
} = trainingSlice.actions;

// Export reducer
export default trainingSlice.reducer;

// Selectors
export const selectTrainingConfig = (state: { training: TrainingState }) => state.training.config;
export const selectIsTraining = (state: { training: TrainingState }) => state.training.isTraining;
export const selectTrainingStage = (state: { training: TrainingState }) => state.training.trainingStage;
export const selectTrainingProgress = (state: { training: TrainingState }) => state.training.trainingProgress;
export const selectEstimatedTimeRemaining = (state: { training: TrainingState }) => state.training.estimatedTimeRemaining;
export const selectCurrentResults = (state: { training: TrainingState }) => state.training.currentResults;
export const selectTrainingHistory = (state: { training: TrainingState }) => state.training.trainingHistory;
export const selectModelComparison = (state: { training: TrainingState }) => state.training.modelComparison;
export const selectBestModel = (state: { training: TrainingState }) => state.training.bestModel;
export const selectTrainingError = (state: { training: TrainingState }) => state.training.error;
export const selectTrainingWarnings = (state: { training: TrainingState }) => state.training.warnings;