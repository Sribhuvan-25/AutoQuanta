'use client';

import React, { useState } from 'react';
import { FileUpload } from '@/components/common/FileUpload';
import { DataTable } from '@/components/data/DataTable';
import { ColumnCard } from '@/components/data/ColumnCard';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { ColumnInfo } from '@/lib/types';
import { AppLayout } from '@/components/layout/AppLayout';

// Mock data for demonstration
const mockData = [
  ['ID', 'Name', 'Age', 'Income', 'Category', 'Score'],
  ['1', 'John Doe', '25', '50000', 'A', '85.5'],
  ['2', 'Jane Smith', '30', '60000', 'B', '92.3'],
  ['3', 'Bob Johnson', '35', '75000', 'A', '78.9'],
  ['4', 'Alice Brown', '28', '55000', 'C', '88.1'],
  ['5', 'Charlie Wilson', '32', '65000', 'B', '91.2'],
];

const mockColumns: ColumnInfo[] = [
  {
    name: 'ID',
    dtype: 'int64',
    missing_count: 0,
    missing_percentage: 0,
    unique_count: 5,
    unique_percentage: 100,
    memory_usage: 40,
    stats: { min: 1, max: 5, mean: 3, std: 1.58 },
    warnings: ['All values are unique - consider if this is an ID column']
  },
  {
    name: 'Name',
    dtype: 'object',
    missing_count: 0,
    missing_percentage: 0,
    unique_count: 5,
    unique_percentage: 100,
    memory_usage: 320,
    stats: { top_categories: [
      { value: 'John Doe', count: 1 },
      { value: 'Jane Smith', count: 1 },
      { value: 'Bob Johnson', count: 1 }
    ]},
    warnings: []
  },
  {
    name: 'Age',
    dtype: 'int64',
    missing_count: 0,
    missing_percentage: 0,
    unique_count: 5,
    unique_percentage: 100,
    memory_usage: 40,
    stats: { min: 25, max: 35, mean: 30, std: 3.54 },
    warnings: []
  },
  {
    name: 'Income',
    dtype: 'int64',
    missing_count: 0,
    missing_percentage: 0,
    unique_count: 5,
    unique_percentage: 100,
    memory_usage: 40,
    stats: { min: 50000, max: 75000, mean: 61000, std: 8944.27 },
    warnings: []
  },
  {
    name: 'Category',
    dtype: 'object',
    missing_count: 0,
    missing_percentage: 0,
    unique_count: 3,
    unique_percentage: 60,
    memory_usage: 48,
    stats: { top_categories: [
      { value: 'A', count: 2 },
      { value: 'B', count: 2 },
      { value: 'C', count: 1 }
    ]},
    warnings: []
  },
  {
    name: 'Score',
    dtype: 'float64',
    missing_count: 0,
    missing_percentage: 0,
    unique_count: 5,
    unique_percentage: 100,
    memory_usage: 40,
    stats: { min: 78.9, max: 92.3, mean: 87.2, std: 5.23 },
    warnings: []
  }
];

const mockWarnings = [
  { type: 'warning' as const, message: 'ID column detected - consider dropping for ML training', column: 'ID' },
  { type: 'info' as const, message: 'All columns have complete data (no missing values)', column: undefined },
  { type: 'info' as const, message: 'Dataset appears suitable for both classification and regression tasks', column: undefined }
];

export default function EDAPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [targetColumn, setTargetColumn] = useState<string>('');

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
    setDataLoaded(true);
    // In a real app, this would trigger data profiling
  };

  const handleTargetSelect = (columnName: string) => {
    setTargetColumn(columnName);
  };

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

        {/* File Upload */}
        {!dataLoaded && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <FileUpload
              onFileSelect={handleFileSelect}
              title="Upload CSV File"
              description="Drag and drop your CSV file here or click to browse"
            />
          </div>
        )}

        {/* Data Overview */}
        {dataLoaded && (
          <div className="space-y-6">
            {/* File Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Data Overview</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedFile} • {mockData.length - 1} rows • {mockData[0].length} columns
                  </p>
                </div>
                <Button variant="outline" onClick={() => setDataLoaded(false)}>
                  Upload New File
                </Button>
              </div>
            </div>

            {/* Warnings */}
            {mockWarnings.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality Warnings</h3>
                <div className="space-y-3">
                  {mockWarnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-x-3">
                      {warning.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />}
                      {warning.type === 'info' && <Info className="h-5 w-5 text-blue-500 mt-0.5" />}
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{warning.message}</p>
                        {warning.column && (
                          <p className="text-xs text-gray-500 mt-1">Column: {warning.column}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Preview */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Preview</h3>
              <DataTable data={mockData} maxRows={100} />
            </div>

            {/* Column Statistics */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Column Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockColumns.map((column) => (
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
                    Select Target Column
                  </label>
                  <select
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a target column...</option>
                    {mockColumns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.name} ({column.dtype})
                      </option>
                    ))}
                  </select>
                </div>
                
                {targetColumn && (
                  <div className="flex items-center gap-x-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Target column selected: {targetColumn}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Continue Button */}
            <div className="flex justify-end">
              <Button disabled={!targetColumn}>
                Continue to Training
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
