// Enhanced Tauri API for AutoQuanta frontend
// Connects to Python backend through Tauri commands

import type { DataProfile, TrainingConfig, TrainingResults, CSVParseOptions } from './types';

// Check if we're running in Tauri environment
const isTauri = typeof window !== 'undefined' && (window as unknown as { __TAURI__?: boolean }).__TAURI__;

// Tauri API references
let invoke: ((command: string, args?: unknown) => Promise<unknown>) | null = null;

// Dynamically load Tauri APIs only when needed
async function loadTauriAPI() {
  if (!isTauri || invoke) return;
  
  try {
    // Use dynamic imports with proper error handling for Tauri API v2
    const coreModule = await import('@tauri-apps/api/core').catch(() => null);
    
    if (coreModule) invoke = coreModule.invoke as ((command: string, args?: unknown) => Promise<unknown>);
    
    // Note: dialog and fs modules are not available in Tauri API v2
    // These will be handled through custom commands in the backend
  } catch (error) {
    console.warn('Failed to load Tauri APIs:', error);
  }
}

// Mock data for development
const mockDataProfile: DataProfile = {
  file_path: '/path/to/sample.csv',
  shape: [1000, 6],
  columns: [
    {
      name: 'ID',
      dtype: 'int64',
      missing_count: 0,
      missing_percentage: 0,
      unique_count: 1000,
      unique_percentage: 100,
      memory_usage: 8000,
      stats: { min: 1, max: 1000, mean: 500.5, std: 288.67 },
      warnings: ['All values are unique - consider if this is an ID column']
    },
    {
      name: 'Feature1',
      dtype: 'float64',
      missing_count: 0,
      missing_percentage: 0,
      unique_count: 1000,
      unique_percentage: 100,
      memory_usage: 8000,
      stats: { min: 0.1, max: 99.9, mean: 50.0, std: 28.87 },
      warnings: []
    },
    {
      name: 'Feature2',
      dtype: 'object',
      missing_count: 0,
      missing_percentage: 0,
      unique_count: 5,
      unique_percentage: 0.5,
      memory_usage: 8000,
      stats: { 
        top_categories: [
          { value: 'A', count: 200 },
          { value: 'B', count: 180 },
          { value: 'C', count: 150 }
        ]
      },
      warnings: []
    }
  ],
  missing_summary: { total_missing: 0, columns_with_missing: 0 },
  warnings: ['ID column detected'],
  memory_usage_mb: 0.048,
  dtypes_summary: { 'int64': 1, 'float64': 1, 'object': 1 }
};

// Enhanced API that works with both Tauri and mock data
export const tauriAPI = {
  // Project operations
  async openProject(): Promise<string | null> {
    await loadTauriAPI();
    
    if (isTauri && invoke) {
      try {
        return await invoke('open_project_dialog') as string | null;
      } catch (error) {
        console.error('Error opening project:', error);
        return null;
      }
    } else {
      console.log('[Mock] Opening project...');
      await new Promise(resolve => setTimeout(resolve, 500));
      return '/Users/user/projects/autoquanta-demo';
    }
  },

  async createProject(path: string, name: string): Promise<boolean> {
    await loadTauriAPI();
    
    if (isTauri && invoke) {
      try {
        return await invoke('create_project', { path, name }) as boolean;
      } catch (error) {
        console.error('Error creating project:', error);
        return false;
      }
    } else {
      console.log(`[Mock] Creating project: ${name} at ${path}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    }
  },

  // File operations
  async selectCSVFile(): Promise<string | null> {
    await loadTauriAPI();
    
    if (isTauri && invoke) {
      try {
        return await invoke('select_csv_file') as string | null;
      } catch (error) {
        console.error('Error selecting file:', error);
        return null;
      }
    } else {
      console.log('[Mock] Selecting CSV file...');
      await new Promise(resolve => setTimeout(resolve, 500));
      return '/Users/user/documents/sample-data.csv';
    }
  },

  async readCSVFile(filePath: string): Promise<string> {
    await loadTauriAPI();
    
    if (isTauri && invoke) {
      try {
        return await invoke('read_csv_file', { filePath }) as string;
      } catch (error) {
        console.error('Error reading file:', error);
        throw new Error(`Failed to read file: ${error}`);
      }
    } else {
      console.log(`[Mock] Reading CSV file: ${filePath}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      // Return mock CSV content
      return 'ID,Name,Age,Income,Category,Score\n1,John Doe,25,50000,A,85.5\n2,Jane Smith,30,60000,B,92.3\n3,Bob Johnson,35,75000,A,78.9\n4,Alice Brown,28,55000,C,88.1\n5,Charlie Wilson,32,65000,B,91.2';
    }
  },

  async readCSVPreview(filePath: string, maxRows: number = 100): Promise<string[][]> {
    await loadTauriAPI();
    
    if (isTauri && invoke) {
      try {
        return await invoke('read_csv_preview', { filePath, maxRows }) as string[][];
      } catch (error) {
        console.error('Error reading CSV preview:', error);
        throw new Error(`Failed to read CSV preview: ${error}`);
      }
    } else {
      console.log(`[Mock] Reading CSV preview: ${filePath}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return [
        ['ID', 'Name', 'Age', 'Income', 'Category', 'Score'],
        ['1', 'John Doe', '25', '50000', 'A', '85.5'],
        ['2', 'Jane Smith', '30', '60000', 'B', '92.3'],
        ['3', 'Bob Johnson', '35', '75000', 'A', '78.9'],
        ['4', 'Alice Brown', '28', '55000', 'C', '88.1'],
        ['5', 'Charlie Wilson', '32', '65000', 'B', '91.2']
      ];
    }
  },

  // Data profiling using Python backend
  async profileCSV(filePath: string, options?: CSVParseOptions): Promise<DataProfile | null> {
    await loadTauriAPI();
    
    if (isTauri && invoke) {
      try {
        return await invoke('profile_csv', { 
          filePath, 
          options: options || {} 
        }) as DataProfile;
      } catch (error) {
        console.error('Error profiling CSV:', error);
        throw new Error(`Failed to profile CSV: ${error}`);
      }
    } else {
      console.log(`[Mock] Profiling CSV: ${filePath}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockDataProfile;
    }
  },

  // File validation
  async validateCSVFile(filePath: string): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    await loadTauriAPI();
    
    if (isTauri && invoke) {
      try {
        return await invoke('validate_csv_file', { filePath }) as { isValid: boolean; errors: string[]; warnings: string[] };
      } catch (error) {
        console.error('Error validating CSV:', error);
        return {
          isValid: false,
          errors: [`Validation failed: ${error}`],
          warnings: []
        };
      }
    } else {
      console.log(`[Mock] Validating CSV: ${filePath}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        isValid: true,
        errors: [],
        warnings: ['This is mock validation data']
      };
    }
  },

  // Training operations
  async startTraining(config: TrainingConfig): Promise<boolean> {
    await loadTauriAPI();
    
    if (isTauri && invoke) {
      try {
        return await invoke('start_training', { config }) as boolean;
      } catch (error) {
        console.error('Error starting training:', error);
        return false;
      }
    } else {
      console.log('[Mock] Starting training with config:', config);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }
  },

  async getTrainingStatus(): Promise<{ status: string; progress: number; message: string }> {
    await loadTauriAPI();
    
    if (isTauri && invoke) {
      try {
        return await invoke('get_training_status') as { status: string; progress: number; message: string };
      } catch (error) {
        console.error('Error getting training status:', error);
        return { status: 'error', progress: 0, message: 'Failed to get status' };
      }
    } else {
      console.log('[Mock] Getting training status...');
      return { 
        status: 'completed', 
        progress: 100, 
        message: 'Training completed successfully' 
      };
    }
  },

  async getTrainingResults(): Promise<TrainingResults | null> {
    await loadTauriAPI();
    
    if (isTauri && invoke) {
      try {
        return await invoke('get_training_results') as TrainingResults;
      } catch (error) {
        console.error('Error getting training results:', error);
        return null;
      }
    } else {
      console.log('[Mock] Getting training results...');
      return {
        best_model: {
          model_name: 'RandomForest',
          cv_scores: [0.85, 0.87, 0.86, 0.88, 0.86],
          mean_score: 0.864,
          std_score: 0.012,
          fold_results: [],
          feature_importance: { 'Feature1': 0.6, 'Feature2': 0.4 },
          training_time: 2.5,
          all_predictions: [],
          all_actuals: []
        },
        all_models: [],
        training_config: {} as TrainingConfig,
        data_profile: mockDataProfile,
        cv_summary: {},
        model_comparison: {},
        prediction_analysis: {}
      };
    }
  },

  // Prediction operations
  async runInference(modelPath: string, csvPath: string): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    await loadTauriAPI();
    
    if (isTauri && invoke) {
      try {
        return await invoke('run_inference', { modelPath, csvPath }) as { success: boolean; outputPath?: string; error?: string };
      } catch (error) {
        console.error('Error running inference:', error);
        return { success: false, error: `Inference failed: ${error}` };
      }
    } else {
      console.log(`[Mock] Running inference: ${modelPath} on ${csvPath}`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { success: true, outputPath: '/path/to/predictions.csv' };
    }
  },

  // Utility functions
  async getSystemInfo(): Promise<{ platform: string; version: string; memory: number }> {
    await loadTauriAPI();
    
    if (isTauri && invoke) {
      try {
        return await invoke('get_system_info') as { platform: string; version: string; memory: number };
      } catch (error) {
        console.error('Error getting system info:', error);
        return { platform: 'unknown', version: '0.1.0', memory: 0 };
      }
    } else {
      console.log('[Mock] Getting system info...');
      return { platform: 'darwin', version: '0.1.0', memory: 16384 };
    }
  }
};

// Event listeners for real-time updates
export const setupEventListeners = (callbacks: {
  onTrainingProgress?: (data: unknown) => void;
  onError?: (error: string) => void;
  onProjectUpdate?: (data: unknown) => void;
}) => {
  console.log('[Mock] Setting up event listeners...', callbacks);
  // Mock implementation - will be replaced with real event system later
};

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to format percentage
export const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};
