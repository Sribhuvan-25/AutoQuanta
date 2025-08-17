'use client';

import React, { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tauriAPI } from '@/lib/tauri';

interface FileUploadProps {
  onFileSelect: (filePath: string) => void;
  acceptedExtensions?: string[];
  title?: string;
  description?: string;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  acceptedExtensions = ['csv'],
  title = 'Upload File',
  description = 'Drag and drop a file here, or click to browse',
  className
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleFileSelect = useCallback(async () => {
    try {
      const filePath = await tauriAPI.selectCSVFile();
      if (filePath) {
        setSelectedFile(filePath);
        onFileSelect(filePath);
      }
    } catch (error) {
      console.error('Error selecting file:', error);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (acceptedExtensions.includes(extension || '')) {
        // In a real Tauri app, you'd need to handle file paths differently
        // For now, we'll just use the file name
        setSelectedFile(file.name);
        onFileSelect(file.name);
      }
    }
  }, [acceptedExtensions, onFileSelect]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return (
    <div className={cn('w-full', className)}>
      {selectedFile ? (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-x-3">
            <FileText className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedFile}</p>
              <p className="text-xs text-gray-500">File selected</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFile}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'relative rounded-lg border-2 border-dashed p-6 text-center transition-colors',
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-500">{description}</p>
          </div>
          <div className="mt-6">
            <Button onClick={handleFileSelect} variant="outline">
              Browse Files
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Supported formats: {acceptedExtensions.join(', ').toUpperCase()}
          </p>
        </div>
      )}
    </div>
  );
}
