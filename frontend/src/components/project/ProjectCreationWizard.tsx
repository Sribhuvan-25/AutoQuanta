'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Folder, User, FileText, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { tauriAPI } from '@/lib/tauri';
import type { CreateProjectRequest } from '@/lib/project-types';

interface ProjectCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (projectConfig: any) => void;
}

interface FormData {
  name: string;
  description: string;
  parentDirectory: string;
  author: string;
}

interface FormErrors {
  name?: string;
  parentDirectory?: string;
}

export function ProjectCreationWizard({ isOpen, onClose, onProjectCreated }: ProjectCreationWizardProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    parentDirectory: '',
    author: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isSelectingDirectory, setIsSelectingDirectory] = useState(false);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9\s-_]+$/.test(formData.name)) {
      newErrors.name = 'Project name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    
    if (!formData.parentDirectory.trim()) {
      newErrors.parentDirectory = 'Please select a directory for your project';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectDirectory = async () => {
    setIsSelectingDirectory(true);
    try {
      const selectedDirectory = await tauriAPI.selectProjectDirectory();
      if (selectedDirectory) {
        setFormData(prev => ({ ...prev, parentDirectory: selectedDirectory }));
        setErrors(prev => ({ ...prev, parentDirectory: undefined }));
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
    } finally {
      setIsSelectingDirectory(false);
    }
  };

  const handleCreateProject = async () => {
    if (!validateForm()) return;
    
    setIsCreating(true);
    try {
      const createRequest: CreateProjectRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        parentDirectory: formData.parentDirectory,
        author: formData.author.trim() || undefined,
      };
      
      const result = await tauriAPI.createProject(createRequest);
      
      if (result.success && result.projectConfig) {
        onProjectCreated(result.projectConfig);
        onClose();
        // Reset form
        setFormData({ name: '', description: '', parentDirectory: '', author: '' });
        setErrors({});
      } else {
        setErrors({ name: result.error || 'Failed to create project' });
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setErrors({ name: 'Unexpected error occurred while creating project' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getProjectPath = () => {
    if (formData.parentDirectory && formData.name) {
      return `${formData.parentDirectory}/${formData.name.replace(/\s+/g, '_')}`;
    }
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/30 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Folder className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
              <p className="text-sm text-gray-600 mt-1">
                Set up a new AutoQuanta project with organized directory structure
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isCreating}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Project Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4" />
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="My ML Project"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isCreating}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Project Directory */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Folder className="h-4 w-4" />
              Project Location *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.parentDirectory}
                placeholder="Select directory where project will be created"
                className={`flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-gray-700 ${
                  errors.parentDirectory ? 'border-red-300' : 'border-gray-300'
                }`}
                readOnly
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSelectDirectory}
                disabled={isCreating || isSelectingDirectory}
              >
                {isSelectingDirectory ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Folder className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.parentDirectory && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {errors.parentDirectory}
              </p>
            )}
          </div>

          {/* Project Path Preview */}
          {getProjectPath() && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Project will be created at:</strong><br />
                <code className="text-blue-900">{getProjectPath()}</code>
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={handleInputChange('description')}
              placeholder="Brief description of your machine learning project..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isCreating}
            />
          </div>

          {/* Author */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4" />
              Author (optional)
            </label>
            <input
              type="text"
              value={formData.author}
              onChange={handleInputChange('author')}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isCreating}
            />
          </div>

          {/* Project Structure Info */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Project Structure
            </h4>
            <p className="text-xs text-gray-600 mb-2">
              The following directories will be created automatically:
            </p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <code>data/</code> - Training and validation datasets</li>
              <li>• <code>models/</code> - Trained model files</li>
              <li>• <code>results/</code> - Training results and reports</li>
              <li>• <code>predictions/</code> - Prediction outputs</li>
              <li>• <code>exports/</code> - Exported models (ONNX, etc.)</li>
            </ul>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              * Required fields
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={isCreating || !formData.name.trim() || !formData.parentDirectory}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}