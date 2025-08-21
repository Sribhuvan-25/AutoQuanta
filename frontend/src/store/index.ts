/**
 * Redux store configuration for AutoQuanta
 * Manages global application state with persistence
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Import slices
import projectSlice from './slices/projectSlice';
import dataSlice from './slices/dataSlice';
import trainingSlice from './slices/trainingSlice';
import uiSlice from './slices/uiSlice';
import settingsSlice from './slices/settingsSlice';

// Combine all reducers
const rootReducer = combineReducers({
  project: projectSlice,
  data: dataSlice,
  training: trainingSlice,
  ui: uiSlice,
  settings: settingsSlice,
});

// Persist configuration
const persistConfig = {
  key: 'autoquanta',
  version: 1,
  storage,
  // Persist project, data, and settings - exclude UI and training state
  whitelist: ['project', 'data', 'settings'],
  blacklist: ['ui', 'training'], // UI and training state should not persist
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Export persistor for PersistGate
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

// Typed hooks
export { useAppDispatch, useAppSelector } from './hooks';