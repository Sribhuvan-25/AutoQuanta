/**
 * Project slice for Redux store
 * Manages project creation, loading, and metadata
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { ProjectMetadata } from '@/lib/types';
import { tauriAPI } from '@/lib/tauri';

// State interface
interface ProjectState {
  // Current project
  currentProject: ProjectMetadata | null;
  isProjectLoaded: boolean;
  
  // Recent projects
  recentProjects: ProjectMetadata[];
  
  // Loading states
  isCreatingProject: boolean;
  isLoadingProject: boolean;
  isSavingProject: boolean;
  
  // Error handling
  error: string | null;
  
  // Project settings
  autoSave: boolean;
  lastSavedAt: string | null;
}

// Initial state
const initialState: ProjectState = {
  currentProject: null,
  isProjectLoaded: false,
  recentProjects: [],
  isCreatingProject: false,
  isLoadingProject: false,
  isSavingProject: false,
  error: null,
  autoSave: true,
  lastSavedAt: null,
};

// Async thunks for project operations
export const createProject = createAsyncThunk(
  'project/create',
  async ({ name, path }: { name: string; path: string }, { rejectWithValue }) => {
    try {
      const success = await tauriAPI.createProject(path, name);
      if (!success) {
        throw new Error('Failed to create project');
      }
      
      const project: ProjectMetadata = {
        name,
        path,
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        data_files: [],
        models: [],
        description: '',
        tags: []
      };
      
      return project;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create project');
    }
  }
);

export const loadProject = createAsyncThunk(
  'project/load',
  async (projectPath: string, { rejectWithValue }) => {
    try {
      // In a real implementation, this would load project metadata
      // For now, we'll create a mock project
      const project: ProjectMetadata = {
        name: projectPath.split('/').pop() || 'Unknown Project',
        path: projectPath,
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        data_files: [],
        models: [],
        description: '',
        tags: []
      };
      
      return project;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load project');
    }
  }
);

export const saveProject = createAsyncThunk(
  'project/save',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { project: ProjectState };
      const { currentProject } = state.project;
      
      if (!currentProject) {
        throw new Error('No project to save');
      }
      
      // Update last modified timestamp
      const updatedProject = {
        ...currentProject,
        last_modified: new Date().toISOString()
      };
      
      // In a real implementation, this would save to the file system
      // For now, we'll just return the updated project
      return updatedProject;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save project');
    }
  }
);

// Project slice
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
    updateProjectMetadata: (state, action: PayloadAction<Partial<ProjectMetadata>>) => {
      if (state.currentProject) {
        state.currentProject = { ...state.currentProject, ...action.payload };
      }
    },
    
    // Add data file to project
    addDataFile: (state, action: PayloadAction<string>) => {
      if (state.currentProject && !state.currentProject.data_files.includes(action.payload)) {
        state.currentProject.data_files.push(action.payload);
      }
    },
    
    // Remove data file from project
    removeDataFile: (state, action: PayloadAction<string>) => {
      if (state.currentProject) {
        state.currentProject.data_files = state.currentProject.data_files.filter(
          file => file !== action.payload
        );
      }
    },
    
    // Add model to project
    addModel: (state, action: PayloadAction<string>) => {
      if (state.currentProject && !state.currentProject.models.includes(action.payload)) {
        state.currentProject.models.push(action.payload);
      }
    },
    
    // Add to recent projects
    addToRecentProjects: (state, action: PayloadAction<ProjectMetadata>) => {
      const existingIndex = state.recentProjects.findIndex(p => p.path === action.payload.path);
      
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
      state.recentProjects = state.recentProjects.filter(p => p.path !== action.payload);
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
      .addCase(createProject.pending, (state) => {
        state.isCreatingProject = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.isCreatingProject = false;
        state.currentProject = action.payload;
        state.isProjectLoaded = true;
        state.error = null;
        
        // Add to recent projects
        const existingIndex = state.recentProjects.findIndex(p => p.path === action.payload.path);
        if (existingIndex >= 0) {
          state.recentProjects.splice(existingIndex, 1);
        }
        state.recentProjects.unshift(action.payload);
        state.recentProjects = state.recentProjects.slice(0, 10);
      })
      .addCase(createProject.rejected, (state, action) => {
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
        
        // Add to recent projects
        const existingIndex = state.recentProjects.findIndex(p => p.path === action.payload.path);
        if (existingIndex >= 0) {
          state.recentProjects.splice(existingIndex, 1);
        }
        state.recentProjects.unshift(action.payload);
        state.recentProjects = state.recentProjects.slice(0, 10);
      })
      .addCase(loadProject.rejected, (state, action) => {
        state.isLoadingProject = false;
        state.error = action.payload as string;
      });
    
    // Save project
    builder
      .addCase(saveProject.pending, (state) => {
        state.isSavingProject = true;
        state.error = null;
      })
      .addCase(saveProject.fulfilled, (state, action) => {
        state.isSavingProject = false;
        state.currentProject = action.payload;
        state.lastSavedAt = new Date().toISOString();
        state.error = null;
      })
      .addCase(saveProject.rejected, (state, action) => {
        state.isSavingProject = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  clearProject,
  updateProjectMetadata,
  addDataFile,
  removeDataFile,
  addModel,
  addToRecentProjects,
  removeFromRecentProjects,
  toggleAutoSave,
  clearError,
} = projectSlice.actions;

// Export reducer
export default projectSlice.reducer;

// Selectors
export const selectCurrentProject = (state: { project: ProjectState }) => state.project.currentProject;
export const selectIsProjectLoaded = (state: { project: ProjectState }) => state.project.isProjectLoaded;
export const selectRecentProjects = (state: { project: ProjectState }) => state.project.recentProjects;
export const selectProjectError = (state: { project: ProjectState }) => state.project.error;
export const selectProjectLoadingStates = (state: { project: ProjectState }) => ({
  isCreating: state.project.isCreatingProject,
  isLoading: state.project.isLoadingProject,
  isSaving: state.project.isSavingProject,
});