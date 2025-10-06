'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Brain, Zap, BarChart3, FolderOpen, Upload, Plus, Activity, Clock, Database, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppSelector } from '@/store/hooks';
import { selectCurrentProject } from '@/store/slices/projectSlice';
import { selectCurrentDataset, selectIsProcessing } from '@/store/slices/dataSlice';
import { selectIsTraining, selectTrainingProgress, selectTrainingStage, selectBestModel } from '@/store/slices/trainingSlice';

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: number;
  updated_at: number;
  files?: { name: string; path: string }[];
  status: string;
}

export default function Home() {
  const router = useRouter();
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Redux state
  const currentProject = useAppSelector(selectCurrentProject);
  const currentDataset = useAppSelector(selectCurrentDataset);
  const isProcessing = useAppSelector(selectIsProcessing);
  const isTraining = useAppSelector(selectIsTraining);
  const trainingProgress = useAppSelector(selectTrainingProgress);
  const trainingStage = useAppSelector(selectTrainingStage);
  const bestModel = useAppSelector(selectBestModel);

  // Load recent projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch('http://localhost:8000/projects');
        const data = await response.json();
        if (data.success) {
          setRecentProjects(data.projects.slice(0, 3)); // Show only 3 recent
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    loadProjects();
  }, []);

  const quickActions = [
    {
      icon: Upload,
      title: 'Upload Data',
      description: 'Import CSV files',
      href: '/project',
      color: 'bg-gray-100'
    },
    {
      icon: BarChart3,
      title: 'Explore Data',
      description: 'Analyze datasets',
      href: '/eda',
      color: 'bg-gray-100'
    },
    {
      icon: Brain,
      title: 'Train Models',
      description: 'Build ML models',
      href: '/train',
      color: 'bg-gray-100'
    },
    {
      icon: Zap,
      title: 'Predictions',
      description: 'Make predictions',
      href: '/predict',
      color: 'bg-gray-100'
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-lg text-gray-600 mt-3">Welcome back to AutoQuanta</p>
        </div>

        {/* Current Project / No Project State */}
        {currentProject ? (
          <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-100 rounded-xl border border-gray-200">
                  <FolderOpen className="h-6 w-6 text-gray-900" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{currentProject.metadata.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">{currentProject.metadata.description || 'No description'}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Database className="h-4 w-4" />
                      Project Data
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      ML Models
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Modified {new Date(currentProject.metadata.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <Button onClick={() => router.push('/project')} variant="outline" className="rounded-xl">
                Manage Project
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-8 text-center">
            <div className="p-4 bg-gray-100 rounded-2xl border border-gray-200 inline-flex mb-4">
              <FolderOpen className="h-8 w-8 text-gray-900" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Project Loaded</h2>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              Create a new project or open an existing one to start working with your data
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => router.push('/project')} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
              <Button onClick={() => router.push('/project')} variant="outline" className="rounded-xl">
                Open Project
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white/40"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 ${action.color} rounded-xl border border-gray-200`}>
                    <action.icon className="h-6 w-6 text-gray-900" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm mb-1">{action.title}</h4>
                    <p className="text-xs text-gray-600">{action.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Active Status */}
        {(isTraining || isProcessing || currentDataset || bestModel) && (
          <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-xl border border-gray-200">
                <Activity className="h-5 w-5 text-gray-900" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Active Status</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isTraining && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Training</span>
                    <span className="text-sm text-gray-600">{trainingProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 transition-all duration-300"
                      style={{ width: `${trainingProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{trainingStage}</p>
                </div>
              )}
              {isProcessing && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">Processing...</p>
                </div>
              )}
              {currentDataset && !isProcessing && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-2">{currentDataset.fileName}</p>
                  <p className="text-xs text-gray-600 mb-3">
                    {currentDataset.metadata.rowCount.toLocaleString()} rows × {currentDataset.metadata.columnCount} cols
                  </p>
                  <Button size="sm" onClick={() => router.push('/eda')} className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl">
                    View Data
                  </Button>
                </div>
              )}
              {bestModel && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-1">Best Model</p>
                  <p className="text-xs text-gray-600 mb-1">{bestModel.model_name}</p>
                  <p className="text-xs text-gray-600 mb-3">
                    Score: {(bestModel.mean_score * 100).toFixed(2)}%
                  </p>
                  <Button size="sm" onClick={() => router.push('/models')} variant="outline" className="w-full rounded-xl">
                    View Models
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Projects */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Projects</h3>
            <Link href="/project" className="text-sm text-gray-700 hover:text-gray-900 font-medium">
              View all
            </Link>
          </div>

          {isLoadingProjects ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mr-3"></div>
              <span className="text-sm text-gray-600">Loading projects...</span>
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <div className="p-3 bg-gray-100 rounded-2xl border border-gray-200 inline-flex mb-3">
                <FolderOpen className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm">No projects yet. Create your first project to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg border border-gray-200">
                      <FolderOpen className="h-4 w-4 text-gray-900" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{project.name}</h4>
                      <p className="text-xs text-gray-600">{project.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs text-gray-600">
                      <p>{project.files?.length || 0} files</p>
                      <p>{new Date(project.updated_at * 1000).toLocaleDateString()}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="hover:bg-gray-100 rounded-lg">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
