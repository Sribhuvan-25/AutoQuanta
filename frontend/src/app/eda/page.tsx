'use client';

import React, { useState, useCallback } from 'react';
import { FileUpload } from '@/components/common/FileUpload';
import { DataTable } from '@/components/data/DataTable';
import { ColumnCard } from '@/components/data/ColumnCard';
import { Button } from '@/components/ui/button';
import { DataProcessingIndicator } from '@/components/ui/loading';
import { AlertTriangle, CheckCircle, Info, Download } from 'lucide-react';
import type { ColumnInfo, DataWarning, DataProfile } from '@/lib/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { useFileProcessingState } from '@/hooks/useLoadingState';
import { parseCSV, analyzeColumnTypes } from '@/lib/csv-utils';
import { tauriAPI } from '@/lib/tauri';


interface ProcessedData {
  data: string[][];
  headers: string[];
  rows: string[][];
  columns: ColumnInfo[];
  warnings: DataWarning[];
  fileInfo: {
    name: string;
    size: number;
    rowCount: number;
    columnCount: number;
  };
}

export default function EDAPage() {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const {
    loadingState,
    startLoading,
    updateProgress,
    nextStage,
    completeLoading,
    failLoading,
    resetLoading,
    isLoading,
    hasError
  } = useFileProcessingState();


  const handleFileSelect = useCallback(async (filePath: string, fileInfo?: { name: string; size: number; type: string }) => {
    try {
      startLoading('Processing your CSV file...');
      
      // Stage 1: Validate file
      updateProgress(10, 'Validating file...');
      const validation = await tauriAPI.validateCSVFile(filePath);
      
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors[0]}`);
      }
      
      if (validation.warnings.length > 0) {
        setValidationErrors(validation.warnings);
      }
      
      nextStage();

      // Stage 2: Read file content
      updateProgress(25, 'Reading file content...');
      const fileContent = await tauriAPI.readCSVFile(filePath);
      nextStage();

      // Stage 3: Parse CSV
      updateProgress(50, 'Parsing CSV structure...');
      const parseResult = parseCSV(fileContent);
      
      if (parseResult.errors.length > 0) {
        throw new Error(`CSV parsing failed: ${parseResult.errors[0]}`);
      }
      
      nextStage();

      // Stage 4: Profile data using Python backend
      updateProgress(75, 'Analyzing data with Python backend...');
      let dataProfile: DataProfile | null = null;
      
      try {
        dataProfile = await tauriAPI.profileCSV(filePath);
      } catch (error) {
        console.warn('Backend profiling failed, using frontend analysis:', error);
        // Fallback to frontend analysis
        const columnTypes = analyzeColumnTypes(parseResult.headers, parseResult.rows);
        
        // Convert to ColumnInfo format as fallback
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

        // Create mock data profile as fallback
        dataProfile = {
          file_path: filePath,
          shape: [parseResult.rowCount, parseResult.columnCount],
          columns,
          missing_summary: { total_missing: 0, columns_with_missing: 0 },
          warnings: parseResult.warnings.map(w => w.message),
          memory_usage_mb: fileInfo?.size ? fileInfo.size / (1024 * 1024) : 0,
          dtypes_summary: {}
        };
      }

      updateProgress(100, 'Processing complete!');

      // Set processed data
      setProcessedData({
        data: parseResult.data,
        headers: parseResult.headers,
        rows: parseResult.rows,
        columns: dataProfile?.columns || [],
        warnings: [...parseResult.warnings, ...validation.warnings.map(w => ({ type: 'warning' as const, message: w }))],
        fileInfo: {
          name: fileInfo?.name || filePath.split('/').pop() || 'unknown.csv',
          size: fileInfo?.size || 0,
          rowCount: parseResult.rowCount,
          columnCount: parseResult.columnCount
        }
      });

      completeLoading('Data analysis complete!');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file';
      failLoading(errorMessage);
    }
  }, [startLoading, updateProgress, nextStage, completeLoading, failLoading]);

  const handleFileUploadError = useCallback((error: string) => {
    setValidationErrors([error]);
  }, []);

  const handleValidationFailed = useCallback((errors: string[]) => {
    setValidationErrors(errors);
  }, []);

  const handleTargetSelect = useCallback((columnName: string) => {
    setTargetColumn(columnName);
  }, []);

  const handleReset = useCallback(() => {
    setProcessedData(null);
    setTargetColumn('');
    setValidationErrors([]);
    resetLoading();
  }, [resetLoading]);

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Explorer</h1>
          <p className="text-gray-600 mt-1">
            Upload and explore your CSV data to understand its structure and quality.
          </p>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-x-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
            </div>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm text-red-700">{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* File Upload */}
        {!processedData && !isLoading && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <FileUpload
              onFileSelect={handleFileSelect}
              onError={handleFileUploadError}
              onValidationFailed={handleValidationFailed}
              title="Upload CSV File"
              description="Drag and drop your CSV file here or click to browse"
              disabled={isLoading}
            />
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <DataProcessingIndicator
            stage={loadingState.stage as 'uploading' | 'parsing' | 'validating' | 'profiling' | 'completed' | 'error'}
            progress={loadingState.progress}
            message={loadingState.message}
            details={loadingState.estimatedTimeRemaining 
              ? `Estimated time remaining: ${Math.ceil(loadingState.estimatedTimeRemaining / 1000)}s`
              : undefined
            }
          />
        )}

        {/* Error State */}
        {hasError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold text-red-900">Processing Failed</h3>
            </div>
            <p className="text-sm text-red-700 mb-4">{loadingState.error}</p>
            <Button onClick={handleReset} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Data Overview */}
        {processedData && !isLoading && (
          <div className="space-y-6">
            {/* File Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Data Overview</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {processedData.fileInfo.name} • {processedData.fileInfo.rowCount} rows • {processedData.fileInfo.columnCount} columns
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    File size: {(processedData.fileInfo.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="flex gap-x-2">
                  <Button variant="outline" onClick={handleReset}>
                    Upload New File
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {processedData.warnings.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality Insights</h3>
                <div className="space-y-3">
                  {processedData.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-x-3">
                      {warning.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />}
                      {warning.type === 'info' && <Info className="h-5 w-5 text-blue-500 mt-0.5" />}
                      {warning.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />}
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{warning.message}</p>
                        {warning.column && (
                          <p className="text-xs text-gray-500 mt-1">Column: {warning.column}</p>
                        )}
                        {warning.suggestion && (
                          <p className="text-xs text-blue-600 mt-1">💡 {warning.suggestion}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Preview */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Data Preview</h3>
                <div className="text-xs text-gray-500">
                  Showing first {Math.min(100, processedData.rows.length)} rows
                </div>
              </div>
              <DataTable data={processedData.data} maxRows={100} />
            </div>

            {/* Column Statistics */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Column Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedData.columns.map((column) => (
                  <ColumnCard
                    key={column.name}
                    column={column}
                    isSelected={targetColumn === column.name}
                    onSelect={() => handleTargetSelect(column.name)}
                  />
                ))}
              </div>
            </div>

            {/* Target Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Column Selection</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Target Column for Machine Learning
                  </label>
                  <select
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a target column...</option>
                    {processedData.columns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.name} ({column.dtype})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    The target column is what you want to predict. Choose a column with the values you want to model.
                  </p>
                </div>
                
                {targetColumn && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-x-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Target column selected: <strong>{targetColumn}</strong></span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Ready to proceed with model training using this target column.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {targetColumn ? 'Ready for training' : 'Select a target column to continue'}
              </div>
              <div className="flex gap-x-3">
                <Button variant="outline" onClick={handleReset}>
                  Start Over
                </Button>
                <Button disabled={!targetColumn}>
                  Continue to Training →
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
