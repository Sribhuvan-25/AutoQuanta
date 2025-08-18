'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Plus, FolderOpen, Upload, BarChart3, Brain, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/common/FileUpload';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppSelector } from '@/store/hooks';
import { selectIsProcessing, selectProcessingStage, selectCurrentDataset } from '@/store/slices/dataSlice';

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastModified: string;
  fileCount: number;
  status: 'active' | 'archived';
}

export default function ProjectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: 'Sample Project',
      description: 'A sample project to get you started',
      createdAt: '2024-01-15',
      lastModified: '2024-01-15',
      fileCount: 2,
      status: 'active'
    }
  ]);

  // Redux state
  const isProcessing = useAppSelector(selectIsProcessing);
  const processingStage = useAppSelector(selectProcessingStage);
  const currentDataset = useAppSelector(selectCurrentDataset);

  const handleFileSelect = useCallback((filePath: string, fileInfo?: { name: string; size: number; type: string }) => {
    console.log('File selected:', filePath, fileInfo);
    
    // Store file info in sessionStorage for the EDA page to pick up
    if (fileInfo) {
      sessionStorage.setItem('uploadedFile', JSON.stringify({
        path: filePath,
        name: fileInfo.name,
        size: fileInfo.size,
        type: fileInfo.type,
        uploadedAt: new Date().toISOString()
      }));
    }
  }, []);

  const handleProcessingComplete = useCallback((processedData: unknown) => {
    console.log('File processing completed:', processedData);
    // Navigate to EDA page once processing is complete
    router.push('/eda');
  }, [router]);

  const handleFileError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    console.error('File upload error:', errorMessage);
  }, []);

  const handleValidationFailed = useCallback((errors: string[]) => {
    setError(errors[0] || 'File validation failed');
    console.error('File validation failed:', errors);
  }, []);

  const quickActions = [
    {
      icon: BarChart3,
      title: 'Data Explorer',
      description: 'Analyze and explore your data',
      href: '/eda',
      color: 'text-blue-600 bg-blue-50'
    },
    {
      icon: Brain,
      title: 'Train Models',
      description: 'Train machine learning models',
      href: '/train',
      color: 'text-purple-600 bg-purple-50'
    },
    {
      icon: Zap,
      title: 'Make Predictions',
      description: 'Use trained models for predictions',
      href: '/predict',
      color: 'text-green-600 bg-green-50'
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-1">Manage your data science projects and files</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* File Upload Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-x-3 mb-4">
            <Upload className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Upload Data</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Upload a CSV file to start analyzing your data and training models.
          </p>
          
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="text-xs text-red-500 hover:text-red-700 mt-1"
              >
                Dismiss
              </button>
            </div>
          )}
          
          <FileUpload
            onFileSelect={handleFileSelect}
            onError={handleFileError}
            onValidationFailed={handleValidationFailed}
            onProcessingComplete={handleProcessingComplete}
            title="Upload CSV File"
            description={isProcessing 
              ? `Processing file: ${processingStage}...` 
              : "Drag and drop your CSV file here or click to browse"
            }
            acceptedExtensions={['csv']}
            maxSizeBytes={50 * 1024 * 1024} // 50MB
            disabled={isProcessing}
            autoProcess={true}
          />

          {/* Data Processing Status */}
          {currentDataset && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <p className="text-sm text-green-700 font-medium">
                  Data processed successfully: {currentDataset.fileName}
                </p>
              </div>
              <p className="text-xs text-green-600 mt-1">
                {currentDataset.metadata.rowCount.toLocaleString()} rows × {currentDataset.metadata.columnCount} columns
              </p>
              <div className="mt-2">
                <Button 
                  size="sm" 
                  onClick={() => router.push('/eda')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  View Data →
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-x-3">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
            <Link href="/project" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-x-3">
                  <FolderOpen className="h-5 w-5 text-gray-400" />
                  <div>
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-600">{project.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{project.fileCount} files</p>
                    <p className="text-xs text-gray-500">Modified {project.lastModified}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Getting Started Guide */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">Getting Started</h2>
          <div className="space-y-3 text-sm text-blue-800">
            <p>1. <strong>Upload your data:</strong> Start by uploading a CSV file using the upload area above.</p>
            <p>2. <strong>Explore your data:</strong> Use the Data Explorer to understand your data structure and patterns.</p>
            <p>3. <strong>Train models:</strong> Automatically train and compare multiple machine learning models.</p>
            <p>4. <strong>Make predictions:</strong> Use your trained models to make predictions on new data.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
