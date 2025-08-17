/**
 * Data validation schemas for AutoQuanta
 * Uses Zod for runtime type validation and error handling
 */

import { z } from 'zod';

// File upload validation schema
export const fileUploadSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().min(1, 'File must not be empty').max(50 * 1024 * 1024, 'File too large (max 50MB)'),
  type: z.string().refine(
    (type) => ['text/csv', 'application/csv', 'text/plain'].includes(type),
    'Only CSV files are supported'
  ),
  lastModified: z.number().optional()
});

export type FileUploadInput = z.infer<typeof fileUploadSchema>;

// CSV configuration schema
export const csvConfigSchema = z.object({
  delimiter: z.enum([',', '\t', ';', '|']).default(','),
  hasHeader: z.boolean().default(true),
  encoding: z.enum(['utf-8', 'latin-1', 'ascii']).default('utf-8'),
  skipRows: z.number().min(0).max(100).default(0),
  maxRows: z.number().min(1).max(1000000).optional()
});

export type CSVConfig = z.infer<typeof csvConfigSchema>;

// Column type validation
export const columnTypeSchema = z.enum([
  'numeric',
  'integer', 
  'float',
  'boolean',
  'date',
  'categorical',
  'text'
]);

export type ColumnType = z.infer<typeof columnTypeSchema>;

// Data quality metrics schema
export const dataQualitySchema = z.object({
  totalRows: z.number().min(0),
  totalColumns: z.number().min(0),
  missingValues: z.number().min(0),
  missingPercentage: z.number().min(0).max(100),
  duplicateRows: z.number().min(0),
  emptyRows: z.number().min(0),
  memoryUsageMB: z.number().min(0)
});

export type DataQuality = z.infer<typeof dataQualitySchema>;

// Column information schema
export const columnInfoSchema = z.object({
  name: z.string().min(1, 'Column name cannot be empty'),
  dtype: columnTypeSchema,
  missing_count: z.number().min(0),
  missing_percentage: z.number().min(0).max(100),
  unique_count: z.number().min(0),
  unique_percentage: z.number().min(0).max(100),
  memory_usage: z.number().min(0),
  stats: z.record(z.string(), z.unknown()),
  warnings: z.array(z.string()).default([])
});

export type ColumnInfo = z.infer<typeof columnInfoSchema>;

// Data warning schema
export const dataWarningSchema = z.object({
  type: z.enum(['error', 'warning', 'info']),
  message: z.string().min(1),
  column: z.string().optional(),
  suggestion: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high']).default('medium')
});

export type DataWarning = z.infer<typeof dataWarningSchema>;

// Project metadata schema
export const projectMetadataSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
  path: z.string().min(1, 'Project path is required'),
  created_at: z.string().datetime(),
  last_modified: z.string().datetime(),
  data_files: z.array(z.string()).default([]),
  models: z.array(z.string()).default([]),
  description: z.string().max(500, 'Description too long').optional(),
  tags: z.array(z.string()).default([])
});

export type ProjectMetadata = z.infer<typeof projectMetadataSchema>;

// Training configuration schema
export const trainingConfigSchema = z.object({
  target_column: z.string().min(1, 'Target column is required'),
  task_type: z.enum(['classification', 'regression']),
  test_size: z.number().min(0.1).max(0.5).default(0.2),
  cv_folds: z.number().min(2).max(10).default(5),
  random_seed: z.number().int().min(0).max(9999).default(42),
  models_to_try: z.array(z.string()).min(1, 'At least one model must be selected'),
  feature_columns: z.array(z.string()).optional(),
  exclude_columns: z.array(z.string()).default([]),
  handle_missing: z.enum(['drop', 'impute_mean', 'impute_median', 'impute_mode']).default('impute_mean'),
  scale_features: z.boolean().default(true)
});

export type TrainingConfig = z.infer<typeof trainingConfigSchema>;

// Model performance schema
export const modelPerformanceSchema = z.object({
  model_name: z.string(),
  cv_scores: z.array(z.number()),
  mean_score: z.number(),
  std_score: z.number(),
  training_time: z.number().min(0),
  feature_importance: z.record(z.string(), z.number()).optional(),
  best_params: z.record(z.string(), z.unknown()).optional()
});

export type ModelPerformance = z.infer<typeof modelPerformanceSchema>;

// File validation helpers
export function validateFileSize(size: number, maxSizeMB: number = 50): { isValid: boolean; error?: string } {
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (size > maxBytes) {
    return {
      isValid: false,
      error: `File size (${(size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
    };
  }
  return { isValid: true };
}

export function validateFileType(filename: string, allowedExtensions: string[] = ['csv']): { isValid: boolean; error?: string } {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `File type not supported. Allowed types: ${allowedExtensions.join(', ').toUpperCase()}`
    };
  }
  return { isValid: true };
}

export function validateColumnName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Column name cannot be empty' };
  }
  
  if (name.length > 50) {
    return { isValid: false, error: 'Column name too long (max 50 characters)' };
  }
  
  // Check for problematic characters
  const problematicChars = /[<>:"\\|?*]/;
  if (problematicChars.test(name)) {
    return { isValid: false, error: 'Column name contains invalid characters' };
  }
  
  return { isValid: true };
}

export function validateDataset(headers: string[], rows: string[][]): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic validation
  if (headers.length === 0) {
    errors.push('Dataset must have at least one column');
  }
  
  if (rows.length === 0) {
    errors.push('Dataset must have at least one data row');
  }
  
  // Check for duplicate headers
  const headerSet = new Set(headers);
  if (headerSet.size !== headers.length) {
    errors.push('Duplicate column headers found');
  }
  
  // Check for empty headers
  const emptyHeaders = headers.filter(h => !h || h.trim().length === 0);
  if (emptyHeaders.length > 0) {
    warnings.push(`${emptyHeaders.length} columns have empty names`);
  }
  
  // Check for inconsistent row lengths
  const expectedColumns = headers.length;
  const inconsistentRows = rows.filter(row => row.length !== expectedColumns);
  if (inconsistentRows.length > 0) {
    warnings.push(`${inconsistentRows.length} rows have inconsistent column counts`);
  }
  
  // Check dataset size recommendations
  if (rows.length < 100) {
    warnings.push('Dataset is very small (< 100 rows). Consider collecting more data.');
  }
  
  if (headers.length < 2) {
    warnings.push('Dataset has very few columns. You need at least features and a target column for ML.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Data sanitization helpers
export function sanitizeColumnName(name: string): string {
  return name
    .trim()
    .replace(/[<>:"\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

export function sanitizeCSVValue(value: string): string {
  return value
    .trim()
    .replace(/^\"|\"$/g, '') // Remove surrounding quotes
    .replace(/\"\"/g, '"'); // Unescape doubled quotes
}

// Type guards
export function isNumeric(value: string): boolean {
  return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
}

export function isInteger(value: string): boolean {
  return Number.isInteger(parseFloat(value)) && isFinite(parseFloat(value));
}

export function isBoolean(value: string): boolean {
  const booleanValues = ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'];
  return booleanValues.includes(value.toLowerCase());
}

export function isDate(value: string): boolean {
  return !isNaN(Date.parse(value));
}

// Error handling utilities
export function formatValidationErrors(errors: z.ZodError): string[] {
  return errors.issues.map(error => {
    const path = error.path.join('.');
    return `${path}: ${error.message}`;
  });
}

export function createValidationError(message: string, path?: string): DataWarning {
  return {
    type: 'error',
    message,
    column: path,
    severity: 'high'
  };
}

export function createValidationWarning(message: string, path?: string, suggestion?: string): DataWarning {
  return {
    type: 'warning',
    message,
    column: path,
    suggestion,
    severity: 'medium'
  };
}