'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus, Clock, FileText } from 'lucide-react';
import { tauriAPI } from '@/lib/tauri';
import { AppLayout } from '@/components/layout/AppLayout';

export default function ProjectPage() {
  const [isCreating, setIsCreating] = useState(false);

  const handleOpenProject = async () => {
    const projectPath = await tauriAPI.openProject();
    if (projectPath) {
      console.log('Project opened:', projectPath);
      // In a real app, this would set the current project
    }
  };

  const handleCreateProject = async () => {
    setIsCreating(true);
    // In a real app, this would open a folder picker and create project structure
    setTimeout(() => setIsCreating(false), 1000);
  };

  // Mock recent projects
  const recentProjects = [
    {
      name: 'Customer Analysis',
      path: '/Users/user/projects/customer-analysis',
      lastModified: '2024-01-15',
      dataFiles: 3,
      models: 2
    },
    {
      name: 'Sales Prediction',
      path: '/Users/user/projects/sales-prediction',
      lastModified: '2024-01-10',
      dataFiles: 1,
      models: 1
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
          <p className="text-gray-600 mt-1">
            Create new projects or open existing ones to organize your data and models.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button onClick={handleCreateProject} disabled={isCreating}>
            <Plus className="h-4 w-4 mr-2" />
            {isCreating ? 'Creating...' : 'Create New Project'}
          </Button>
          <Button variant="outline" onClick={handleOpenProject}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Open Existing Project
          </Button>
        </div>

        {/* Recent Projects */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Projects</h2>
          {recentProjects.length > 0 ? (
            <div className="space-y-4">
              {recentProjects.map((project, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center gap-x-4">
                    <div className="flex-shrink-0">
                      <FolderOpen className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">{project.path}</p>
                      <div className="flex items-center gap-x-4 mt-1 text-xs text-gray-400">
                        <div className="flex items-center gap-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Modified {project.lastModified}</span>
                        </div>
                        <div className="flex items-center gap-x-1">
                          <FileText className="h-3 w-3" />
                          <span>{project.dataFiles} data files, {project.models} models</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Open
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p>No recent projects</p>
              <p className="text-sm">Create or open a project to get started</p>
            </div>
          )}
        </div>

        {/* Project Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Project</h2>
          <div className="text-center py-8 text-gray-500">
            <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>No project currently open</p>
            <p className="text-sm">Open a project to start working with data</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
