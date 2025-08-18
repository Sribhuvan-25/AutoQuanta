'use client';

import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tauriAPI } from '@/lib/tauri';
import { useAppDispatch } from '@/store/hooks';
import { processCSVFile } from '@/store/slices/dataSlice';

interface FileUploadState {
  file: File | null;
  filePath: string | null;
  isUploading: boolean;
  progress: number;
  error: string | null;
  isValid: boolean;
}

interface FileUploadState {
  file: File | null;
  filePath: string | null;
  isUploading: boolean;
  progress: number;
  error: string | null;
  isValid: boolean;
}

interface FileUploadProps {
  onFileSelect: (filePath: string, fileInfo?: { name: string; size: number; type: string }) => void;
  onError?: (error: string) => void;
  onValidationFailed?: (errors: string[]) => void;

  onProcessingComplete?: (processedData: unknown) => void;
  acceptedExtensions?: string[];
  maxSizeBytes?: number;
  title?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  autoProcess?: boolean; // Automatically process the file through Redux

}

export function FileUpload({
  onFileSelect,
  onError,
  onValidationFailed,
  onProcessingComplete,

  acceptedExtensions = ['csv'],
  maxSizeBytes = 50 * 1024 * 1024, // 50MB default
  title = 'Upload File',
  description = 'Drag and drop a file here, or click to browse',
  className,
  disabled = false,
  autoProcess = true
}: FileUploadProps) {
  const dispatch = useAppDispatch();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<FileUploadState>({
    file: null,
    filePath: null,
    isUploading: false,
    progress: 0,
    error: null,
    isValid: false
  });

  // File validation function
  const validateFile = useCallback((file: File): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !acceptedExtensions.includes(extension)) {
      errors.push(`File type not supported. Accepted formats: ${acceptedExtensions.join(', ').toUpperCase()}`);
    }
    
    // Check file size
    if (file.size > maxSizeBytes) {
      const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      errors.push(`File too large (${fileSizeMB}MB). Maximum size: ${maxSizeMB}MB`);
    }
    
    // Check for empty file
    if (file.size === 0) {
      errors.push('File is empty');
    }
    
    return { isValid: errors.length === 0, errors };
  }, [acceptedExtensions, maxSizeBytes]);

  // Process file after validation
  const processFile = useCallback(async (file: File) => {
    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null
    }));

    try {
      setUploadState(prev => ({ ...prev, progress: 10 }));
      
      // Read file content
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });

      setUploadState(prev => ({ ...prev, progress: 30 }));

      // Create a temporary file path for browser mode
      const tempFilePath = `browser://${file.name}`;
      
      setUploadState(prev => ({ ...prev, progress: 50 }));

      // If auto-processing is enabled, process through Redux
      if (autoProcess) {
        try {
          // Dispatch Redux action to process the CSV
          const resultAction = await dispatch(processCSVFile({
            filePath: tempFilePath,
            fileInfo: {
              name: file.name,
              size: file.size,
              type: file.type
            }
          }));

          if (processCSVFile.fulfilled.match(resultAction)) {
            setUploadState(prev => ({ ...prev, progress: 90 }));
            onProcessingComplete?.(resultAction.payload);
          } else {
            throw new Error('Failed to process CSV data');
          }
        } catch (reduxError) {
          console.warn('Redux processing failed, continuing with basic upload:', reduxError);
        }
      }

      setUploadState(prev => ({ ...prev, progress: 100 }));
      
      setUploadState(prev => ({
        ...prev,
        file,
        filePath: tempFilePath,
        isUploading: false,
        isValid: true
      }));

      // Store the file content in localStorage for now (since we can't write to disk in browser)
      try {
        localStorage.setItem(`file_content_${file.name}`, fileContent);
      } catch (storageError) {
        console.warn('Failed to store file content in localStorage:', storageError);
      }

      onFileSelect(tempFilePath, {
        name: file.name,
        size: file.size,
        type: file.type
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file';
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage
      }));
      onError?.(errorMessage);
    }
  }, [onFileSelect, onError, onProcessingComplete, autoProcess, dispatch]);

  // Handle file selection from browser dialog or Tauri dialog
  const handleFileSelect = useCallback(async () => {
    if (disabled) return;
    
    // Check if we're in Tauri environment
    const isTauri = typeof window !== 'undefined' && (window as unknown as { __TAURI__?: boolean }).__TAURI__;
    
    if (isTauri) {
      // Tauri file dialog
      try {
        setUploadState(prev => ({ ...prev, isUploading: true, progress: 0 }));
        
        const filePath = await tauriAPI.selectCSVFile();
        if (filePath) {
          setUploadState(prev => ({ ...prev, progress: 30 }));
          
          // Read file content through Tauri
          const fileContent = await tauriAPI.readCSVFile(filePath);
          setUploadState(prev => ({ ...prev, progress: 60 }));
          
          const fileName = filePath.split(/[/\\]/).pop() || '';
          
          // Process through Redux if enabled
          if (autoProcess) {
            try {
              const resultAction = await dispatch(processCSVFile({
                filePath,
                fileInfo: {
                  name: fileName,
                  size: fileContent.length,
                  type: 'text/csv'
                }
              }));

              if (processCSVFile.fulfilled.match(resultAction)) {
                onProcessingComplete?.(resultAction.payload);
              }
            } catch (reduxError) {
              console.warn('Redux processing failed:', reduxError);
            }
          }
          
          setUploadState(prev => ({
            ...prev,
            filePath,
            isValid: true,
            isUploading: false,
            progress: 100
          }));
          
          onFileSelect(filePath, { 
            name: fileName, 
            size: fileContent.length, 
            type: 'text/csv' 
          });
        } else {
          setUploadState(prev => ({ ...prev, isUploading: false }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to select file';
        setUploadState(prev => ({ 
          ...prev, 
          error: errorMessage, 
          isUploading: false 
        }));
        onError?.(errorMessage);
      }
    } else {
      // Browser file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = acceptedExtensions.map(ext => `.${ext}`).join(',');
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const validation = validateFile(file);
          if (!validation.isValid) {
            setUploadState(prev => ({ ...prev, error: validation.errors[0] }));
            onValidationFailed?.(validation.errors);
            return;
          }
          await processFile(file);
        }
      };
      
      input.click();
    }
  }, [onFileSelect, onError, disabled, acceptedExtensions, validateFile, processFile, onValidationFailed, autoProcess, dispatch, onProcessingComplete]);


  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !uploadState.isUploading) {
      setIsDragOver(true);
    }
  }, [disabled, uploadState.isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled || uploadState.isUploading) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    const file = files[0];
    const validation = validateFile(file);
    
    if (!validation.isValid) {
      setUploadState(prev => ({ ...prev, error: validation.errors[0] }));
      onValidationFailed?.(validation.errors);
      return;
    }
    
    await processFile(file);
  }, [disabled, uploadState.isUploading, validateFile, processFile, onValidationFailed]);

  // Clear file and reset state
  const clearFile = useCallback(() => {
    setUploadState({
      file: null,
      filePath: null,
      isUploading: false,
      progress: 0,
      error: null,
      isValid: false
    });
  }, []);

  // Format file size helper
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('w-full', className)}>
      {/* File selected/uploaded state */}
      {uploadState.isValid && uploadState.filePath ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-x-3">
              <div className="relative">
                <FileText className="h-5 w-5 text-gray-400" />
                <CheckCircle className="absolute -top-1 -right-1 h-3 w-3 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {uploadState.file?.name || uploadState.filePath?.split('/').pop()}
                </p>
                <div className="flex items-center gap-x-2 text-xs text-gray-500">
                  <span>File uploaded successfully</span>
                  {uploadState.file && (
                    <span>• {formatFileSize(uploadState.file.size)}</span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFile}
              className="text-gray-400 hover:text-gray-600"
              disabled={uploadState.isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'relative rounded-lg border-2 border-dashed p-6 text-center transition-colors',
            uploadState.isUploading && 'pointer-events-none opacity-50',
            disabled && 'pointer-events-none opacity-50',
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : uploadState.error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 hover:border-gray-400'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Upload icon/state */}
          <div className="mx-auto mb-4">
            {uploadState.isUploading ? (
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            ) : uploadState.error ? (
              <AlertCircle className="h-12 w-12 text-red-500" />
            ) : (
              <Upload className="h-12 w-12 text-gray-400" />
            )}
          </div>

          {/* Content */}
          <div>
            <h3 className={cn(
              'text-lg font-medium',
              uploadState.error ? 'text-red-900' : 'text-gray-900'
            )}>
              {uploadState.isUploading ? 'Processing File...' : 
               uploadState.error ? 'Upload Failed' : title}
            </h3>
            
            <p className={cn(
              'mt-2 text-sm',
              uploadState.error ? 'text-red-600' : 'text-gray-500'
            )}>
              {uploadState.isUploading 
                ? `Uploading... ${uploadState.progress}%`
                : uploadState.error 
                ? uploadState.error
                : description}
            </p>
          </div>

          {/* Progress bar */}
          {uploadState.isUploading && (
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
          )}

          {/* Action button */}
          {!uploadState.isUploading && (
            <div className="mt-6">
              <Button 
                onClick={uploadState.error ? clearFile : handleFileSelect} 
                variant={uploadState.error ? "destructive" : "outline"}
                disabled={disabled}
              >
                {uploadState.error ? 'Try Again' : 'Browse Files'}
              </Button>
            </div>
          )}

          {/* File format info */}
          {!uploadState.error && (
            <div className="mt-2 text-xs text-gray-400">
              <p>Supported formats: {acceptedExtensions.join(', ').toUpperCase()}</p>
              <p>Maximum size: {(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
