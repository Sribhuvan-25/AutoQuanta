/**
 * Prediction slice for Redux store
 * Manages prediction state including model selection, input data, and results
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Prediction types
export interface TrainedModel {
  model_name: string;
  model_type: string;
  task_type: 'classification' | 'regression';
  target_column: string;
  best_score: number;
  export_timestamp: string;
  feature_count: number;
  training_data_shape: [number, number];
  has_onnx: boolean;
  has_pickle: boolean;
  model_path: string;
  onnx_path?: string;
  pickle_path?: string;
}

export interface PredictionStats {
  count: number;
  mean: number;
  std: number;
  min: number;
  max: number;
  unique_predictions?: number;
}

export interface PredictionResult {
  success: boolean;
  predictions?: number[];
  prediction_stats?: PredictionStats;
  output_csv?: string;
  input_shape?: [number, number];
  prediction_method?: 'onnx' | 'pickle';
  model_metadata?: {
    model_name: string;
    model_type: string;
    task_type: string;
    target_column: string;
    training_score: number;
  };
  error?: string;
  message?: string;
}

export interface SinglePredictionResult {
  success: boolean;
  prediction?: number;
  prediction_method?: 'onnx' | 'pickle';
  model_metadata?: {
    model_name: string;
    model_type: string;
    task_type: string;
    training_score: number;
  };
  error?: string;
  message?: string;
}

// Prediction state interface
interface PredictionState {
  // Available models
  availableModels: TrainedModel[];
  isLoadingModels: boolean;
  modelsError: string | null;
  
  // Selected model
  selectedModel: TrainedModel | null;
  
  // Input data
  inputData: {
    type: 'csv' | 'manual' | null;
    csvData: string;
    manualValues: number[];
    fileName?: string;
  };
  
  // Prediction process
  isPredicting: boolean;
  predictionProgress: number;
  predictionStage: string;
  
  // Results
  predictionResults: PredictionResult | null;
  singlePredictionResult: SinglePredictionResult | null;
  
  // Error handling
  predictionError: string | null;
  
  // UI state
  showResults: boolean;
  predictionHistory: PredictionResult[];
}

// Initial state
const initialState: PredictionState = {
  availableModels: [],
  isLoadingModels: false,
  modelsError: null,
  selectedModel: null,
  inputData: {
    type: null,
    csvData: '',
    manualValues: [],
  },
  isPredicting: false,
  predictionProgress: 0,
  predictionStage: '',
  predictionResults: null,
  singlePredictionResult: null,
  predictionError: null,
  showResults: false,
  predictionHistory: [],
};

// Async thunks
export const loadAvailableModels = createAsyncThunk(
  'prediction/loadAvailableModels',
  async (_, { rejectWithValue }) => {
    try {
      // Use existing tauriAPI pattern
      const { tauriAPI } = await import('@/lib/tauri');
      
      const result = await tauriAPI.getAvailableModels();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load models');
      }
      
      return result.models;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load available models');
    }
  }
);

export const makePrediction = createAsyncThunk(
  'prediction/makePrediction',
  async (
    params: {
      modelPath: string;
      csvData: string;
      useOnnx?: boolean;
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const { tauriAPI } = await import('@/lib/tauri');
      
      const result = await tauriAPI.makePrediction(
        params.modelPath,
        params.csvData,
        params.useOnnx,
        (progress: any) => {
          dispatch(updatePredictionProgress({
            progress: progress.progress,
            stage: progress.stage,
            message: progress.message,
          }));
        }
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Prediction failed');
      }
      
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Prediction failed');
    }
  }
);

export const makeSinglePrediction = createAsyncThunk(
  'prediction/makeSinglePrediction',
  async (
    params: {
      modelPath: string;
      values: number[];
    },
    { rejectWithValue }
  ) => {
    try {
      const { tauriAPI } = await import('@/lib/tauri');
      
      const result = await tauriAPI.makeSinglePrediction(
        params.modelPath,
        params.values
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Single prediction failed');
      }
      
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Single prediction failed');
    }
  }
);

// Prediction slice
const predictionSlice = createSlice({
  name: 'prediction',
  initialState,
  reducers: {
    // Model selection
    selectModel: (state, action: PayloadAction<TrainedModel>) => {
      state.selectedModel = action.payload;
      state.predictionError = null;
    },
    
    clearSelectedModel: (state) => {
      state.selectedModel = null;
      state.inputData = initialState.inputData;
      state.predictionResults = null;
      state.singlePredictionResult = null;
      state.predictionError = null;
    },
    
    // Input data management
    setInputData: (state, action: PayloadAction<{
      type: 'csv' | 'manual';
      csvData?: string;
      manualValues?: number[];
      fileName?: string;
    }>) => {
      state.inputData = {
        type: action.payload.type,
        csvData: action.payload.csvData || '',
        manualValues: action.payload.manualValues || [],
        fileName: action.payload.fileName,
      };
      state.predictionError = null;
    },
    
    clearInputData: (state) => {
      state.inputData = initialState.inputData;
      state.predictionResults = null;
      state.singlePredictionResult = null;
      state.predictionError = null;
    },
    
    // Progress tracking
    updatePredictionProgress: (state, action: PayloadAction<{
      progress: number;
      stage: string;
      message: string;
    }>) => {
      state.predictionProgress = action.payload.progress;
      state.predictionStage = action.payload.stage;
    },
    
    // Results management
    clearResults: (state) => {
      state.predictionResults = null;
      state.singlePredictionResult = null;
      state.showResults = false;
      state.predictionError = null;
    },
    
    setShowResults: (state, action: PayloadAction<boolean>) => {
      state.showResults = action.payload;
    },
    
    addToHistory: (state, action: PayloadAction<PredictionResult>) => {
      state.predictionHistory.unshift(action.payload);
      // Keep only last 10 predictions
      if (state.predictionHistory.length > 10) {
        state.predictionHistory = state.predictionHistory.slice(0, 10);
      }
    },
    
    clearHistory: (state) => {
      state.predictionHistory = [];
    },
    
    // Error handling
    clearError: (state) => {
      state.predictionError = null;
      state.modelsError = null;
    },
    
    // Reset state
    resetPredictionState: (state) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    // Load available models
    builder
      .addCase(loadAvailableModels.pending, (state) => {
        state.isLoadingModels = true;
        state.modelsError = null;
      })
      .addCase(loadAvailableModels.fulfilled, (state, action) => {
        state.isLoadingModels = false;
        state.availableModels = action.payload;
        state.modelsError = null;
      })
      .addCase(loadAvailableModels.rejected, (state, action) => {
        state.isLoadingModels = false;
        state.modelsError = action.payload as string;
        state.availableModels = [];
      });
    
    // Make prediction
    builder
      .addCase(makePrediction.pending, (state) => {
        state.isPredicting = true;
        state.predictionError = null;
        state.predictionProgress = 0;
        state.predictionStage = 'initializing';
      })
      .addCase(makePrediction.fulfilled, (state, action) => {
        state.isPredicting = false;
        state.predictionResults = action.payload;
        state.showResults = true;
        state.predictionProgress = 100;
        state.predictionStage = 'completed';
        
        // Add to history
        state.predictionHistory.unshift(action.payload);
        if (state.predictionHistory.length > 10) {
          state.predictionHistory = state.predictionHistory.slice(0, 10);
        }
      })
      .addCase(makePrediction.rejected, (state, action) => {
        state.isPredicting = false;
        state.predictionError = action.payload as string;
        state.predictionProgress = 0;
        state.predictionStage = 'error';
      });
    
    // Make single prediction
    builder
      .addCase(makeSinglePrediction.pending, (state) => {
        state.isPredicting = true;
        state.predictionError = null;
      })
      .addCase(makeSinglePrediction.fulfilled, (state, action) => {
        state.isPredicting = false;
        state.singlePredictionResult = action.payload;
        state.showResults = true;
      })
      .addCase(makeSinglePrediction.rejected, (state, action) => {
        state.isPredicting = false;
        state.predictionError = action.payload as string;
      });
  },
});

// Export actions
export const {
  selectModel,
  clearSelectedModel,
  setInputData,
  clearInputData,
  updatePredictionProgress,
  clearResults,
  setShowResults,
  addToHistory,
  clearHistory,
  clearError,
  resetPredictionState,
} = predictionSlice.actions;

// Export reducer
export default predictionSlice.reducer;

// Selectors
export const selectAvailableModels = (state: any) => state.prediction.availableModels;
export const selectIsLoadingModels = (state: any) => state.prediction.isLoadingModels;
export const selectModelsError = (state: any) => state.prediction.modelsError;
export const selectSelectedModel = (state: any) => state.prediction.selectedModel;
export const selectInputData = (state: any) => state.prediction.inputData;
export const selectIsPredicting = (state: any) => state.prediction.isPredicting;
export const selectPredictionProgress = (state: any) => state.prediction.predictionProgress;
export const selectPredictionStage = (state: any) => state.prediction.predictionStage;
export const selectPredictionResults = (state: any) => state.prediction.predictionResults;
export const selectSinglePredictionResult = (state: any) => state.prediction.singlePredictionResult;
export const selectPredictionError = (state: any) => state.prediction.predictionError;
export const selectShowResults = (state: any) => state.prediction.showResults;
export const selectPredictionHistory = (state: any) => state.prediction.predictionHistory;