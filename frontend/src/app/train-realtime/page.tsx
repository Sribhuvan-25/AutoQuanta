'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RealTimeTrainingMonitor } from '@/components/training/RealTimeTrainingMonitor';
import { Button } from '@/components/ui/button';
import { Play, Upload, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RealtimeTrainingPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStartingTraining, setIsStartingTraining] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [trainingConfig, setTrainingConfig] = useState({
    target_column: '',
    task_type: 'classification' as 'classification' | 'regression',
    models_to_try: ['random_forest'],
    cv_folds: 5,
    test_size: 0.2
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleStartTraining = async () => {
    if (!selectedFile || !trainingConfig.target_column) {
      alert('Please select a file and specify target column');
      return;
    }

    try {
      setIsStartingTraining(true);

      const formData = new FormData();
      formData.append('csv_file', selectedFile);
      formData.append('config', JSON.stringify(trainingConfig));

      const response = await fetch('http://localhost:8000/train_async', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to start training');
      }

      const result = await response.json();

      if (result.success && result.session_id) {
        setSessionId(result.session_id);
      } else {
        throw new Error('No session ID returned');
      }
    } catch (error) {
      console.error('Failed to start training:', error);
      alert('Failed to start training: ' + (error as Error).message);
    } finally {
      setIsStartingTraining(false);
    }
  };

  const handleTrainingComplete = (data: any) => {
    console.log('Training completed:', data);
    alert('Training completed successfully!');
  };

  const handleTrainingError = (error: string) => {
    console.error('Training error:', error);
    alert('Training error: ' + error);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Real-Time Training Monitor</h1>
          <p className="text-gray-600 mt-1">
            Train models with live progress updates via Server-Sent Events
          </p>
        </div>

        {/* Configuration Card */}
        {!sessionId && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Configuration</h2>

            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                  {selectedFile && (
                    <span className="text-sm text-gray-600 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {selectedFile.name}
                    </span>
                  )}
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Target Column */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Column
                </label>
                <input
                  type="text"
                  value={trainingConfig.target_column}
                  onChange={(e) => setTrainingConfig({ ...trainingConfig, target_column: e.target.value })}
                  placeholder="e.g., price, category, label"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Task Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Type
                </label>
                <select
                  value={trainingConfig.task_type}
                  onChange={(e) => setTrainingConfig({ ...trainingConfig, task_type: e.target.value as 'classification' | 'regression' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="classification">Classification</option>
                  <option value="regression">Regression</option>
                </select>
              </div>

              {/* Models */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Models to Try
                </label>
                <select
                  multiple
                  value={trainingConfig.models_to_try}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setTrainingConfig({ ...trainingConfig, models_to_try: selected });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  size={4}
                >
                  <option value="random_forest">Random Forest</option>
                  <option value="xgboost">XGBoost</option>
                  <option value="lightgbm">LightGBM</option>
                  <option value="logistic_regression">Logistic Regression</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>
              </div>

              {/* Start Button */}
              <Button
                onClick={handleStartTraining}
                disabled={!selectedFile || !trainingConfig.target_column || isStartingTraining}
                className="w-full"
              >
                {isStartingTraining ? (
                  <>Starting Training...</>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Training
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Real-Time Monitor */}
        {sessionId && (
          <RealTimeTrainingMonitor
            sessionId={sessionId}
            onComplete={handleTrainingComplete}
            onError={handleTrainingError}
            showControls={false}
          />
        )}

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">How it works</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Upload a CSV file and configure your training parameters</li>
            <li>Training runs asynchronously on the backend with real-time progress updates</li>
            <li>Monitor live metrics, progress, and logs via Server-Sent Events (SSE)</li>
            <li>View detailed training logs with filtering and search capabilities</li>
          </ul>
        </div>

        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.push('/train')}
        >
          Back to Regular Training
        </Button>
      </div>
    </AppLayout>
  );
}
