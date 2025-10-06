'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Database, Check, Zap } from 'lucide-react';

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableModels: Array<Record<string, unknown>>;
  selectedModel: Record<string, unknown> | null;
  onSelectModel: (model: Record<string, unknown>) => void;
}

export function ModelSelectionModal({
  isOpen,
  onClose,
  availableModels,
  selectedModel,
  onSelectModel,
}: ModelSelectionModalProps) {
  if (!isOpen) return null;

  // Sort models by score (best first)
  const sortedModels = [...availableModels].sort((a, b) => b.best_score - a.best_score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 rounded-xl bg-gray-900/30 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Select Model</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Choose a trained model for making predictions
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Model List - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            {sortedModels.length === 0 ? (
              <div className="text-center py-8">
                <Database className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Models Available</h3>
                <p className="text-gray-600">
                  You need to train models first before making predictions.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedModels.map((model, index) => {
                  const isSelected = selectedModel?.model_path === model.model_path;
                  const isBestModel = index === 0; // First in sorted list is best
                  
                  return (
                    <div
                      key={`${model.model_name}-${model.export_timestamp}-${index}`}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        onSelectModel(model);
                        onClose();
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-gray-900">
                              {model.model_name.toUpperCase()}
                            </h3>
                            {isBestModel && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                <Zap className="h-3 w-3" />
                                Best Model
                              </span>
                            )}
                            {isSelected && (
                              <Check className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex gap-4 flex-wrap">
                              <span>Type: <span className="font-medium">{model.model_type.toUpperCase()}</span></span>
                              <span>Task: <span className="font-medium">{model.task_type}</span></span>
                              <span>Score: <span className="font-medium text-green-600">{model.best_score.toFixed(4)}</span></span>
                              <span>Features: <span className="font-medium">{model.feature_count}</span></span>
                            </div>
                            
                            <div className="text-xs text-gray-500">
                              Created: {new Date(model.export_timestamp).toLocaleString()}
                            </div>
                            
                            {model.feature_names && model.feature_names.length > 0 && (
                              <div className="text-xs text-gray-500">
                                Features: {model.feature_names.slice(0, 5).join(', ')}
                                {model.feature_names.length > 5 && ` ... and ${model.feature_names.length - 5} more`}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-1">
                            {model.has_onnx && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                ONNX
                              </span>
                            )}
                            {model.has_pickle && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                PKL
                              </span>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              Score Rank
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              #{index + 1}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {sortedModels.length} model{sortedModels.length !== 1 ? 's' : ''} available
              </p>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
    </div>
  );
}