// Mock API for AutoQuanta frontend development
// This will be replaced with real Tauri API calls later

import type { DataProfile, TrainingConfig, TrainingResults } from './types';

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

// Simple mock API
export const tauriAPI = {
  // Project operations
  async openProject(): Promise<string | null> {
    console.log('[Mock] Opening project...');
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return '/Users/user/projects/autoquanta-demo';
  },

  async createProject(path: string, name: string): Promise<boolean> {
    console.log(`[Mock] Creating project: ${name} at ${path}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  },

  // File operations
  async selectCSVFile(): Promise<string | null> {
    console.log('[Mock] Selecting CSV file...');
    await new Promise(resolve => setTimeout(resolve, 500));
    return '/Users/user/documents/sample-data.csv';
  },

  async readCSVPreview(filePath: string): Promise<string[][]> {
    console.log(`[Mock] Reading CSV preview: ${filePath}`);
    // Return mock CSV data
    return [
      ['ID', 'Name', 'Age', 'Income', 'Category', 'Score'],
      ['1', 'John Doe', '25', '50000', 'A', '85.5'],
      ['2', 'Jane Smith', '30', '60000', 'B', '92.3'],
      ['3', 'Bob Johnson', '35', '75000', 'A', '78.9'],
      ['4', 'Alice Brown', '28', '55000', 'C', '88.1'],
      ['5', 'Charlie Wilson', '32', '65000', 'B', '91.2']
    ];
  },

  // Data profiling
  async profileCSV(filePath: string): Promise<DataProfile | null> {
    console.log(`[Mock] Profiling CSV: ${filePath}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockDataProfile;
  },

  // Training operations
  async startTraining(config: TrainingConfig): Promise<boolean> {
    console.log('[Mock] Starting training with config:', config);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  },

  async getTrainingStatus(): Promise<{ status: string; progress: number; message: string }> {
    console.log('[Mock] Getting training status...');
    return { 
      status: 'completed', 
      progress: 100, 
      message: 'Training completed successfully' 
    };
  },

  async getTrainingResults(): Promise<TrainingResults | null> {
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
  },

  // Prediction operations
  async runInference(modelPath: string, csvPath: string): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    console.log(`[Mock] Running inference: ${modelPath} on ${csvPath}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true, outputPath: '/path/to/predictions.csv' };
  },

  // Utility functions
  async getSystemInfo(): Promise<{ platform: string; version: string; memory: number }> {
    console.log('[Mock] Getting system info...');
    return { platform: 'darwin', version: '0.1.0', memory: 16384 };
  }
};

// Event listeners for real-time updates
export const setupEventListeners = (_callbacks: {
  onTrainingProgress?: (data: unknown) => void;
  onError?: (error: string) => void;
  onProjectUpdate?: (data: unknown) => void;
}) => {
  console.log('[Mock] Setting up event listeners...');
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
