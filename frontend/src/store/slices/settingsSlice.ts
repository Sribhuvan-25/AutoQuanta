/**
 * Settings slice for Redux store
 * Manages application settings, preferences, and configuration
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Model training defaults
interface ModelTrainingDefaults {
  test_size: number;
  cv_folds: number;
  random_state: number;
  max_training_time: number;
  early_stopping: boolean;
  hyperparameter_tuning: boolean;
  models_to_try: string[];
}

// Data processing defaults
interface DataProcessingDefaults {
  missing_value_strategy: 'drop' | 'mean' | 'median' | 'mode' | 'forward_fill';
  outlier_detection: boolean;
  outlier_method: 'iqr' | 'zscore' | 'isolation_forest';
  feature_scaling: 'none' | 'standard' | 'minmax' | 'robust';
  encoding_strategy: 'auto' | 'onehot' | 'label' | 'target';
}

// Visualization defaults
interface VisualizationDefaults {
  default_chart_type: string;
  color_palette: string;
  figure_size: [number, number];
  dpi: number;
  show_grid: boolean;
  animation_duration: number;
}

// Performance settings
interface PerformanceSettings {
  max_memory_usage_mb: number;
  chunk_size: number;
  parallel_processing: boolean;
  max_workers: number;
  cache_size_mb: number;
  enable_gpu: boolean;
}

// Privacy and security settings
interface PrivacySettings {
  telemetry_enabled: boolean;
  crash_reporting: boolean;
  usage_analytics: boolean;
  auto_updates: boolean;
  data_retention_days: number;
}

// Settings state interface
interface SettingsState {
  // Application settings
  general: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    auto_save: boolean;
    auto_save_interval: number; // in seconds
    confirm_destructive_actions: boolean;
  };
  
  // Data processing defaults
  dataProcessing: DataProcessingDefaults;
  
  // Model training defaults
  modelTraining: ModelTrainingDefaults;
  
  // Visualization defaults
  visualization: VisualizationDefaults;
  
  // Performance settings
  performance: PerformanceSettings;
  
  // Privacy and security
  privacy: PrivacySettings;
  
  // File and folder settings
  paths: {
    default_project_directory: string;
    default_export_directory: string;
    temp_directory: string;
    backup_directory: string;
  };
  
  // Advanced settings
  advanced: {
    log_level: 'debug' | 'info' | 'warning' | 'error';
    developer_mode: boolean;
    experimental_features: boolean;
    custom_python_path: string;
    environment_variables: Record<string, string>;
  };
  
  // UI preferences (persisted)
  ui: {
    sidebar_width: number;
    panel_heights: Record<string, number>;
    table_column_widths: Record<string, number>;
    recently_used_models: string[];
    favorite_visualizations: string[];
  };
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  lastSavedAt: string | null;
}

// Initial state
const initialState: SettingsState = {
  general: {
    theme: 'auto',
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    auto_save: true,
    auto_save_interval: 300, // 5 minutes
    confirm_destructive_actions: true,
  },
  
  dataProcessing: {
    missing_value_strategy: 'mean',
    outlier_detection: true,
    outlier_method: 'iqr',
    feature_scaling: 'standard',
    encoding_strategy: 'auto',
  },
  
  modelTraining: {
    test_size: 0.2,
    cv_folds: 5,
    random_state: 42,
    max_training_time: 3600, // 1 hour
    early_stopping: true,
    hyperparameter_tuning: true,
    models_to_try: ['random_forest', 'xgboost', 'linear_regression'],
  },
  
  visualization: {
    default_chart_type: 'scatter',
    color_palette: 'viridis',
    figure_size: [10, 6],
    dpi: 100,
    show_grid: true,
    animation_duration: 1000,
  },
  
  performance: {
    max_memory_usage_mb: 4096, // 4GB
    chunk_size: 10000,
    parallel_processing: true,
    max_workers: 4,
    cache_size_mb: 512,
    enable_gpu: false,
  },
  
  privacy: {
    telemetry_enabled: false,
    crash_reporting: true,
    usage_analytics: false,
    auto_updates: true,
    data_retention_days: 90,
  },
  
  paths: {
    default_project_directory: '',
    default_export_directory: '',
    temp_directory: '',
    backup_directory: '',
  },
  
  advanced: {
    log_level: 'info',
    developer_mode: false,
    experimental_features: false,
    custom_python_path: '',
    environment_variables: {},
  },
  
  ui: {
    sidebar_width: 280,
    panel_heights: {},
    table_column_widths: {},
    recently_used_models: [],
    favorite_visualizations: [],
  },
  
  isLoading: false,
  error: null,
  lastSavedAt: null,
};

// Async thunks for settings operations
export const loadSettings = createAsyncThunk(
  'settings/load',
  async (_, { rejectWithValue }) => {
    try {
      // In a real implementation, this would load from file system or backend
      // For now, return default settings
      return initialState;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load settings');
    }
  }
);

export const saveSettings = createAsyncThunk(
  'settings/save',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { settings: SettingsState };
      const { settings } = state;
      
      // In a real implementation, this would save to file system
      console.log('Saving settings:', settings);
      
      return {
        ...settings,
        lastSavedAt: new Date().toISOString(),
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save settings');
    }
  }
);

export const resetSettings = createAsyncThunk(
  'settings/reset',
  async (category: keyof Omit<SettingsState, 'isLoading' | 'error' | 'lastSavedAt'> | undefined, { rejectWithValue }) => {
    try {
      // Reset specific category or all settings
      if (category) {
        return { category, settings: initialState[category] };
      } else {
        return { category: 'all', settings: initialState };
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to reset settings');
    }
  }
);

// Settings slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // General settings
    updateGeneralSettings: (state, action: PayloadAction<Partial<SettingsState['general']>>) => {
      state.general = { ...state.general, ...action.payload };
    },
    
    // Data processing settings
    updateDataProcessingSettings: (state, action: PayloadAction<Partial<DataProcessingDefaults>>) => {
      state.dataProcessing = { ...state.dataProcessing, ...action.payload };
    },
    
    // Model training settings
    updateModelTrainingSettings: (state, action: PayloadAction<Partial<ModelTrainingDefaults>>) => {
      state.modelTraining = { ...state.modelTraining, ...action.payload };
    },
    
    // Visualization settings
    updateVisualizationSettings: (state, action: PayloadAction<Partial<VisualizationDefaults>>) => {
      state.visualization = { ...state.visualization, ...action.payload };
    },
    
    // Performance settings
    updatePerformanceSettings: (state, action: PayloadAction<Partial<PerformanceSettings>>) => {
      state.performance = { ...state.performance, ...action.payload };
    },
    
    // Privacy settings
    updatePrivacySettings: (state, action: PayloadAction<Partial<PrivacySettings>>) => {
      state.privacy = { ...state.privacy, ...action.payload };
    },
    
    // Path settings
    updatePathSettings: (state, action: PayloadAction<Partial<SettingsState['paths']>>) => {
      state.paths = { ...state.paths, ...action.payload };
    },
    
    // Advanced settings
    updateAdvancedSettings: (state, action: PayloadAction<Partial<SettingsState['advanced']>>) => {
      state.advanced = { ...state.advanced, ...action.payload };
    },
    
    // UI settings
    updateUISettings: (state, action: PayloadAction<Partial<SettingsState['ui']>>) => {
      state.ui = { ...state.ui, ...action.payload };
    },
    
    // Add to recently used models
    addRecentlyUsedModel: (state, action: PayloadAction<string>) => {
      const model = action.payload;
      const existing = state.ui.recently_used_models.indexOf(model);
      
      if (existing >= 0) {
        state.ui.recently_used_models.splice(existing, 1);
      }
      
      state.ui.recently_used_models.unshift(model);
      state.ui.recently_used_models = state.ui.recently_used_models.slice(0, 10);
    },
    
    // Add to favorite visualizations
    toggleFavoriteVisualization: (state, action: PayloadAction<string>) => {
      const viz = action.payload;
      const existing = state.ui.favorite_visualizations.indexOf(viz);
      
      if (existing >= 0) {
        state.ui.favorite_visualizations.splice(existing, 1);
      } else {
        state.ui.favorite_visualizations.push(viz);
      }
    },
    
    // Environment variables
    setEnvironmentVariable: (state, action: PayloadAction<{ key: string; value: string }>) => {
      state.advanced.environment_variables[action.payload.key] = action.payload.value;
    },
    
    removeEnvironmentVariable: (state, action: PayloadAction<string>) => {
      delete state.advanced.environment_variables[action.payload];
    },
    
    // Panel and UI dimensions
    setPanelHeight: (state, action: PayloadAction<{ panel: string; height: number }>) => {
      state.ui.panel_heights[action.payload.panel] = action.payload.height;
    },
    
    setColumnWidth: (state, action: PayloadAction<{ column: string; width: number }>) => {
      state.ui.table_column_widths[action.payload.column] = action.payload.width;
    },
    
    setSidebarWidth: (state, action: PayloadAction<number>) => {
      state.ui.sidebar_width = action.payload;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Load settings
    builder
      .addCase(loadSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        Object.assign(state, action.payload);
        state.error = null;
      })
      .addCase(loadSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Save settings
    builder
      .addCase(saveSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastSavedAt = action.payload.lastSavedAt;
        state.error = null;
      })
      .addCase(saveSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Reset settings
    builder
      .addCase(resetSettings.fulfilled, (state, action) => {
        if (action.payload.category === 'all') {
          Object.assign(state, action.payload.settings);
        } else {
          const category = action.payload.category as keyof Omit<SettingsState, 'isLoading' | 'error' | 'lastSavedAt'>;
          if (category in state) {
            state[category] = action.payload.settings as never;
          }
        }
        state.error = null;
      })
      .addCase(resetSettings.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  updateGeneralSettings,
  updateDataProcessingSettings,
  updateModelTrainingSettings,
  updateVisualizationSettings,
  updatePerformanceSettings,
  updatePrivacySettings,
  updatePathSettings,
  updateAdvancedSettings,
  updateUISettings,
  addRecentlyUsedModel,
  toggleFavoriteVisualization,
  setEnvironmentVariable,
  removeEnvironmentVariable,
  setPanelHeight,
  setColumnWidth,
  setSidebarWidth,
  clearError,
} = settingsSlice.actions;

// Export reducer
export default settingsSlice.reducer;

// Selectors
export const selectGeneralSettings = (state: { settings: SettingsState }) => state.settings.general;
export const selectDataProcessingSettings = (state: { settings: SettingsState }) => state.settings.dataProcessing;
export const selectModelTrainingSettings = (state: { settings: SettingsState }) => state.settings.modelTraining;
export const selectVisualizationSettings = (state: { settings: SettingsState }) => state.settings.visualization;
export const selectPerformanceSettings = (state: { settings: SettingsState }) => state.settings.performance;
export const selectPrivacySettings = (state: { settings: SettingsState }) => state.settings.privacy;
export const selectPathSettings = (state: { settings: SettingsState }) => state.settings.paths;
export const selectAdvancedSettings = (state: { settings: SettingsState }) => state.settings.advanced;
export const selectUISettings = (state: { settings: SettingsState }) => state.settings.ui;
export const selectSettingsError = (state: { settings: SettingsState }) => state.settings.error;
export const selectSettingsLoadingState = (state: { settings: SettingsState }) => ({
  isLoading: state.settings.isLoading,
  lastSavedAt: state.settings.lastSavedAt,
});