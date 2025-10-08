/**
 * Enhanced Project slice for Redux store
 * Manages project creation, loading, and metadata with new project system
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { ProjectConfig, CreateProjectRequest, ProjectSummary } from '@/lib/project-types';
import { tauriAPI } from '@/lib/tauri';

// Enhanced State interface
interface ProjectState {
  // Current project
  currentProject: ProjectConfig | null;
  isProjectLoaded: boolean;
  
  // Recent projects
  recentProjects: ProjectSummary[];
  
  // Loading states
  isCreatingProject: boolean;
  isLoadingProject: boolean;
  isSavingProject: boolean;
  isValidatingProject: boolean;
  
  // Error handling
  error: string | null;
  
  // Project settings
  autoSave: boolean;
  lastSavedAt: string | null;
  
  // UI state
  showCreateWizard: boolean;
}

// Initial state
const initialState: ProjectState = {
  currentProject: null,
  isProjectLoaded: false,
  recentProjects: [],
  isCreatingProject: false,
  isLoadingProject: false,
  isSavingProject: false,
  isValidatingProject: false,
  error: null,
  autoSave: true,
  lastSavedAt: null,
  showCreateWizard: false,
};

// Load all projects from backend
export const loadProjects = createAsyncThunk(
  'project/loadAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('http://localhost:8000/projects');
      const data = await response.json();

      if (!data.success) {
        throw new Error('Failed to load projects');
      }

      return data.projects;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load projects');
    }
  }
);

// Enhanced async thunks for project operations
export const createNewProject = createAsyncThunk(
  'project/create',
  async (request: CreateProjectRequest, { rejectWithValue }) => {
    try {
      // Try Tauri first (for desktop app)
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const result = await tauriAPI.createProject(request);
        if (!result.success || !result.projectConfig) {
          throw new Error(result.error || 'Failed to create project');
        }
        return result.projectConfig;
      }

      // Fallback to backend API (for web)
      const response = await fetch('http://localhost:8000/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: request.name,
          description: request.description,
          directory: request.directory
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create project');
      }

      // Convert backend format to ProjectConfig format
      return {
        metadata: {
          id: data.project.id,
          name: data.project.name,
          description: data.project.description,
          createdAt: new Date(data.project.created_at * 1000).toISOString(),
          lastModified: new Date(data.project.updated_at * 1000).toISOString(),
          version: '1.0.0',
          projectPath: request.directory || `/projects/${data.project.id}`
        },
        structure: {
          projectPath: request.directory || `/projects/${data.project.id}`,
          dataPath: `${request.directory || `/projects/${data.project.id}`}/data`,
          modelsPath: `${request.directory || `/projects/${data.project.id}`}/models`,
          resultsPath: `${request.directory || `/projects/${data.project.id}`}/results`,
          predictionsPath: `${request.directory || `/projects/${data.project.id}`}/predictions`,
          exportsPath: `${request.directory || `/projects/${data.project.id}`}/exports`
        },
        settings: {
          defaultTaskType: 'classification',
          autoSaveResults: true,
          maxModelVersions: 10,
          dataValidationStrict: true,
          enableModelVersioning: true
        }
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create project');
    }
  }
);

export const loadProject = createAsyncThunk(
  'project/load',
  async (projectId: string, { rejectWithValue }) => {
    try {
      // Try Tauri first (for desktop app)
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const result = await tauriAPI.loadProject(projectId);
        if (!result.success || !result.projectConfig) {
          throw new Error(result.error || 'Failed to load project');
        }
        return result.projectConfig;
      }

      // Fallback to backend API (for web)
      const response = await fetch(`http://localhost:8000/projects`);
      const data = await response.json();

      if (!data.success) {
        throw new Error('Failed to load projects');
      }

      // Find the specific project
      const project = data.projects.find((p: any) => p.id === projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Convert backend format to ProjectConfig format
      return {
        metadata: {
          id: project.id,
          name: project.name,
          description: project.description || '',
          createdAt: new Date(project.created_at * 1000).toISOString(),
          lastModified: new Date(project.updated_at * 1000).toISOString(),
          version: '1.0.0',
          projectPath: `./projects/${project.id}`
        },
        structure: {
          projectPath: `./projects/${project.id}`,
          dataPath: `./projects/${project.id}/data`,
          modelsPath: `./projects/${project.id}/models`,
          resultsPath: `./projects/${project.id}/results`,
          predictionsPath: `./projects/${project.id}/predictions`,
          exportsPath: `./projects/${project.id}/exports`
        },
        settings: {
          defaultTaskType: 'classification',
          autoSaveResults: true,
          maxModelVersions: 10,
          dataValidationStrict: true,
          enableModelVersioning: true
        }
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load project');
    }
  }
);

export const validateProject = createAsyncThunk(
  'project/validate',
  async (projectPath: string, { rejectWithValue }) => {
    try {
      const result = await tauriAPI.validateProject(projectPath);
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to validate project');
    }
  }
);

export const getProjectSummary = createAsyncThunk(
  'project/summary',
  async (projectPath: string, { rejectWithValue }) => {
    try {
      const summary = await tauriAPI.getProjectSummary(projectPath);
      if (!summary) {
        throw new Error('Failed to get project summary');
      }
      return summary;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to get project summary');
    }
  }
);

// Enhanced project slice
const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    // Clear current project
    clearProject: (state) => {
      state.currentProject = null;
      state.isProjectLoaded = false;
      state.error = null;

      // Clear from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentProjectId');
        localStorage.removeItem('currentProjectName');
        localStorage.removeItem('currentProject');
      }
    },

    // Restore project from localStorage
    restoreProjectFromStorage: (state) => {
      if (typeof window !== 'undefined') {
        const savedProject = localStorage.getItem('currentProject');
        if (savedProject) {
          try {
            const project = JSON.parse(savedProject);
            state.currentProject = project;
            state.isProjectLoaded = true;
          } catch (error) {
            console.error('Failed to restore project from localStorage:', error);
          }
        }
      }
    },
    
    // Update project metadata
    updateProjectMetadata: (state, action: PayloadAction<Partial<ProjectConfig['metadata']>>) => {
      if (state.currentProject) {
        state.currentProject.metadata = { 
          ...state.currentProject.metadata, 
          ...action.payload,
          lastModified: new Date().toISOString()
        };
      }
    },
    
    // Update project settings
    updateProjectSettings: (state, action: PayloadAction<Partial<ProjectConfig['settings']>>) => {
      if (state.currentProject) {
        state.currentProject.settings = { 
          ...state.currentProject.settings, 
          ...action.payload 
        };
      }
    },
    
    // Show/hide create wizard
    showCreateWizard: (state) => {
      state.showCreateWizard = true;
      state.error = null;
    },
    
    hideCreateWizard: (state) => {
      state.showCreateWizard = false;
    },
    
    // Add to recent projects
    addToRecentProjects: (state, action: PayloadAction<ProjectSummary>) => {
      const existingIndex = state.recentProjects.findIndex(
        p => p.metadata.projectPath === action.payload.metadata.projectPath
      );
      
      if (existingIndex >= 0) {
        // Move to front if already exists
        state.recentProjects.splice(existingIndex, 1);
      }
      
      // Add to front and limit to 10 recent projects
      state.recentProjects.unshift(action.payload);
      state.recentProjects = state.recentProjects.slice(0, 10);
    },
    
    // Remove from recent projects
    removeFromRecentProjects: (state, action: PayloadAction<string>) => {
      state.recentProjects = state.recentProjects.filter(
        p => p.metadata.projectPath !== action.payload
      );
    },
    
    // Toggle auto-save
    toggleAutoSave: (state) => {
      state.autoSave = !state.autoSave;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Create project
    builder
      .addCase(createNewProject.pending, (state) => {
        state.isCreatingProject = true;
        state.error = null;
      })
      .addCase(createNewProject.fulfilled, (state, action) => {
        state.isCreatingProject = false;
        state.currentProject = action.payload;
        state.isProjectLoaded = true;
        state.error = null;
        state.showCreateWizard = false;

        // Store in localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentProjectId', action.payload.metadata.id);
          localStorage.setItem('currentProjectName', action.payload.metadata.name);
          localStorage.setItem('currentProject', JSON.stringify(action.payload));
        }

        // Create project summary for recent projects
        const projectSummary: ProjectSummary = {
          metadata: action.payload.metadata,
          stats: {
            totalModels: 0,
            totalPredictions: 0,
            totalDataFiles: 0,
          }
        };

        // Add to recent projects
        const existingIndex = state.recentProjects.findIndex(
          p => p.metadata.projectPath === action.payload.metadata.projectPath
        );
        if (existingIndex >= 0) {
          state.recentProjects.splice(existingIndex, 1);
        }
        state.recentProjects.unshift(projectSummary);
        state.recentProjects = state.recentProjects.slice(0, 10);
      })
      .addCase(createNewProject.rejected, (state, action) => {
        state.isCreatingProject = false;
        state.error = action.payload as string;
      });
    
    // Load project
    builder
      .addCase(loadProject.pending, (state) => {
        state.isLoadingProject = true;
        state.error = null;
      })
      .addCase(loadProject.fulfilled, (state, action) => {
        state.isLoadingProject = false;
        state.currentProject = action.payload;
        state.isProjectLoaded = true;
        state.error = null;

        // Store in localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentProjectId', action.payload.metadata.id);
          localStorage.setItem('currentProjectName', action.payload.metadata.name);
          localStorage.setItem('currentProject', JSON.stringify(action.payload));
        }

        // Create project summary for recent projects
        const projectSummary: ProjectSummary = {
          metadata: action.payload.metadata,
          stats: {
            totalModels: 0,
            totalPredictions: 0,
            totalDataFiles: 0,
          }
        };

        // Add to recent projects
        const existingIndex = state.recentProjects.findIndex(
          p => p.metadata.projectPath === action.payload.metadata.projectPath
        );
        if (existingIndex >= 0) {
          state.recentProjects.splice(existingIndex, 1);
        }
        state.recentProjects.unshift(projectSummary);
        state.recentProjects = state.recentProjects.slice(0, 10);
      })
      .addCase(loadProject.rejected, (state, action) => {
        state.isLoadingProject = false;
        state.error = action.payload as string;
      });
    
    // Validate project
    builder
      .addCase(validateProject.pending, (state) => {
        state.isValidatingProject = true;
        state.error = null;
      })
      .addCase(validateProject.fulfilled, (state, action) => {
        state.isValidatingProject = false;
        if (!action.payload.isValid) {
          state.error = `Project validation failed: ${action.payload.errors.join(', ')}`;
        }
      })
      .addCase(validateProject.rejected, (state, action) => {
        state.isValidatingProject = false;
        state.error = action.payload as string;
      });

    // Get project summary
    builder
      .addCase(getProjectSummary.pending, (state) => {
        // No loading state needed for this
      })
      .addCase(getProjectSummary.fulfilled, (state, action) => {
        // Update the project in recent projects with fresh stats
        const existingIndex = state.recentProjects.findIndex(
          p => p.metadata.projectPath === action.payload.metadata.projectPath
        );
        if (existingIndex >= 0) {
          state.recentProjects[existingIndex] = action.payload;
        }
      })
      .addCase(getProjectSummary.rejected, (state, action) => {
        // Silently fail for summary updates
        console.warn('Failed to update project summary:', action.payload);
      });

    // Load all projects
    builder
      .addCase(loadProjects.pending, (state) => {
        state.isLoadingProject = true;
        state.error = null;
      })
      .addCase(loadProjects.fulfilled, (state, action) => {
        state.isLoadingProject = false;
        // Convert projects to ProjectSummary format and update recent projects
        state.recentProjects = action.payload.map((project: any) => ({
          metadata: {
            id: project.id,
            name: project.name,
            description: project.description || '',
            createdAt: new Date(project.created_at * 1000).toISOString(),
            lastModified: new Date(project.updated_at * 1000).toISOString(),
            version: '1.0.0',
            projectPath: `./projects/${project.id}`
          },
          stats: {
            totalModels: project.models?.length || 0,
            totalPredictions: 0,
            totalDataFiles: project.files?.length || 0
          }
        }));
      })
      .addCase(loadProjects.rejected, (state, action) => {
        state.isLoadingProject = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  clearProject,
  restoreProjectFromStorage,
  updateProjectMetadata,
  updateProjectSettings,
  showCreateWizard,
  hideCreateWizard,
  addToRecentProjects,
  removeFromRecentProjects,
  toggleAutoSave,
  clearError,
} = projectSlice.actions;

// Export reducer
export default projectSlice.reducer;

// Enhanced selectors
export const selectCurrentProject = (state: { project: ProjectState }) => state.project.currentProject;
export const selectIsProjectLoaded = (state: { project: ProjectState }) => state.project.isProjectLoaded;
export const selectRecentProjects = (state: { project: ProjectState }) => state.project.recentProjects;
export const selectProjectError = (state: { project: ProjectState }) => state.project.error;
export const selectShowCreateWizard = (state: { project: ProjectState }) => state.project.showCreateWizard;

export const selectProjectLoadingStates = (state: { project: ProjectState }) => ({
  isCreating: state.project.isCreatingProject,
  isLoading: state.project.isLoadingProject,
  isSaving: state.project.isSavingProject,
  isValidating: state.project.isValidatingProject,
});

export const selectProjectMetadata = (state: { project: ProjectState }) => 
  state.project.currentProject?.metadata || null;

export const selectProjectStructure = (state: { project: ProjectState }) => 
  state.project.currentProject?.structure || null;

export const selectProjectSettings = (state: { project: ProjectState }) => 
  state.project.currentProject?.settings || null;

export const selectProjectPath = (state: { project: ProjectState }) => 
  state.project.currentProject?.metadata?.projectPath || null;