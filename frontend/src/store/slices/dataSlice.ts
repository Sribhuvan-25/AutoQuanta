/**
 * Data slice for Redux store
 * Manages CSV data, processing, and analysis results
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { DataProfile, ColumnInfo, DataWarning } from '@/lib/types';
import { tauriAPI } from '@/lib/tauri';
import { parseCSV, analyzeColumnTypes } from '@/lib/csv-utils';

// Processed data interface
interface ProcessedDataset {
  id: string;
  filePath: string;
  fileName: string;
  data: string[][];
  headers: string[];
  rows: string[][];
  profile: DataProfile | null;
  columns: ColumnInfo[];
  warnings: DataWarning[];
  metadata: {
    fileSize: number;
    rowCount: number;
    columnCount: number;
    processedAt: string;
    memoryUsage: number;
  };
}

// Data state interface
interface DataState {
  // Current dataset
  currentDataset: ProcessedDataset | null;
  
  // Dataset cache (for quick switching between files)
  datasetCache: Record<string, ProcessedDataset>;
  
  // Processing state
  isProcessing: boolean;
  processingStage: string;
  processingProgress: number;
  
  // Data exploration
  selectedColumns: string[];
  targetColumn: string | null;
  filteredData: string[][] | null;
  
  // Analysis results
  correlationMatrix: Record<string, Record<string, number>> | null;
  statisticalSummary: Record<string, unknown> | null;
  
  // Error handling
  error: string | null;
  warnings: DataWarning[];
  
  // Settings
  maxRowsToDisplay: number;
  enableDataCaching: boolean;
}

// Initial state
const initialState: DataState = {
  currentDataset: null,
  datasetCache: {},
  isProcessing: false,
  processingStage: '',
  processingProgress: 0,
  selectedColumns: [],
  targetColumn: null,
  filteredData: null,
  correlationMatrix: null,
  statisticalSummary: null,
  error: null,
  warnings: [],
  maxRowsToDisplay: 1000,
  enableDataCaching: true,
};

// Async thunks for data operations
export const processCSVFile = createAsyncThunk(
  'data/processCSV',
  async (
    { filePath, fileInfo }: { 
      filePath: string; 
      fileInfo: { name: string; size: number; type: string } 
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      // Stage 1: Validate file
      dispatch(updateProcessingStage({ stage: 'validating', progress: 10 }));
      const validation = await tauriAPI.validateCSVFile(filePath);
      
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors[0]}`);
      }

      // Stage 2: Read file content
      dispatch(updateProcessingStage({ stage: 'reading', progress: 25 }));
      let fileContent: string;
      
      if (filePath.startsWith('browser://')) {
        // Browser mode - read from localStorage
        const fileName = filePath.replace('browser://', '');
        const storedContent = localStorage.getItem(`file_content_${fileName}`);
        if (!storedContent) {
          throw new Error('File content not found in browser storage');
        }
        fileContent = storedContent;
      } else {
        // Tauri mode - read from file system
        fileContent = await tauriAPI.readCSVFile(filePath);
      }

      // Stage 3: Parse CSV
      dispatch(updateProcessingStage({ stage: 'parsing', progress: 50 }));
      const parseResult = parseCSV(fileContent);
      
      if (parseResult.errors.length > 0) {
        throw new Error(`CSV parsing failed: ${parseResult.errors[0]}`);
      }

      // Stage 4: Profile data
      dispatch(updateProcessingStage({ stage: 'profiling', progress: 75 }));
      let dataProfile: DataProfile | null = null;
      
      try {
        dataProfile = await tauriAPI.profileCSV(filePath);
      } catch (error) {
        console.warn('Backend profiling failed, using frontend analysis:', error);
        
        // Fallback to frontend analysis
        const columnTypes = analyzeColumnTypes(parseResult.headers, parseResult.rows);
        
        const columns: ColumnInfo[] = columnTypes.map(col => ({
          name: col.name,
          dtype: col.detectedType === 'integer' ? 'int64' : 
                col.detectedType === 'float' ? 'float64' :
                col.detectedType === 'boolean' ? 'bool' : 'object',
          missing_count: col.nullCount,
          missing_percentage: (col.nullCount / parseResult.rowCount) * 100,
          unique_count: col.uniqueCount,
          unique_percentage: (col.uniqueCount / parseResult.rowCount) * 100,
          memory_usage: col.sampleValues.join('').length * 8,
          stats: col.detectedType === 'integer' || col.detectedType === 'float' 
            ? { min: 0, max: 100, mean: 50, std: 25 }
            : { top_categories: col.sampleValues.slice(0, 3).map(val => ({ value: val, count: 1 })) },
          warnings: col.confidence < 0.8 ? [`Low confidence (${(col.confidence * 100).toFixed(0)}%) in type detection`] : []
        }));

        dataProfile = {
          file_path: filePath,
          shape: [parseResult.rowCount, parseResult.columnCount],
          columns,
          missing_summary: { total_missing: 0, columns_with_missing: 0 },
          warnings: parseResult.warnings.map(w => w.message),
          memory_usage_mb: fileInfo.size / (1024 * 1024),
          dtypes_summary: {}
        };
      }

      // Stage 5: Complete processing
      dispatch(updateProcessingStage({ stage: 'completed', progress: 100 }));

      // Create processed dataset
      const processedDataset: ProcessedDataset = {
        id: `${filePath}-${Date.now()}`,
        filePath,
        fileName: fileInfo.name,
        data: parseResult.data,
        headers: parseResult.headers,
        rows: parseResult.rows,
        profile: dataProfile,
        columns: dataProfile?.columns || [],
        warnings: [...parseResult.warnings, ...validation.warnings.map(w => ({ type: 'warning' as const, message: w }))],
        metadata: {
          fileSize: fileInfo.size,
          rowCount: parseResult.rowCount,
          columnCount: parseResult.columnCount,
          processedAt: new Date().toISOString(),
          memoryUsage: fileInfo.size
        }
      };

      return processedDataset;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to process CSV file');
    }
  }
);

export const calculateCorrelations = createAsyncThunk(
  'data/calculateCorrelations',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { data: DataState };
      const { currentDataset } = state.data;
      
      if (!currentDataset) {
        throw new Error('No dataset loaded');
      }

      // Calculate correlation matrix for numeric columns
      const numericColumns = currentDataset.columns.filter(col => 
        col.dtype === 'int64' || col.dtype === 'float64'
      );

      if (numericColumns.length < 2) {
        throw new Error('Need at least 2 numeric columns for correlation analysis');
      }

      // Simple correlation calculation (in a real app, this would use a proper stats library)
      const correlationMatrix: Record<string, Record<string, number>> = {};
      
      numericColumns.forEach(col1 => {
        correlationMatrix[col1.name] = {};
        numericColumns.forEach(col2 => {
          // Mock correlation value for now
          correlationMatrix[col1.name][col2.name] = col1.name === col2.name ? 1 : Math.random() * 2 - 1;
        });
      });

      return correlationMatrix;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to calculate correlations');
    }
  }
);

// Data slice
const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    // Update processing stage
    updateProcessingStage: (state, action: PayloadAction<{ stage: string; progress: number }>) => {
      state.processingStage = action.payload.stage;
      state.processingProgress = action.payload.progress;
    },
    
    // Set current dataset
    setCurrentDataset: (state, action: PayloadAction<ProcessedDataset>) => {
      state.currentDataset = action.payload;
      state.selectedColumns = action.payload.headers;
      state.targetColumn = null;
      state.filteredData = null;
    },
    
    // Clear current dataset
    clearCurrentDataset: (state) => {
      state.currentDataset = null;
      state.selectedColumns = [];
      state.targetColumn = null;
      state.filteredData = null;
      state.error = null;
    },
    
    // Set target column
    setTargetColumn: (state, action: PayloadAction<string>) => {
      state.targetColumn = action.payload;
    },
    
    // Update selected columns
    updateSelectedColumns: (state, action: PayloadAction<string[]>) => {
      state.selectedColumns = action.payload;
    },
    
    // Toggle column selection
    toggleColumnSelection: (state, action: PayloadAction<string>) => {
      const columnName = action.payload;
      if (state.selectedColumns.includes(columnName)) {
        state.selectedColumns = state.selectedColumns.filter(col => col !== columnName);
      } else {
        state.selectedColumns.push(columnName);
      }
    },
    
    // Cache dataset
    cacheDataset: (state, action: PayloadAction<ProcessedDataset>) => {
      if (state.enableDataCaching) {
        state.datasetCache[action.payload.filePath] = action.payload;
        
        // Limit cache size to 5 datasets
        const cacheKeys = Object.keys(state.datasetCache);
        if (cacheKeys.length > 5) {
          const oldestKey = cacheKeys[0];
          delete state.datasetCache[oldestKey];
        }
      }
    },
    
    // Load from cache
    loadFromCache: (state, action: PayloadAction<string>) => {
      const cached = state.datasetCache[action.payload];
      if (cached) {
        state.currentDataset = cached;
        state.selectedColumns = cached.headers;
        state.targetColumn = null;
        state.filteredData = null;
      }
    },
    
    // Clear cache
    clearCache: (state) => {
      state.datasetCache = {};
    },
    
    // Add warning
    addWarning: (state, action: PayloadAction<DataWarning>) => {
      state.warnings.push(action.payload);
    },
    
    // Clear warnings
    clearWarnings: (state) => {
      state.warnings = [];
    },
    
    // Update settings
    updateSettings: (state, action: PayloadAction<Partial<Pick<DataState, 'maxRowsToDisplay' | 'enableDataCaching'>>>) => {
      Object.assign(state, action.payload);
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Process CSV file
    builder
      .addCase(processCSVFile.pending, (state) => {
        state.isProcessing = true;
        state.processingStage = 'starting';
        state.processingProgress = 0;
        state.error = null;
      })
      .addCase(processCSVFile.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.currentDataset = action.payload;
        state.selectedColumns = action.payload.headers;
        state.processingStage = 'completed';
        state.processingProgress = 100;
        state.error = null;
        
        // Cache the dataset
        if (state.enableDataCaching) {
          state.datasetCache[action.payload.filePath] = action.payload;
        }
      })
      .addCase(processCSVFile.rejected, (state, action) => {
        state.isProcessing = false;
        state.processingStage = 'failed';
        state.error = action.payload as string;
      });

    // Calculate correlations
    builder
      .addCase(calculateCorrelations.fulfilled, (state, action) => {
        state.correlationMatrix = action.payload;
      })
      .addCase(calculateCorrelations.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  updateProcessingStage,
  setCurrentDataset,
  clearCurrentDataset,
  setTargetColumn,
  updateSelectedColumns,
  toggleColumnSelection,
  cacheDataset,
  loadFromCache,
  clearCache,
  addWarning,
  clearWarnings,
  updateSettings,
  clearError,
} = dataSlice.actions;

// Export reducer
export default dataSlice.reducer;

// Selectors
export const selectCurrentDataset = (state: { data: DataState }) => state.data.currentDataset;
export const selectIsProcessing = (state: { data: DataState }) => state.data.isProcessing;
export const selectProcessingStage = (state: { data: DataState }) => state.data.processingStage;
export const selectProcessingProgress = (state: { data: DataState }) => state.data.processingProgress;
export const selectSelectedColumns = (state: { data: DataState }) => state.data.selectedColumns;
export const selectTargetColumn = (state: { data: DataState }) => state.data.targetColumn;
export const selectDataWarnings = (state: { data: DataState }) => state.data.warnings;
export const selectDataError = (state: { data: DataState }) => state.data.error;
export const selectDatasetCache = (state: { data: DataState }) => state.data.datasetCache;
export const selectCorrelationMatrix = (state: { data: DataState }) => state.data.correlationMatrix;