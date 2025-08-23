'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Calendar, 
  Target, 
  BarChart3, 
  Download, 
  Trash2,
  Eye,
  FileText,
  Database,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

export default function ModelsPage() {
  const [models, setModels] = useState<SavedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<SavedModel | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      
      // Load models from localStorage (saved by training process)
      const savedModelsData = localStorage.getItem('trained_models');
      if (savedModelsData) {
        const trainedModels = JSON.parse(savedModelsData);
        
        // Convert to SavedModel format
        const formattedModels: SavedModel[] = trainedModels.map((model: any) => ({
          metadata: {
            model_name: model.id,
            export_timestamp: model.createdAt,
            best_model_type: model.type,
            best_score: model.accuracy,
            task_type: model.task_type,
            target_column: model.target_column,
            feature_count: Object.keys(model.feature_importance || {}).length || 0,
            training_data_shape: [100, 5], // Default shape
            cv_folds: model.cv_scores?.length || 5,
            models_trained: [model.type]
          },
          model_path: `/models/${model.id}.pkl`,
          metadata_path: `/models/${model.id}_metadata.json`,
          size_mb: parseFloat(model.size?.replace('MB', '') || '5.0'),
          created_date: new Date(model.createdAt)
        }));
        
        setModels(formattedModels);
      } else {
        // No saved models found
        setModels([]);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
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

  const getTaskTypeColor = (taskType: 'classification' | 'regression') => {
    return taskType === 'classification' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case 'rf': return <Package className="w-4 h-4" />;
      case 'lgbm': return <Zap className="w-4 h-4" />;
      case 'xgb': return <BarChart3 className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading saved models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Model Management</h1>
        <p className="text-gray-600">
          Manage your trained models, view performance metrics, and prepare for inference.
        </p>
      </div>

      {models.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Models Found</h3>
            <p className="text-gray-600 mb-6">
              Train your first model to see it appear here with export capabilities.
            </p>
            <Button>
              <a href="/train">Start Training</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {models.map((model, index) => (
            <Card key={model.metadata.model_name} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getModelTypeIcon(model.metadata.best_model_type)}
                    <CardTitle className="text-lg">
                      {formatModelType(model.metadata.best_model_type)}
                    </CardTitle>
                  </div>
                  <Badge className={getTaskTypeColor(model.metadata.task_type)}>
                    {model.metadata.task_type}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Target: {model.metadata.target_column}
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Performance Score */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Performance:</span>
                  <span className="font-semibold">
                    {formatScore(model.metadata.best_score, model.metadata.task_type)}
                  </span>
                </div>

                {/* Dataset Info */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Dataset:</span>
                  <span className="text-sm">
                    {model.metadata.training_data_shape[0]} rows × {model.metadata.feature_count} features
                  </span>
                </div>

                {/* Creation Date */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Created:</span>
                  <span className="text-sm">
                    {formatDistanceToNow(model.created_date, { addSuffix: true })}
                  </span>
                </div>

                {/* Model Size */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Size:</span>
                  <span className="text-sm">{model.size_mb.toFixed(2)} MB</span>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedModel(model)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Download model functionality
                      console.log('Download model:', model.metadata.model_name);
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Delete model functionality
                      console.log('Delete model:', model.metadata.model_name);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Model Details Modal */}
      {selectedModel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Model Details</h2>
                <Button variant="ghost" onClick={() => setSelectedModel(null)}>
                  ×
                </Button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model Type
                    </label>
                    <p className="text-sm bg-gray-50 p-2 rounded">
                      {formatModelType(selectedModel.metadata.best_model_type)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Type
                    </label>
                    <Badge className={getTaskTypeColor(selectedModel.metadata.task_type)}>
                      {selectedModel.metadata.task_type}
                    </Badge>
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Performance Score
                  </label>
                  <p className="text-lg font-semibold">
                    {formatScore(selectedModel.metadata.best_score, selectedModel.metadata.task_type)}
                  </p>
                </div>

                {/* Training Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cross-Validation Folds
                    </label>
                    <p className="text-sm bg-gray-50 p-2 rounded">
                      {selectedModel.metadata.cv_folds} folds
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Column
                    </label>
                    <p className="text-sm bg-gray-50 p-2 rounded">
                      {selectedModel.metadata.target_column}
                    </p>
                  </div>
                </div>

                {/* Dataset Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Training Dataset
                  </label>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Rows:</span> {selectedModel.metadata.training_data_shape[0]}
                      </div>
                      <div>
                        <span className="font-medium">Columns:</span> {selectedModel.metadata.training_data_shape[1]}
                      </div>
                      <div>
                        <span className="font-medium">Features:</span> {selectedModel.metadata.feature_count}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span> {selectedModel.size_mb.toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                </div>

                {/* Models Trained */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Models Evaluated
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedModel.metadata.models_trained.map(modelType => (
                      <Badge key={modelType} variant="outline">
                        {formatModelType(modelType)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4 border-t">
                  <Button className="flex-1">
                    <Target className="w-4 h-4 mr-2" />
                    Use for Inference
                  </Button>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}