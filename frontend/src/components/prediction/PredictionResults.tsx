'use client';

import React from 'react';
import { Download, BarChart3, TrendingUp, Info, Clock, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PredictionResult, SinglePredictionResult } from '@/store/slices/predictionSlice';

interface PredictionResultsProps {
  results: PredictionResult | null;
  singleResult: SinglePredictionResult | null;
  onDownloadResults?: () => void;
  onStartNewPrediction?: () => void;
}

export function PredictionResults({
  results,
  singleResult,
  onDownloadResults,
  onStartNewPrediction,
}: PredictionResultsProps) {
  
  const handleDownloadCSV = () => {
    if (!results?.output_csv) return;
    
    const blob = new Blob([results.output_csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `predictions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    onDownloadResults?.();
  };

  const formatNumber = (num: number): string => {
    if (Math.abs(num) < 0.001) return num.toExponential(3);
    if (Math.abs(num) < 1) return num.toFixed(4);
    if (Math.abs(num) < 100) return num.toFixed(3);
    return num.toFixed(1);
  };

  const getTaskTypeColor = (taskType: string) => {
    return taskType === 'classification' ? 'text-green-600' : 'text-blue-600';
  };

  const getTaskTypeBg = (taskType: string) => {
    return taskType === 'classification' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200';
  };

  // Render single prediction result
  if (singleResult && singleResult.success) {
    const metadata = singleResult.model_metadata;
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Prediction Result</h3>
              <p className="text-sm text-gray-600">Single value prediction</p>
            </div>
          </div>
          <Button onClick={onStartNewPrediction}>
            New Prediction
          </Button>
        </div>

        {/* Single Prediction Value */}
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-blue-50 border-4 border-blue-200 mb-4">
            <span className="text-3xl font-bold text-blue-700">
              {formatNumber(singleResult.prediction!)}
            </span>
          </div>
          
          {metadata && (
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                {metadata.model_type.toUpperCase()} Prediction
              </p>
              <p className="text-sm text-gray-600">
                Task: <span className={getTaskTypeColor(metadata.task_type)}>{metadata.task_type}</span> • 
                Training Score: {formatNumber(metadata.training_score)}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render batch prediction results
  if (!results || !results.success) {
    return null;
  }

  const stats = results.prediction_stats!;
  const metadata = results.model_metadata!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-green-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Prediction Results</h3>
            <p className="text-sm text-gray-600">
              {stats.count} predictions made using {results.prediction_method?.toUpperCase()} model
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadCSV}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
          <Button onClick={onStartNewPrediction}>
            New Prediction
          </Button>
        </div>
      </div>

      {/* Model Information */}
      <div className={`p-4 rounded-lg border ${getTaskTypeBg(metadata.task_type)}`}>
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-900">Model Information</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Model Type</p>
            <p className="font-medium">{metadata.model_type.toUpperCase()}</p>
          </div>
          <div>
            <p className="text-gray-600">Task Type</p>
            <p className={`font-medium ${getTaskTypeColor(metadata.task_type)}`}>
              {metadata.task_type}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Target Column</p>
            <p className="font-medium">{metadata.target_column}</p>
          </div>
          <div>
            <p className="text-gray-600">Training Score</p>
            <p className="font-medium">{formatNumber(metadata.training_score)}</p>
          </div>
        </div>
      </div>

      {/* Prediction Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-900">Prediction Statistics</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Count</p>
            <p className="text-xl font-bold text-gray-900">{stats.count}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600">Mean</p>
            <p className="text-xl font-bold text-blue-700">{formatNumber(stats.mean)}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">Std Dev</p>
            <p className="text-xl font-bold text-green-700">{formatNumber(stats.std)}</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-600">Min</p>
            <p className="text-xl font-bold text-orange-700">{formatNumber(stats.min)}</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600">Max</p>
            <p className="text-xl font-bold text-purple-700">{formatNumber(stats.max)}</p>
          </div>
        </div>

        {/* Additional stats for classification */}
        {metadata.task_type === 'classification' && stats.unique_predictions && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-700">
              <span className="font-medium">Unique Predictions:</span> {stats.unique_predictions}
            </p>
          </div>
        )}
      </div>

      {/* Input Data Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-700">Input Data</span>
        </div>
        <div className="flex gap-4 text-sm text-gray-600">
          <span>
            <span className="font-medium">Shape:</span> {results.input_shape?.[0]} × {results.input_shape?.[1]}
          </span>
          <span>
            <span className="font-medium">Method:</span> {results.prediction_method?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-green-800 font-medium">Prediction Completed Successfully</span>
        </div>
        <p className="text-green-700 text-sm mt-1">{results.message}</p>
      </div>
    </div>
  );
}