/**
 * Data slice for Redux store
 * Manages CSV data, processing, and analysis results
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { DataProfile, DataWarning } from '@/lib/types';
import { tauriAPI } from '@/lib/tauri';
import { parseCSV } from '@/lib/csv-utils';
import { generateAdvancedProfile, type DataQualityReport, type StatisticalSummary, type AdvancedColumnProfile } from '@/lib/data-profiler';
import { handleQuotaExceededError, isStorageQuotaExceeded } from '@/lib/storage-utils';

interface ProcessedDataset {
  id: string;
  filePath: string;
  fileName: string;
  data: string[][];
  headers: string[];
  rows: string[][];
  profile: DataProfile | null;
  columns: AdvancedColumnProfile[];
  warnings: DataWarning[];
  metadata: {
    fileSize: number;
    rowCount: number;
    columnCount: number;
    processedAt: string;
    memoryUsage: number;
  };
  statistical_summary: StatisticalSummary | null;
  quality_report: DataQualityReport | null;
}

interface DataState {
  currentDataset: ProcessedDataset | null;
  datasetCache: Record<string, ProcessedDataset>;
  isProcessing: boolean;
  processingStage: string;
  processingProgress: number;
  selectedColumns: string[];
  targetColumn: string | null;
  filteredData: string[][] | null;
  correlationMatrix: Record<string, Record<string, number | null>> | null;
  statisticalSummary: Record<string, unknown> | null;
  error: string | null;
  warnings: DataWarning[];
  maxRowsToDisplay: number;
  enableDataCaching: boolean;
}
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

// New FastAPI-based profiling thunk
export const profileCSVWithAPI = createAsyncThunk(
  'data/profileCSVAPI',
  async (
    { file }: { file: File },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(updateProcessingStage({ stage: 'uploading', progress: 10 }));
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('csv_file', file);
      
      dispatch(updateProcessingStage({ stage: 'profiling', progress: 50 }));
      
      // Call FastAPI profile endpoint
      const response = await fetch('http://localhost:8000/profile_simple', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Profile request failed: ${response.status}`);
      }
      
      const profileData = await response.json();
      
      if (!profileData.success) {
        throw new Error(profileData.error || 'Profiling failed');
      }
      
      dispatch(updateProcessingStage({ stage: 'completed', progress: 100 }));
      
      // Transform API response to match our interface
      const processedDataset: ProcessedDataset = {
        id: `file_${Date.now()}`,
        filePath: file.name,
        fileName: file.name,
        data: profileData.data || [], // Use data from API
        headers: profileData.headers || [],
        rows: profileData.data || [],
        profile: profileData.profile || null,
        columns: profileData.columns || [],
        warnings: profileData.warnings || [],
        metadata: {
          fileSize: file.size,
          rowCount: profileData.basic_info?.rows || 0,
          columnCount: profileData.basic_info?.columns || 0,
          processedAt: new Date().toISOString(),
          memoryUsage: 0,
        },
        statistical_summary: profileData.statistical_summary || null,
        quality_report: profileData.quality_report || null,
      };
      
      return processedDataset;
      
    } catch (error) {
      console.error('CSV profiling failed:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

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

      // Check storage quota before profiling
      if (isStorageQuotaExceeded()) {
        console.warn('Storage quota nearly exceeded, limiting data processing');
      }

      // Stage 4: Advanced data profiling
      dispatch(updateProcessingStage({ stage: 'profiling', progress: 75 }));
      let dataProfile: DataProfile | null = null;
      let advancedProfile: { 
        columns: AdvancedColumnProfile[]; 
        statistical_summary: StatisticalSummary; 
        quality_report: DataQualityReport; 
        warnings: DataWarning[] 
      };
      
      try {
        // Try backend profiling first
        dataProfile = await tauriAPI.profileCSV(filePath);
        
        // Generate advanced frontend profiling regardless
        advancedProfile = generateAdvancedProfile(parseResult.headers, parseResult.rows);
        
      } catch (error) {
        console.warn('Backend profiling failed, using advanced frontend analysis:', error);
        
        // Fallback to comprehensive frontend analysis
        advancedProfile = generateAdvancedProfile(parseResult.headers, parseResult.rows);
        
        // Create basic profile for compatibility
        dataProfile = {
          file_path: filePath,
          shape: [parseResult.rowCount, parseResult.columnCount],
          columns: advancedProfile.columns.map(col => ({
            name: col.name,
            dtype: col.dtype,
            missing_count: col.missing_count,
            missing_percentage: col.missing_percentage,
            unique_count: col.unique_count,
            unique_percentage: col.unique_percentage,
            memory_usage: col.memory_usage,
            stats: col.stats,
            warnings: col.warnings
          })),
          missing_summary: { 
            total_missing: advancedProfile.statistical_summary.missing_data.total_missing,
            columns_with_missing: advancedProfile.statistical_summary.missing_data.columns_with_missing.length 
          },
          warnings: [...parseResult.warnings.map(w => w.message), ...advancedProfile.warnings.map(w => w.message)],
          memory_usage_mb: fileInfo.size / (1024 * 1024),
          dtypes_summary: advancedProfile.statistical_summary.column_types
        };
      }

      // Stage 5: Complete processing
      dispatch(updateProcessingStage({ stage: 'completed', progress: 100 }));

      // Create processed dataset with advanced profiling
      const processedDataset: ProcessedDataset = {
        id: `${filePath}-${Date.now()}`,
        filePath,
        fileName: fileInfo.name,
        data: parseResult.data,
        headers: parseResult.headers,
        rows: parseResult.rows,
        profile: dataProfile,
        columns: advancedProfile.columns,
        warnings: [
          ...parseResult.warnings, 
          ...validation.warnings.map(w => ({ type: 'warning' as const, message: w })),
          ...advancedProfile.warnings
        ],
        metadata: {
          fileSize: fileInfo.size,
          rowCount: parseResult.rowCount,
          columnCount: parseResult.columnCount,
          processedAt: new Date().toISOString(),
          memoryUsage: fileInfo.size
        },
        statistical_summary: advancedProfile.statistical_summary,
        quality_report: advancedProfile.quality_report
      };

      return processedDataset;
    } catch (error) {
      // Handle quota exceeded errors
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        handleQuotaExceededError();
        return rejectWithValue('Storage quota exceeded. Cache has been cleared, please try again.');
      }
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
      const correlationMatrix: Record<string, Record<string, number | null>> = {};
      
      numericColumns.forEach(col1 => {
        correlationMatrix[col1.name] = {};
        numericColumns.forEach(col2 => {
          // Correlation matrix should be calculated by Python Analysis code
          // For now, return placeholder until we integrate with Analysis/data_profiler.py
          correlationMatrix[col1.name][col2.name] = col1.name === col2.name ? 1 : null;
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
      })
      
      // Profile CSV with API
      .addCase(profileCSVWithAPI.pending, (state) => {
        state.isProcessing = true;
        state.processingStage = 'uploading';
        state.processingProgress = 0;
        state.error = null;
      })
      .addCase(profileCSVWithAPI.fulfilled, (state, action) => {
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
      .addCase(profileCSVWithAPI.rejected, (state, action) => {
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

// Advanced profiling selectors
export const selectStatisticalSummary = (state: { data: DataState }) => state.data.currentDataset?.statistical_summary;
export const selectQualityReport = (state: { data: DataState }) => state.data.currentDataset?.quality_report;
export const selectAdvancedColumns = (state: { data: DataState }) => state.data.currentDataset?.columns;
export const selectDataQualityIssues = (state: { data: DataState }) => state.data.currentDataset?.quality_report?.issues || [];
export const selectDataQualityScore = (state: { data: DataState }) => state.data.currentDataset?.quality_report?.overall_score;
export const selectMissingDataSummary = (state: { data: DataState }) => state.data.currentDataset?.statistical_summary?.missing_data;
export const selectOutliersSummary = (state: { data: DataState }) => state.data.currentDataset?.statistical_summary?.outliers;