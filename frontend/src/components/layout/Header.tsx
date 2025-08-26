'use client';

import React, { useState } from 'react';
import { Menu, Settings, HelpCircle, Folder, FolderOpen, Plus, ChevronDown, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectCreationWizard } from '@/components/project/ProjectCreationWizard';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectCurrentProject,
  selectRecentProjects,
  selectProjectLoadingStates,
  createNewProject,
  loadProject,
  showCreateWizard,
  hideCreateWizard,
  selectShowCreateWizard,
} from '@/store/slices/projectSlice';
import { tauriAPI } from '@/lib/tauri';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const dispatch = useAppDispatch();
  const currentProject = useAppSelector(selectCurrentProject);
  const recentProjects = useAppSelector(selectRecentProjects);
  const showWizard = useAppSelector(selectShowCreateWizard);
  const loadingStates = useAppSelector(selectProjectLoadingStates);

  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  const handleCreateNewProject = () => {
    dispatch(showCreateWizard());
  };

  const handleOpenProject = async () => {
    try {
      const projectFile = await tauriAPI.selectProjectFile();
      if (projectFile) {
        const projectPath = projectFile.replace('/project.json', '');
        dispatch(loadProject(projectPath));
      }
    } catch (error) {
      console.error('Failed to open project:', error);
    }
  };

  const handleSelectRecentProject = (projectPath: string) => {
    dispatch(loadProject(projectPath));
    setShowProjectDropdown(false);
  };

  const handleProjectCreated = (projectConfig: any) => {
    dispatch(hideCreateWizard());
    // Project will be automatically loaded via the Redux action
  };

  const formatProjectPath = (path: string) => {
    const parts = path.split('/');
    return parts.slice(-2).join('/');
  };

  return (
    <>
      <header className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-x-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={onMenuClick}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </Button>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

          {/* App title and project management */}
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center gap-x-4 lg:gap-x-6">
              <div className="flex items-center gap-x-2">
                <h1 className="text-lg font-semibold text-gray-900">AutoQuanta</h1>
                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                  Local-only
                </span>
              </div>
              
              {/* Project management section */}
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />
              <div className="hidden lg:flex lg:items-center lg:gap-x-3">
                {/* Project selector dropdown */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                    className="flex items-center gap-2"
                    disabled={loadingStates.isLoading}
                  >
                    {currentProject ? (
                      <>
                        <FolderOpen className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">
                          {currentProject.metadata.name}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        <Folder className="h-4 w-4" />
                        <span className="text-sm text-gray-500">Select Project</span>
                        <ChevronDown className="h-3 w-3" />
                      </>
                    )}
                  </Button>

                  {/* Dropdown menu */}
                  {showProjectDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="p-2">
                        {/* New project button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCreateNewProject}
                          className="w-full justify-start mb-1"
                          disabled={loadingStates.isCreating}
                        >
                          <Plus className="h-4 w-4 mr-2 text-green-600" />
                          Create New Project
                        </Button>

                        {/* Open project button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleOpenProject}
                          className="w-full justify-start mb-2"
                          disabled={loadingStates.isLoading}
                        >
                          <FolderOpen className="h-4 w-4 mr-2 text-blue-600" />
                          Open Project...
                        </Button>

                        {/* Recent projects */}
                        {recentProjects.length > 0 && (
                          <>
                            <div className="border-t border-gray-200 my-2"></div>
                            <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
                              Recent Projects
                            </div>
                            {recentProjects.slice(0, 5).map((project, index) => (
                              <Button
                                key={project.metadata.id}
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectRecentProject(project.metadata.projectPath)}
                                className="w-full justify-start text-left"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Folder className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                      {project.metadata.name}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                      {formatProjectPath(project.metadata.projectPath)}
                                    </div>
                                  </div>
                                </div>
                              </Button>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Current project info */}
                {currentProject && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>Modified {new Date(currentProject.metadata.lastModified).toLocaleDateString()}</span>
                    {currentProject.metadata.author && (
                      <>
                        <span className="text-gray-300">•</span>
                        <User className="h-3 w-3" />
                        <span>{currentProject.metadata.author}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            {/* Quick actions for project */}
            {currentProject && (
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500">
                  {formatProjectPath(currentProject.metadata.projectPath)}
                </div>
              </div>
            )}

            {/* Help button */}
            <Button variant="ghost" size="sm" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
              <span className="sr-only">View help</span>
              <HelpCircle className="h-6 w-6" aria-hidden="true" />
            </Button>

            {/* Settings button */}
            <Button variant="ghost" size="sm" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
              <span className="sr-only">Open settings</span>
              <Settings className="h-6 w-6" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Click outside to close dropdown */}
        {showProjectDropdown && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowProjectDropdown(false)}
          />
        )}
      </header>

      {/* Project Creation Wizard */}
      <ProjectCreationWizard
        isOpen={showWizard}
        onClose={() => dispatch(hideCreateWizard())}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
}
