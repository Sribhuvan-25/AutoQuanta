'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Tag,
  Plus,
  X,
  FileText,
  Save,
  Edit,
  Trash2,
  Check,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModelTagsNotesProps {
  modelId: string;
  tags: string[];
  notes: string;
  onTagsUpdate?: (tags: string[]) => void;
  onNotesUpdate?: (notes: string) => void;
  readonly?: boolean;
  className?: string;
}

export function ModelTagsNotes({
  modelId,
  tags: initialTags,
  notes: initialNotes,
  onTagsUpdate,
  onNotesUpdate,
  readonly = false,
  className
}: ModelTagsNotesProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [notes, setNotes] = useState(initialNotes);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [tagError, setTagError] = useState('');

  const handleAddTag = () => {
    const trimmedTag = newTag.trim().toLowerCase();

    if (!trimmedTag) {
      setTagError('Tag cannot be empty');
      return;
    }

    if (tags.includes(trimmedTag)) {
      setTagError('Tag already exists');
      return;
    }

    if (trimmedTag.length > 20) {
      setTagError('Tag must be 20 characters or less');
      return;
    }

    const updatedTags = [...tags, trimmedTag];
    setTags(updatedTags);
    setNewTag('');
    setTagError('');
    onTagsUpdate?.(updatedTags);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    onTagsUpdate?.(updatedTags);
  };

  const handleSaveNotes = () => {
    setIsEditingNotes(false);
    onNotesUpdate?.(notes);
  };

  const handleCancelNotes = () => {
    setIsEditingNotes(false);
    setNotes(initialNotes);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setNewTag('');
      setTagError('');
    }
  };

  const getTagColor = (tag: string): string => {
    // Predefined colors for common tags
    const tagColors: { [key: string]: string } = {
      'production': 'bg-green-100 text-green-700 border-green-200',
      'staging': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'experimental': 'bg-purple-100 text-purple-700 border-purple-200',
      'baseline': 'bg-blue-100 text-blue-700 border-blue-200',
      'deprecated': 'bg-red-100 text-red-700 border-red-200',
      'champion': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'challenger': 'bg-orange-100 text-orange-700 border-orange-200',
      'archived': 'bg-gray-100 text-gray-700 border-gray-200',
    };

    return tagColors[tag] || 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tags Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Tags</h3>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {tags.length}
          </span>
        </div>

        {/* Tag Input */}
        {!readonly && (
          <div className="mb-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => {
                    setNewTag(e.target.value);
                    setTagError('');
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a tag (e.g., production, experimental)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={20}
                />
                {tagError && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {tagError}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Press Enter to add, Escape to clear. Max 20 characters.
            </p>
          </div>
        )}

        {/* Tags Display */}
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-2',
                  getTagColor(tag)
                )}
              >
                <span>{tag}</span>
                {!readonly && (
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <Tag className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {readonly ? 'No tags' : 'No tags yet. Add your first tag above.'}
            </p>
          </div>
        )}

        {/* Suggested Tags */}
        {!readonly && tags.length < 3 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-2">Suggested tags:</p>
            <div className="flex flex-wrap gap-1">
              {['production', 'baseline', 'experimental', 'champion', 'staging']
                .filter(suggestedTag => !tags.includes(suggestedTag))
                .slice(0, 5)
                .map((suggestedTag) => (
                  <button
                    key={suggestedTag}
                    onClick={() => {
                      setNewTag(suggestedTag);
                      setTagError('');
                    }}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded transition-colors"
                  >
                    {suggestedTag}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Notes</h3>
          </div>
          {!readonly && !isEditingNotes && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingNotes(true)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>

        {isEditingNotes && !readonly ? (
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this model (e.g., purpose, observations, known issues)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={6}
              maxLength={1000}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                {notes.length}/1000 characters
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelNotes}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {notes ? (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {readonly ? 'No notes available' : 'No notes yet. Click Edit to add notes.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {!readonly && (tags.length > 0 || notes) && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-start gap-2">
            <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                Metadata Updated
              </p>
              <p className="text-xs text-blue-700">
                Tags and notes help organize and document your models for better collaboration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
