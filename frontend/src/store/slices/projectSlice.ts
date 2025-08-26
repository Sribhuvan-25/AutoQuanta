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

// Enhanced async thunks for project operations
export const createNewProject = createAsyncThunk(
  'project/create',
  async (request: CreateProjectRequest, { rejectWithValue }) => {
    try {
      const result = await tauriAPI.createProject(request);
      if (!result.success || !result.projectConfig) {
        throw new Error(result.error || 'Failed to create project');
      }
      return result.projectConfig;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create project');
    }
  }
);

export const loadProject = createAsyncThunk(
  'project/load',
  async (projectPath: string, { rejectWithValue }) => {
    try {
      const result = await tauriAPI.loadProject(projectPath);
      if (!result.success || !result.projectConfig) {
        throw new Error(result.error || 'Failed to load project');
      }
      return result.projectConfig;
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
  },
});

// Export actions
export const {
  clearProject,
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