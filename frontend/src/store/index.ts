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

import projectSlice from './slices/projectSlice';
import dataSlice from './slices/dataSlice';
import trainingSlice from './slices/trainingSlice';
import predictionSlice from './slices/predictionSlice';
import uiSlice from './slices/uiSlice';
import settingsSlice from './slices/settingsSlice';

const rootReducer = combineReducers({
  project: projectSlice,
  data: dataSlice,
  training: trainingSlice,
  prediction: predictionSlice,
  ui: uiSlice,
  settings: settingsSlice,
});

const persistConfig = {
  key: 'autoquanta',
  version: 1,
  storage,
  whitelist: ['project', 'settings'],
  blacklist: ['ui', 'training', 'prediction', 'data'],
};


const persistedReducer = persistReducer(persistConfig, rootReducer);

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

// Export persistor for PersistGateÍ
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

// Typed hooks
export { useAppDispatch, useAppSelector } from './hooks';