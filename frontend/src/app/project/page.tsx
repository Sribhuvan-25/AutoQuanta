'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Plus, FolderOpen, Upload, BarChart3, Brain, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/common/FileUpload';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppSelector } from '@/store/hooks';
import { selectIsProcessing, selectProcessingStage, selectCurrentDataset } from '@/store/slices/dataSlice';
import { tauriAPI } from '@/lib/tauri';

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastModified: string;
  fileCount: number;
  status: 'active' | 'archived';
}

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New Project Modal state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedProjectDirectory, setSelectedProjectDirectory] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

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

  // Load projects from API
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8000/projects');
      const data = await response.json();
      
      if (data.success) {
        // Convert API format to frontend format
        const formattedProjects: Project[] = data.projects.map((proj: any) => ({
          id: proj.id,
          name: proj.name,
          description: proj.description,
          createdAt: new Date(proj.created_at * 1000).toISOString().split('T')[0],
          lastModified: new Date(proj.updated_at * 1000).toISOString().split('T')[0],
          fileCount: proj.files?.length || 0,
          status: proj.status as 'active' | 'archived'
        }));
        setProjects(formattedProjects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      setError('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Handle directory selection for project
  const handleSelectProjectDirectory = async () => {
    try {
      const directory = await tauriAPI.selectDirectory();
      if (directory) {
        setSelectedProjectDirectory(directory);
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
      setError('Failed to open directory picker');
    }
  };

  // Handle new project creation
  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }
    
    if (!selectedProjectDirectory) {
      setError('Please select a directory for the project');
      return;
    }

    setIsCreatingProject(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: projectName.trim(), 
          description: projectDescription.trim(),
          directory: selectedProjectDirectory
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Store project directory globally for all save operations
        localStorage.setItem('currentProjectDirectory', selectedProjectDirectory);
        localStorage.setItem('currentProjectId', data.project.id);
        localStorage.setItem('currentProjectName', projectName.trim());
        
        loadProjects(); // Refresh list
        
        // Reset modal state
        setShowNewProjectModal(false);
        setProjectName('');
        setProjectDescription('');
        setSelectedProjectDirectory(null);
        
        return data.project;
      } else {
        throw new Error(data.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      setError(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Create new project (legacy function for API compatibility)
  const createProject = useCallback(async (name: string, description: string) => {
    try {
      const response = await fetch('http://localhost:8000/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      
      const data = await response.json();
      if (data.success) {
        loadProjects(); // Refresh list
        return data.project;
      } else {
        throw new Error(data.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      setError(error instanceof Error ? error.message : 'Failed to create project');
      throw error;
    }
  }, [loadProjects]);

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
          <Button onClick={() => setShowNewProjectModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* File Upload Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm p-6">
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
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm p-6">
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
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
            <Link href="/project" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-600">Loading projects...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No projects yet. Create your first project to get started.</p>
              </div>
            ) : (
              projects.map((project) => (
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
              ))
            )}
          </div>
        </div>

        {/* Getting Started Guide */}
        <div className="bg-blue-50/80 backdrop-blur-sm rounded-lg border border-blue-200/50 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">Getting Started</h2>
          <div className="space-y-3 text-sm text-blue-800">
            <p>1. <strong>Upload your data:</strong> Start by uploading a CSV file using the upload area above.</p>
            <p>2. <strong>Explore your data:</strong> Use the Data Explorer to understand your data structure and patterns.</p>
            <p>3. <strong>Train models:</strong> Automatically train and compare multiple machine learning models.</p>
            <p>4. <strong>Make predictions:</strong> Use your trained models to make predictions on new data.</p>
          </div>
        </div>
        
        {/* New Project Modal */}
        {showNewProjectModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setProjectName('');
                    setProjectDescription('');
                    setSelectedProjectDirectory(null);
                    setError(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Error Display */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Project Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter project name"
                    disabled={isCreatingProject}
                  />
                </div>

                {/* Project Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter project description"
                    disabled={isCreatingProject}
                  />
                </div>

                {/* Directory Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Directory *
                  </label>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={handleSelectProjectDirectory}
                      disabled={isCreatingProject}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <FolderOpen className="h-4 w-4" />
                      {selectedProjectDirectory ? 'Change Directory' : 'Select Directory'}
                    </Button>
                    {selectedProjectDirectory && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 break-all">
                          <strong>Selected:</strong> {selectedProjectDirectory}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          All project data, models, and results will be saved here
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setProjectName('');
                    setProjectDescription('');
                    setSelectedProjectDirectory(null);
                    setError(null);
                  }}
                  disabled={isCreatingProject}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={!projectName.trim() || !selectedProjectDirectory || isCreatingProject}
                >
                  {isCreatingProject ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
