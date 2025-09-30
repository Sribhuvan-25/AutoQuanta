'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Brain,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Target,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SavedModel } from '@/lib/types';

interface ModelSelectorProps {
  models: SavedModel[];
  selectedModel: SavedModel | null;
  onSelectModel: (model: SavedModel) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function ModelSelector({
  models,
  selectedModel,
  onSelectModel,
  onRefresh,
  isLoading = false,
  className
}: ModelSelectorProps) {

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatScore = (score: number, taskType: string): string => {
    if (taskType === 'regression') {
      return `R² ${score.toFixed(4)}`;
    }
    return `${(score * 100).toFixed(1)}% Acc`;
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Select Model</h3>
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          )}
        </div>
        {models.length > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            {models.length} trained model{models.length !== 1 ? 's' : ''} available
          </p>
        )}
      </div>

      {/* Model List */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No trained models found</p>
            <p className="text-sm text-gray-500 mt-1">
              Train a model first to make predictions
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {models.map((model) => {
              const isSelected = selectedModel?.model_id === model.model_id;

              return (
                <button
                  key={model.model_id}
                  onClick={() => onSelectModel(model)}
                  className={cn(
                    'w-full text-left p-4 rounded-lg border-2 transition-all',
                    'hover:border-blue-300 hover:bg-blue-50/50',
                    isSelected
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 bg-white'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Model Name & Type */}
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {model.model_name}
                        </h4>
                        <span className={cn(
                          'px-2 py-0.5 text-xs font-medium rounded-full',
                          model.task_type === 'classification'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-green-100 text-green-700'
                        )}>
                          {model.task_type}
                        </span>
                      </div>

                      {/* Model Info Grid */}
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {/* Performance Score */}
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-xs text-gray-500">Performance</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatScore(model.performance.score, model.task_type)}
                            </p>
                          </div>
                        </div>

                        {/* Target Column */}
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-xs text-gray-500">Target</p>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {model.target_column}
                            </p>
                          </div>
                        </div>

                        {/* Created Date */}
                        <div className="flex items-center gap-2 col-span-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Created</p>
                            <p className="text-sm text-gray-700">
                              {formatDate(model.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Feature Count */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">{model.feature_names.length}</span> features required
                        </p>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    <div className="ml-3 flex-shrink-0">
                      {isSelected ? (
                        <CheckCircle2 className="h-6 w-6 text-blue-600" />
                      ) : (
                        <ChevronRight className="h-6 w-6 text-gray-300" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}