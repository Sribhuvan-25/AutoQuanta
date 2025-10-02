'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Brain,
  Calendar,
  TrendingUp,
  Target,
  Layers,
  Clock,
  Tag,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Share2,
  Star,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModelCardProps {
  model: {
    model_id: string;
    model_name: string;
    model_type: string;
    task_type: 'classification' | 'regression';
    target_column: string;
    score: number;
    created_at: string;
    version?: string;
    tags?: string[];
    notes?: string;
    feature_count?: number;
    training_time?: number;
    dataset_size?: number;
    is_favorite?: boolean;
  };
  onView?: (modelId: string) => void;
  onEdit?: (modelId: string) => void;
  onDelete?: (modelId: string) => void;
  onDownload?: (modelId: string) => void;
  onShare?: (modelId: string) => void;
  onToggleFavorite?: (modelId: string) => void;
  className?: string;
}

export function ModelCard({
  model,
  onView,
  onEdit,
  onDelete,
  onDownload,
  onShare,
  onToggleFavorite,
  className
}: ModelCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatScore = (score: number): string => {
    if (model.task_type === 'regression') {
      return `R² ${score.toFixed(4)}`;
    }
    return `${(score * 100).toFixed(1)}% Acc`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const getScoreColor = (score: number): string => {
    if (model.task_type === 'regression') {
      if (score >= 0.8) return 'text-green-600 bg-green-50';
      if (score >= 0.5) return 'text-yellow-600 bg-yellow-50';
      return 'text-red-600 bg-red-50';
    } else {
      if (score >= 0.9) return 'text-green-600 bg-green-50';
      if (score >= 0.7) return 'text-yellow-600 bg-yellow-50';
      return 'text-red-600 bg-red-50';
    }
  };

  return (
    <div className={cn(
      'bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all cursor-pointer group',
      model.is_favorite && 'border-yellow-300',
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0" onClick={() => onView?.(model.model_id)}>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900 truncate">{model.model_name}</h3>
              {model.version && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  v{model.version}
                </span>
              )}
              {model.is_favorite && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className={cn(
                'px-2 py-1 rounded-full font-medium',
                model.task_type === 'classification'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-green-100 text-green-700'
              )}>
                {model.task_type}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                {model.model_type}
              </span>
            </div>
          </div>

          {/* Actions Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(model.model_id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Details
                  </button>
                )}
                {onToggleFavorite && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(model.model_id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Star className={cn('h-4 w-4', model.is_favorite && 'fill-yellow-500 text-yellow-500')} />
                    {model.is_favorite ? 'Remove Favorite' : 'Add to Favorites'}
                  </button>
                )}
                {onDownload && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(model.model_id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                )}
                {onShare && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare(model.model_id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                )}
                {onDelete && (
                  <>
                    <div className="border-t border-gray-200 my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(model.model_id);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4" onClick={() => onView?.(model.model_id)}>
        {/* Score Display */}
        <div className={cn('p-3 rounded-lg mb-4', getScoreColor(model.score))}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-75">Performance</p>
              <p className="text-2xl font-bold">{formatScore(model.score)}</p>
            </div>
            <BarChart3 className="h-8 w-8 opacity-50" />
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Target</p>
              <p className="font-medium text-gray-900 truncate">{model.target_column}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="font-medium text-gray-900">{formatDate(model.created_at)}</p>
            </div>
          </div>

          {model.feature_count && (
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Features</p>
                <p className="font-medium text-gray-900">{model.feature_count}</p>
              </div>
            </div>
          )}

          {model.training_time && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Training Time</p>
                <p className="font-medium text-gray-900">{formatDuration(model.training_time)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        {model.tags && model.tags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-4 w-4 text-gray-400" />
              {model.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes Preview */}
        {model.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-600 line-clamp-2">{model.notes}</p>
          </div>
        )}
      </div>

      {/* Footer - View Details Button */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onView?.(model.model_id);
          }}
        >
          View Details
        </Button>
      </div>
    </div>
  );
}