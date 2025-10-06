'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/data/DataTable';
import { AdvancedColumnCard } from '@/components/data/AdvancedColumnCard';
import { ColumnDistribution } from '@/components/data/ColumnDistribution';
import { CorrelationHeatmap } from '@/components/data/CorrelationHeatmap';
import { DataQualityReport } from '@/components/data/DataQualityReport';
import { Button } from '@/components/ui/button';
import { DataProcessingIndicator } from '@/components/ui/loading';
import { AlertTriangle, Info, Download, Upload } from 'lucide-react';
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
  profileCSVWithAPI,
  clearCurrentDataset,
  selectStatisticalSummary,
  selectQualityReport,
  selectAdvancedColumns
} from '@/store/slices/dataSlice';


export default function EDAPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
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

  // New API-based file upload handler
  const handleAPIFileUpload = useCallback(async (file: File) => {
    try {
      await dispatch(profileCSVWithAPI({ file }));
    } catch (error) {
      console.error('Error profiling file with API:', error);
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
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Data Explorer</h1>
          <p className="text-lg text-gray-600 mt-3 max-w-3xl">
            Upload and explore your CSV data to understand its structure and quality.
          </p>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-white/60 backdrop-blur-2xl border border-red-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Validation Errors</h3>
            </div>
            <ul className="list-disc list-inside space-y-2">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm text-gray-700">{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* File Upload */}
        {!currentDataset && !isProcessing && (
          <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-8">
            {/* Simple API-based file upload */}
            <div className="text-center">
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleAPIFileUpload(file);
                    }
                  }}
                  className="hidden"
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer">
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-gray-100 rounded-2xl border border-gray-200 mb-6">
                      <Upload className="h-12 w-12 text-gray-900" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Upload CSV File</h3>
                    <p className="text-gray-600 mb-6 max-w-md">
                      Click to select your CSV file for analysis
                    </p>
                    <Button type="button" size="lg">
                      Choose File
                    </Button>
                  </div>
                </label>
              </div>
            </div>
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
          <div className="bg-white/60 backdrop-blur-2xl border border-red-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Processing Failed</h3>
                <p className="text-sm text-gray-600 mt-2">{dataError}</p>
              </div>
            </div>
            <Button onClick={handleReset} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Data Overview */}
        {currentDataset && !isProcessing && (
          <div className="space-y-6">
            {/* File Info */}
            <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Data Overview</h2>
                  <p className="text-sm text-gray-600 mt-2">
                    {currentDataset.fileName} • {currentDataset.metadata.rowCount.toLocaleString()} rows • {currentDataset.metadata.columnCount} columns
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    File size: {(currentDataset.metadata.fileSize / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="flex gap-3">
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
              <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Data Quality Insights</h3>
                <div className="space-y-4">
                  {[...dataWarnings, ...currentDataset.warnings].map((warning, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        {warning.type === 'warning' && <AlertTriangle className="h-5 w-5 text-orange-600" />}
                        {warning.type === 'info' && <Info className="h-5 w-5 text-gray-700" />}
                        {warning.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 font-medium">{warning.message}</p>
                        {warning.column && (
                          <p className="text-xs text-gray-600 mt-1">Column: {warning.column}</p>
                        )}
                        {warning.suggestion && (
                          <p className="text-xs text-gray-700 mt-2">💡 {warning.suggestion}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Preview */}
            <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Data Preview</h3>
                <div className="text-sm text-gray-600">
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
            <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Advanced Column Analysis</h3>
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
            <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Data Visualizations</h3>

              {/* Column Distributions */}
              <div className="mb-8">
                <h4 className="text-base font-semibold text-gray-900 mb-5">Column Distributions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentDataset.columns.slice(0, 6).map((column) => (
                    <div key={column.name} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                      <ColumnDistribution
                        column={column}
                        data={currentDataset.data}
                      />
                    </div>
                  ))}
                </div>
                {currentDataset.columns.length > 6 && (
                  <div className="text-center mt-6">
                    <Button variant="outline" size="sm">
                      Show All Distributions ({currentDataset.columns.length - 6} more)
                    </Button>
                  </div>
                )}
              </div>

              {/* Correlation Analysis */}
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-5">Correlation Analysis</h4>
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <CorrelationHeatmap data={currentDataset.data} />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Data analysis complete. Proceed to training to select target column and configure models.
              </div>
              <div className="flex gap-x-3">
                <Button variant="outline" onClick={handleReset}>
                  Start Over
                </Button>
                <Button 
                  onClick={() => router.push('/train')}
                >
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
