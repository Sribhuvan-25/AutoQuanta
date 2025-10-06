'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Package,
  Target,
  Download,
  FileText,
  RefreshCw,
  Filter,
  GitCompare,
  Grid,
  List,
  X
} from 'lucide-react';
import { ModelCard } from '@/components/models/ModelCard';
import { ModelComparison } from '@/components/models/ModelComparison';
import { ModelTagsNotes } from '@/components/models/ModelTagsNotes';
import { ExportHub } from '@/components/reports/ExportHub';
import { exportTrainingSummary } from '@/lib/export-utils';

interface ModelMetadata {
  model_name: string;
  export_timestamp: string;
  best_model_type: string;
  best_score: number;
  task_type: 'classification' | 'regression';
  target_column: string;
  feature_count: number;
  training_data_shape: [number, number];
  cv_folds: number;
  models_trained: string[];
}

interface SavedModel {
  metadata: ModelMetadata;
  model_path: string;
  metadata_path: string;
  size_mb: number;
  created_date: Date;
}

interface APIModel {
  model_name: string;
  export_timestamp: string;
  best_model_type: string;
  best_score: number;
  task_type: 'classification' | 'regression';
  target_column: string;
  feature_count: number;
  training_data_shape: [number, number];
  cv_folds: number;
  models_trained: string[];
  model_path: string;
  metadata_path: string;
  size_mb: number;
}

export default function ModelsPage() {
  const [models, setModels] = useState<SavedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<SavedModel | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedForComparison] = useState<SavedModel[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showExportHub, setShowExportHub] = useState(false);
  const [filterTaskType, setFilterTaskType] = useState<'all' | 'classification' | 'regression'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'name'>('date');

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      
      // Load models from FastAPI backend
      const response = await fetch('http://localhost:8000/models');
      const data = await response.json();
      
      if (data.success && data.models) {
        // Convert API response to SavedModel format
        const formattedModels: SavedModel[] = data.models.map((model: APIModel) => ({
          metadata: {
            model_name: model.model_name,
            export_timestamp: model.export_timestamp,
            best_model_type: model.model_type || 'unknown',
            best_score: model.best_score,
            task_type: model.task_type,
            target_column: model.target_column,
            feature_count: model.feature_count,
            training_data_shape: model.training_data_shape || [0, 0],
            cv_folds: 5, // Default, could be added to API response
            models_trained: [model.model_type || 'unknown']
          },
          model_path: model.model_path,
          metadata_path: model.model_path + '/metadata.json',
          size_mb: 5.0, // Default, could calculate from file system
          created_date: new Date(
            model.export_timestamp.length === 15 
              ? `${model.export_timestamp.slice(0,4)}-${model.export_timestamp.slice(4,6)}-${model.export_timestamp.slice(6,8)}T${model.export_timestamp.slice(9,11)}:${model.export_timestamp.slice(11,13)}:${model.export_timestamp.slice(13,15)}`
              : model.export_timestamp
          )
        }));
        
        setModels(formattedModels);
      } else {
        setModels([]);
      }
    } catch (error) {
      console.error('Failed to load models from API:', error);
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const formatModelType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'rf': 'Random Forest',
      'lgbm': 'LightGBM', 
      'xgb': 'XGBoost',
      'lr': 'Linear Regression',
      'logistic_regression': 'Logistic Regression',
      'linear_regression': 'Linear Regression',
      'random_forest': 'Random Forest',
      'gradient_boosting': 'Gradient Boosting'
    };
    return typeMap[type] || type.toUpperCase();
  };

  const formatScore = (score: number, taskType: 'classification' | 'regression') => {
    if (taskType === 'regression') {
      return `${score.toFixed(4)} (R²)`;
    } else {
      return `${(score * 100).toFixed(1)}% Accuracy`;
    }
  };

  // Filter and sort models
  const filteredModels = models
    .filter(model => filterTaskType === 'all' || model.metadata.task_type === filterTaskType)
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.metadata.best_score - a.metadata.best_score;
        case 'name':
          return a.metadata.model_name.localeCompare(b.metadata.model_name);
        case 'date':
        default:
          return b.created_date.getTime() - a.created_date.getTime();
      }
    });


  const convertToModelCardFormat = (model: SavedModel) => ({
    model_id: model.metadata.model_name,
    model_name: model.metadata.model_name,
    model_type: formatModelType(model.metadata.best_model_type),
    task_type: model.metadata.task_type,
    target_column: model.metadata.target_column,
    score: model.metadata.best_score,
    created_at: model.created_date.toISOString(),
    feature_count: model.metadata.feature_count,
    version: '1.0',
    tags: [],
    notes: '',
    is_favorite: false
  });

  const handleExportJSON = (modelId: string) => {
    const model = models.find(m => m.metadata.model_name === modelId);
    if (!model) return;

    const exportData = {
      model_name: model.metadata.model_name,
      model_type: formatModelType(model.metadata.best_model_type),
      task_type: model.metadata.task_type,
      target_column: model.metadata.target_column,
      score: model.metadata.best_score,
      feature_count: model.metadata.feature_count,
      training_data_shape: model.metadata.training_data_shape,
      cv_folds: model.metadata.cv_folds,
      created_at: model.created_date.toISOString(),
      models_trained: model.metadata.models_trained,
    };

    exportTrainingSummary.toJSON(exportData, `${model.metadata.model_name}_summary.json`);
  };

  const handleExportCSV = (modelId: string) => {
    const model = models.find(m => m.metadata.model_name === modelId);
    if (!model) return;

    const exportData = [{
      model_name: model.metadata.model_name,
      model_type: formatModelType(model.metadata.best_model_type),
      task_type: model.metadata.task_type,
      target_column: model.metadata.target_column,
      score: model.metadata.best_score,
      feature_count: model.metadata.feature_count,
      rows: model.metadata.training_data_shape[0],
      columns: model.metadata.training_data_shape[1],
      created_at: model.created_date.toISOString(),
    }];

    exportTrainingSummary.toCSV(exportData, `${model.metadata.model_name}_summary.csv`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">Model Management</h1>
            <p className="text-lg text-gray-600 mt-3 max-w-3xl">Manage and deploy your trained machine learning models</p>
          </div>

          <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-8">
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-700 mr-3" />
              <span className="text-gray-600 font-medium">Loading saved models...</span>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">Model Management</h1>
            <p className="text-lg text-gray-600 mt-3 max-w-3xl">
              Manage your trained models, view performance metrics, and prepare for inference.
            </p>
          </div>
          <Button onClick={() => window.location.href = '/train'} className="flex-shrink-0">
            <Package className="w-4 h-4 mr-2" />
            Train New Model
          </Button>
        </div>

        {/* Filters and Controls */}
        {models.length > 0 && (
          <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {/* Filter by Task Type */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gray-100 rounded-lg border border-gray-200">
                    <Filter className="h-4 w-4 text-gray-700" />
                  </div>
                  <select
                    value={filterTaskType}
                    onChange={(e) => setFilterTaskType(e.target.value as 'all' | 'classification' | 'regression')}
                    className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                  >
                    <option value="all">All Tasks</option>
                    <option value="classification">Classification</option>
                    <option value="regression">Regression</option>
                  </select>
                </div>

                {/* Sort By */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'score' | 'name')}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                >
                  <option value="date">Sort by Date</option>
                  <option value="score">Sort by Score</option>
                  <option value="name">Sort by Name</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                {/* Export All Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allModelsData = filteredModels.map(m => ({
                      model_name: m.metadata.model_name,
                      model_type: formatModelType(m.metadata.best_model_type),
                      task_type: m.metadata.task_type,
                      target_column: m.metadata.target_column,
                      score: m.metadata.best_score,
                      feature_count: m.metadata.feature_count,
                      rows: m.metadata.training_data_shape[0],
                      created_at: m.created_date.toISOString(),
                    }));
                    exportTrainingSummary.toCSV(allModelsData, 'all_models_summary.csv');
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export All CSV
                </Button>

                {/* Compare Button */}
                {selectedForComparison.length >= 2 && (
                  <Button
                    size="sm"
                    onClick={() => setShowComparison(true)}
                  >
                    <GitCompare className="h-4 w-4 mr-2" />
                    Compare ({selectedForComparison.length})
                  </Button>
                )}

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 border border-gray-300 rounded-xl p-1 bg-white">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Model Comparison View */}
        {showComparison && selectedForComparison.length >= 2 && (
          <ModelComparison
            models={selectedForComparison.map(m => ({
              model_id: m.metadata.model_name,
              model_name: m.metadata.model_name,
              model_type: formatModelType(m.metadata.best_model_type),
              task_type: m.metadata.task_type,
              score: m.metadata.best_score,
              created_at: m.created_date.toISOString(),
              feature_count: m.metadata.feature_count,
              version: '1.0'
            }))}
            onClose={() => setShowComparison(false)}
          />
        )}

        {/* Models List */}
        {models.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Models Found</h3>
              <p className="text-gray-600 mb-6">
                Train your first model to see it appear here with export capabilities.
              </p>
              <Button onClick={() => window.location.href = '/train'}>
                Start Training
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
            {filteredModels.map((model) => (
              <ModelCard
                key={model.metadata.model_name}
                model={convertToModelCardFormat(model)}
                onView={() => setSelectedModel(model)}
                onDelete={async () => {
                  if (confirm(`Delete model ${model.metadata.model_name}? This cannot be undone.`)) {
                    try {
                      const response = await fetch(`http://localhost:8000/delete_model`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ model_path: model.model_path })
                      });
                      if (response.ok) {
                        loadModels();
                      }
                    } catch {
                      alert('Failed to delete model');
                    }
                  }
                }}
                onDownload={async () => {
                  try {
                    const response = await fetch(`http://localhost:8000/download_model`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ model_path: model.model_path })
                    });

                    if (response.ok) {
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${model.metadata.model_name}_model.zip`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    } else {
                      alert('Download failed');
                    }
                  } catch {
                    alert('Download failed');
                  }
                }}
                onExportJSON={() => handleExportJSON(model.metadata.model_name)}
                onExportCSV={() => handleExportCSV(model.metadata.model_name)}
              />
            ))}
          </div>
        )}

      {/* Model Details Modal */}
      {selectedModel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-white/40">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{selectedModel.metadata.model_name}</h2>
                  <p className="text-base text-gray-600 mt-2">
                    {formatModelType(selectedModel.metadata.best_model_type)} • {selectedModel.metadata.task_type}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setSelectedModel(null)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-5 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-medium text-gray-600 mb-2">Performance Score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatScore(selectedModel.metadata.best_score, selectedModel.metadata.task_type)}
                    </p>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-medium text-gray-600 mb-2">Dataset Size</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedModel.metadata.training_data_shape[0].toLocaleString()} rows
                    </p>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-medium text-gray-600 mb-2">Features</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedModel.metadata.feature_count}
                    </p>
                  </div>
                </div>

                {/* Tags and Notes */}
                <ModelTagsNotes
                  modelId={selectedModel.metadata.model_name}
                  tags={[]}
                  notes=""
                  onTagsUpdate={(tags) => {
                    console.log('Tags updated:', tags);
                  }}
                  onNotesUpdate={(notes) => {
                    console.log('Notes updated:', notes);
                  }}
                />

                {/* Quick Actions */}
                <div className="flex space-x-3 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      window.location.href = `/predict?model=${selectedModel.metadata.model_name}`;
                    }}
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Use for Prediction
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const response = await fetch(`http://localhost:8000/download_model`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ model_path: selectedModel.model_path })
                        });

                        if (response.ok) {
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${selectedModel.metadata.model_name}_model.zip`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                        }
                      } catch {
                        alert('Download failed');
                      }
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowExportHub(true)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export & Reports
                  </Button>
                </div>

                {/* Export Hub */}
                {showExportHub && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Export & Reports</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowExportHub(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <ExportHub
                      modelData={{
                        model_name: selectedModel.metadata.model_name,
                        model_type: selectedModel.metadata.best_model_type,
                        task_type: selectedModel.metadata.task_type,
                        target_column: selectedModel.metadata.target_column,
                        score: selectedModel.metadata.best_score,
                        feature_count: selectedModel.metadata.feature_count,
                        created_at: selectedModel.created_date.toISOString(),
                        cv_folds: selectedModel.metadata.cv_folds,
                        training_data_shape: selectedModel.metadata.training_data_shape,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AppLayout>
  );
}