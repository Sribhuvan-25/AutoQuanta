'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from '@/components/common/FileUpload';
import { DataTable } from '@/components/data/DataTable';
import { AdvancedColumnCard } from '@/components/data/AdvancedColumnCard';
import { ColumnDistribution } from '@/components/data/ColumnDistribution';
import { CorrelationHeatmap } from '@/components/data/CorrelationHeatmap';
import { DataQualityReport } from '@/components/data/DataQualityReport';
import { Button } from '@/components/ui/button';
import { DataProcessingIndicator } from '@/components/ui/loading';
import { AlertTriangle, CheckCircle, Info, Download } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { 
  selectCurrentDataset, 
  selectIsProcessing, 
  selectProcessingStage, 
  selectProcessingProgress,
  selectDataError,
  selectDataWarnings,
  setTargetColumn as setDataTargetColumn,
  selectTargetColumn,
  processCSVFile,
  clearCurrentDataset,
  selectStatisticalSummary,
  selectQualityReport,
  selectAdvancedColumns
} from '@/store/slices/dataSlice';


export default function EDAPage() {
  const dispatch = useAppDispatch();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Redux selectors
  const currentDataset = useAppSelector(selectCurrentDataset);
  const isProcessing = useAppSelector(selectIsProcessing);
  const processingStage = useAppSelector(selectProcessingStage);
  const processingProgress = useAppSelector(selectProcessingProgress);
  const dataError = useAppSelector(selectDataError);
  const dataWarnings = useAppSelector(selectDataWarnings);
  const targetColumn = useAppSelector(selectTargetColumn);
  const statisticalSummary = useAppSelector(selectStatisticalSummary);
  const qualityReport = useAppSelector(selectQualityReport);
  const advancedColumns = useAppSelector(selectAdvancedColumns);

  // Handle file selection through Redux
  const handleFileSelect = useCallback(async (filePath: string, fileInfo?: { name: string; size: number; type: string }) => {
    try {
      if (fileInfo) {
        await dispatch(processCSVFile({ filePath, fileInfo }));
      }
    } catch (error) {
      console.error('Error processing file:', error);
    }
  }, [dispatch]);

  // Check for uploaded file on page load (fallback for sessionStorage)
  useEffect(() => {
    const uploadedFileData = sessionStorage.getItem('uploadedFile');
    if (uploadedFileData && !currentDataset && !isProcessing) {
      try {
        const fileInfo = JSON.parse(uploadedFileData);
        console.log('Auto-processing uploaded file from sessionStorage:', fileInfo);
        
        // Auto-start processing the uploaded file through Redux
        dispatch(processCSVFile({ 
          filePath: fileInfo.path, 
          fileInfo: {
            name: fileInfo.name,
            size: fileInfo.size,
            type: fileInfo.type
          }
        }));
        
        // Clear from session storage after initiating processing
        sessionStorage.removeItem('uploadedFile');
      } catch (error) {
        console.error('Error processing uploaded file data:', error);
        sessionStorage.removeItem('uploadedFile');
      }
    }
  }, [currentDataset, isProcessing, dispatch]);

  const handleFileUploadError = useCallback((error: string) => {
    setValidationErrors([error]);
  }, []);

  const handleValidationFailed = useCallback((errors: string[]) => {
    setValidationErrors(errors);
  }, []);

  const handleTargetSelect = useCallback((columnName: string) => {
    dispatch(setDataTargetColumn(columnName));
  }, [dispatch]);

  const handleReset = useCallback(() => {
    dispatch(clearCurrentDataset());
    setValidationErrors([]);
  }, [dispatch]);

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
        {!currentDataset && !isProcessing && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <FileUpload
              onFileSelect={handleFileSelect}
              onError={handleFileUploadError}
              onValidationFailed={handleValidationFailed}
              title="Upload CSV File"
              description="Drag and drop your CSV file here or click to browse"
              disabled={isProcessing}
              autoProcess={false}
            />
          </div>
        )}

        {/* Loading State */}
        {isProcessing && (
          <DataProcessingIndicator
            stage={processingStage as 'uploading' | 'parsing' | 'validating' | 'profiling' | 'completed' | 'error'}
            progress={processingProgress}
            message={`Processing CSV file: ${processingStage}...`}
          />
        )}

        {/* Error State */}
        {dataError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold text-red-900">Processing Failed</h3>
            </div>
            <p className="text-sm text-red-700 mb-4">{dataError}</p>
            <Button onClick={handleReset} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Data Overview */}
        {currentDataset && !isProcessing && (
          <div className="space-y-6">
            {/* File Info */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Data Overview</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {currentDataset.fileName} • {currentDataset.metadata.rowCount.toLocaleString()} rows • {currentDataset.metadata.columnCount} columns
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    File size: {(currentDataset.metadata.fileSize / 1024).toFixed(1)} KB
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
            {(dataWarnings.length > 0 || currentDataset.warnings.length > 0) && (
              <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality Insights</h3>
                <div className="space-y-3">
                  {[...dataWarnings, ...currentDataset.warnings].map((warning, index) => (
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
            <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Data Preview</h3>
                <div className="text-xs text-gray-500">
                  Showing first {Math.min(100, currentDataset.rows.length)} rows
                </div>
              </div>
              <DataTable data={currentDataset.data} maxRows={100} />
            </div>

            {/* Data Quality Report */}
            {qualityReport && statisticalSummary && (
              <DataQualityReport 
                qualityReport={qualityReport}
                statisticalSummary={statisticalSummary}
              />
            )}

            {/* Advanced Column Analysis */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Column Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(advancedColumns || currentDataset.columns).map((column) => (
                  <AdvancedColumnCard
                    key={column.name}
                    column={column}
                    isSelected={targetColumn === column.name}
                    onSelect={() => handleTargetSelect(column.name)}
                  />
                ))}
              </div>
            </div>

            {/* Data Visualizations */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Visualizations</h3>
              
              {/* Column Distributions */}
              <div className="mb-8">
                <h4 className="text-md font-medium text-gray-800 mb-4">Column Distributions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentDataset.columns.slice(0, 6).map((column) => (
                    <div key={column.name} className="bg-gray-50 rounded-lg p-4">
                      <ColumnDistribution 
                        column={column} 
                        data={currentDataset.data}
                      />
                    </div>
                  ))}
                </div>
                {currentDataset.columns.length > 6 && (
                  <div className="text-center mt-4">
                    <Button variant="outline" size="sm">
                      Show All Distributions ({currentDataset.columns.length - 6} more)
                    </Button>
                  </div>
                )}
              </div>

              {/* Correlation Analysis */}
              <div>
                <h4 className="text-md font-medium text-gray-800 mb-4">Correlation Analysis</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <CorrelationHeatmap data={currentDataset.data} />
                </div>
              </div>
            </div>

            {/* Target Selection */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Column Selection</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Target Column for Machine Learning
                  </label>
                  <select
                    value={targetColumn || ''}
                    onChange={(e) => handleTargetSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a target column...</option>
                    {currentDataset.columns.map((column) => (
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
