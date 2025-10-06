/**
 * Centralized lazy loading exports for code splitting
 * Import from here to automatically split bundles
 */

import { lazy } from 'react';

// Training components (heavy)
export const LazyHyperparameterTuning = lazy(() =>
  import('@/components/training/HyperparameterTuning').then(mod => ({
    default: mod.HyperparameterTuning
  }))
);

export const LazyEnsembleConfig = lazy(() =>
  import('@/components/training/EnsembleConfig').then(mod => ({
    default: mod.EnsembleConfig
  }))
);

export const LazyAutoMLConfig = lazy(() =>
  import('@/components/training/AutoMLConfig').then(mod => ({
    default: mod.AutoMLConfig
  }))
);

// Export/Report components (heavy)
export const LazyPDFReportGenerator = lazy(() =>
  import('@/components/reports/PDFReportGenerator').then(mod => ({
    default: mod.PDFReportGenerator
  }))
);

export const LazyHTMLReportGenerator = lazy(() =>
  import('@/components/reports/HTMLReportGenerator').then(mod => ({
    default: mod.HTMLReportGenerator
  }))
);

export const LazyModelDocExporter = lazy(() =>
  import('@/components/reports/ModelDocExporter').then(mod => ({
    default: mod.ModelDocExporter
  }))
);

export const LazyReportTemplateBuilder = lazy(() =>
  import('@/components/reports/ReportTemplateBuilder').then(mod => ({
    default: mod.ReportTemplateBuilder
  }))
);

// Model management components
export const LazyModelComparison = lazy(() =>
  import('@/components/models/ModelComparison').then(mod => ({
    default: mod.ModelComparison
  }))
);

export const LazyModelVersioning = lazy(() =>
  import('@/components/models/ModelVersioning').then(mod => ({
    default: mod.ModelVersioning
  }))
);

export const LazyModelPerformanceHistory = lazy(() =>
  import('@/components/models/ModelPerformanceHistory').then(mod => ({
    default: mod.ModelPerformanceHistory
  }))
);

// Real-time monitoring (can be heavy with charts)
export const LazyRealTimeTrainingMonitor = lazy(() =>
  import('@/components/training/RealTimeTrainingMonitor').then(mod => ({
    default: mod.RealTimeTrainingMonitor
  }))
);

export const LazyTrainingLogsViewer = lazy(() =>
  import('@/components/training/TrainingLogsViewer').then(mod => ({
    default: mod.TrainingLogsViewer
  }))
);

// Preprocessing components
export const LazyPreprocessingConfig = lazy(() =>
  import('@/components/preprocessing/PreprocessingConfig').then(mod => ({
    default: mod.PreprocessingConfig
  }))
);

export const LazyFeatureEngineering = lazy(() =>
  import('@/components/preprocessing/FeatureEngineering').then(mod => ({
    default: mod.FeatureEngineering
  }))
);

// Chart components (heavy with recharts)
export {
  LazyBarChartWrapper as LazyBarChart,
  LazyLineChartWrapper as LazyLineChart,
  LazyScatterPlotWrapper as LazyScatterPlot,
  LazyHeatmapWrapper as LazyHeatmap,
  IntersectionLazyLoad
} from './LazyChart';
