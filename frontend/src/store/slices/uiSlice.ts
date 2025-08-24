/**
 * UI slice for Redux store
 * Manages application UI state, modals, notifications, and user interactions
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Notification types
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number; // in ms, null for persistent
  actions?: Array<{
    label: string;
    action: string;
  }>;
}

// Modal state
interface ModalState {
  isOpen: boolean;
  type: string | null;
  props: Record<string, unknown>;
}

// Sidebar state
interface SidebarState {
  isCollapsed: boolean;
  activeSection: string;
}

// UI state interface
interface UIState {
  // Global loading
  isLoading: boolean;
  loadingMessage: string;
  
  // Navigation
  activeTab: string;
  breadcrumbs: Array<{ label: string; path: string }>;
  
  // Sidebar
  sidebar: SidebarState;
  
  // Modals
  modal: ModalState;
  
  // Notifications/Toasts
  notifications: Notification[];
  
  // Data table state
  tableView: {
    pageSize: number;
    currentPage: number;
    sortColumn: string | null;
    sortDirection: 'asc' | 'desc';
    searchQuery: string;
    selectedRows: string[];
    filters: Record<string, unknown>;
  };
  
  // Chart/visualization state
  visualizationSettings: {
    theme: 'light' | 'dark';
    colorPalette: string;
    animationsEnabled: boolean;
    defaultChartType: string;
  };
  
  // Panel states
  panels: {
    dataProfile: boolean;
    modelResults: boolean;
    logs: boolean;
    help: boolean;
  };
  
  // Layout preferences
  layout: {
    density: 'compact' | 'comfortable' | 'spacious';
    fontSize: 'small' | 'medium' | 'large';
    reduceMotion: boolean;
  };
}

// Initial state
const initialState: UIState = {
  isLoading: false,
  loadingMessage: '',
  activeTab: 'data',
  breadcrumbs: [],
  sidebar: {
    isCollapsed: false,
    activeSection: 'data',
  },
  modal: {
    isOpen: false,
    type: null,
    props: {},
  },
  notifications: [],
  tableView: {
    pageSize: 50,
    currentPage: 1,
    sortColumn: null,
    sortDirection: 'asc',
    searchQuery: '',
    selectedRows: [],
    filters: {},
  },
  visualizationSettings: {
    theme: 'light',
    colorPalette: 'default',
    animationsEnabled: true,
    defaultChartType: 'scatter',
  },
  panels: {
    dataProfile: true,
    modelResults: false,
    logs: false,
    help: false,
  },
  layout: {
    density: 'comfortable',
    fontSize: 'medium',
    reduceMotion: false,
  },
};

// UI slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Global loading
    setLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string }>) => {
      state.isLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message || '';
    },
    
    // Navigation
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
    
    setBreadcrumbs: (state, action: PayloadAction<Array<{ label: string; path: string }>>) => {
      state.breadcrumbs = action.payload;
    },
    
    // Sidebar
    toggleSidebar: (state) => {
      state.sidebar.isCollapsed = !state.sidebar.isCollapsed;
    },
    
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebar.isCollapsed = action.payload;
    },
    
    setSidebarActiveSection: (state, action: PayloadAction<string>) => {
      state.sidebar.activeSection = action.payload;
    },
    
    // Modals
    openModal: (state, action: PayloadAction<{ type: string; props?: Record<string, unknown> }>) => {
      state.modal.isOpen = true;
      state.modal.type = action.payload.type;
      state.modal.props = action.payload.props || {};
    },
    
    closeModal: (state) => {
      state.modal.isOpen = false;
      state.modal.type = null;
      state.modal.props = {};
    },
    
    updateModalProps: (state, action: PayloadAction<Record<string, unknown>>) => {
      state.modal.props = { ...state.modal.props, ...action.payload };
    },
    
    // Notifications
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      state.notifications.push(notification);
      
      // Limit to 5 notifications
      if (state.notifications.length > 5) {
        state.notifications = state.notifications.slice(-5);
      }
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    // Table view
    updateTableView: (state, action: PayloadAction<Partial<UIState['tableView']>>) => {
      state.tableView = { ...state.tableView, ...action.payload };
    },
    
    setTablePage: (state, action: PayloadAction<number>) => {
      state.tableView.currentPage = action.payload;
    },
    
    setTableSort: (state, action: PayloadAction<{ column: string; direction: 'asc' | 'desc' }>) => {
      state.tableView.sortColumn = action.payload.column;
      state.tableView.sortDirection = action.payload.direction;
    },
    
    setTableSearch: (state, action: PayloadAction<string>) => {
      state.tableView.searchQuery = action.payload;
      state.tableView.currentPage = 1; // Reset to first page when searching
    },
    
    toggleRowSelection: (state, action: PayloadAction<string>) => {
      const rowId = action.payload;
      const index = state.tableView.selectedRows.indexOf(rowId);
      
      if (index >= 0) {
        state.tableView.selectedRows.splice(index, 1);
      } else {
        state.tableView.selectedRows.push(rowId);
      }
    },
    
    clearRowSelection: (state) => {
      state.tableView.selectedRows = [];
    },
    
    selectAllRows: (state, action: PayloadAction<string[]>) => {
      state.tableView.selectedRows = action.payload;
    },
    
    // Visualization settings
    updateVisualizationSettings: (state, action: PayloadAction<Partial<UIState['visualizationSettings']>>) => {
      state.visualizationSettings = { ...state.visualizationSettings, ...action.payload };
    },
    
    // Panel toggles
    togglePanel: (state, action: PayloadAction<keyof UIState['panels']>) => {
      const panel = action.payload;
      state.panels[panel] = !state.panels[panel];
    },
    
    setPanelOpen: (state, action: PayloadAction<{ panel: keyof UIState['panels']; isOpen: boolean }>) => {
      state.panels[action.payload.panel] = action.payload.isOpen;
    },
    
    // Layout preferences
    updateLayout: (state, action: PayloadAction<Partial<UIState['layout']>>) => {
      state.layout = { ...state.layout, ...action.payload };
    },
    
    // Reset UI state (useful for logout or project changes)
    resetUIState: (state) => {
      // Keep some preferences but reset temporary state
      const { layout, visualizationSettings } = state;
      
      Object.assign(state, {
        ...initialState,
        layout,
        visualizationSettings,
      });
    },
  },
});

// Export actions
export const {
  setLoading,
  setActiveTab,
  setBreadcrumbs,
  toggleSidebar,
  setSidebarCollapsed,
  setSidebarActiveSection,
  openModal,
  closeModal,
  updateModalProps,
  addNotification,
  removeNotification,
  clearNotifications,
  updateTableView,
  setTablePage,
  setTableSort,
  setTableSearch,
  toggleRowSelection,
  clearRowSelection,
  selectAllRows,
  updateVisualizationSettings,
  togglePanel,
  setPanelOpen,
  updateLayout,
  resetUIState,
} = uiSlice.actions;

// Export reducer
export default uiSlice.reducer;

// Selectors
export const selectIsLoading = (state: any) => state.ui.isLoading;
export const selectLoadingMessage = (state: any) => state.ui.loadingMessage;
export const selectActiveTab = (state: any) => state.ui.activeTab;
export const selectBreadcrumbs = (state: any) => state.ui.breadcrumbs;
export const selectSidebar = (state: any) => state.ui.sidebar;
export const selectModal = (state: any) => state.ui.modal;
export const selectNotifications = (state: any) => state.ui.notifications;
export const selectTableView = (state: any) => state.ui.tableView;
export const selectVisualizationSettings = (state: any) => state.ui.visualizationSettings;
export const selectPanels = (state: any) => state.ui.panels;
export const selectLayout = (state: any) => state.ui.layout;