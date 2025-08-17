// TypeScript interfaces for AutoQuanta frontend
// Mirrors the Python backend data structures

export interface ColumnInfo {
  name: string;
  dtype: string;
  missing_count: number;
  missing_percentage: number;
  unique_count: number;
  unique_percentage: number;
  memory_usage: number;
  stats: Record<string, unknown>;
  warnings: string[];
}

export interface DataProfile {
  file_path: string;
  shape: [number, number];
  columns: ColumnInfo[];
  missing_summary: Record<string, unknown>;
  warnings: string[];
  memory_usage_mb: number;
  dtypes_summary: Record<string, number>;
}

export interface TrainingConfig {
  target_column: string;
  task_type: 'classification' | 'regression';
  test_size: number;
  cv_folds: number;
  random_seed: number;
  models_to_try: string[];
}

export interface FoldResult {
  fold_idx: number;
  train_indices: number[];
  val_indices: number[];
  train_score: number;
  val_score: number;
  val_predictions: number[];
  val_actual: number[];
  val_probabilities?: number[];
}

export interface ModelTrainingResult {
  model_name: string;
  cv_scores: number[];
  mean_score: number;
  std_score: number;
  fold_results: FoldResult[];
  feature_importance?: Record<string, number>;
  training_time: number;
  all_predictions: number[];
  all_actuals: number[];
  best_params?: Record<string, unknown>;
  all_probabilities?: number[];
}

export interface TrainingResults {
  best_model: ModelTrainingResult;
  all_models: ModelTrainingResult[];
  training_config: TrainingConfig;
  data_profile: DataProfile;
  cv_summary: Record<string, unknown>;
  model_comparison: Record<string, unknown>;
  prediction_analysis: Record<string, unknown>;
}

export interface ProjectMetadata {
  name: string;
  path: string;
  created_at: string;
  last_modified: string;
  data_files: string[];
  models: string[];
}

export interface AppState {
  project: {
    path: string | null;
    metadata: ProjectMetadata | null;
    mode: 'local-only' | 'cloud-enabled';
  };
  data: {
    profile: DataProfile | null;
    preview: unknown[][] | null;
    target_column: string | null;
  };
  training: {
    config: TrainingConfig | null;
    status: 'idle' | 'running' | 'completed' | 'failed';
    results: TrainingResults | null;
  };
  ui: {
    current_page: string;
    loading: boolean;
    error: string | null;
  };
}

export interface DataWarning {
  type: 'error' | 'warning' | 'info';
  message: string;
  column?: string;
  suggestion?: string;
}

export interface FileUploadState {
  file: File | null;
  isUploading: boolean;
  progress: number;
  error: string | null;
}
