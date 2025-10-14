/**
 * EXAMPLE: How to integrate Toast notifications and error handling
 *
 * This file demonstrates best practices for using the error handling system
 * throughout the AutoQuanta application.
 *
 * Copy these patterns to integrate into existing components.
 */

'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { uploadCSV, apiClient } from '@/lib/api-client';
import { parseApiError, validateCSVFile } from '@/lib/api-error-handler';
import { InlineLoading, LoadingSpinner } from '@/components/ui/LoadingStates';

/**
 * Example 1: File Upload with Toast Notifications
 */
export function FileUploadExample() {
  const { success, error, info } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    // Validate file before uploading
    const validation = validateCSVFile(file);
    if (!validation.valid) {
      error('Invalid File', validation.message);
      return;
    }

    info('Uploading File', 'Processing your CSV file...');
    setIsUploading(true);

    try {
      const response = await uploadCSV('/profile', file, {}, {
        timeout: 60000,
        onSuccess: (data) => {
          success(
            'Upload Complete',
            `Successfully processed ${data.basic_info?.rows || 0} rows`,
            5000
          );
        },
        onError: (err) => {
          error('Upload Failed', err.userMessage || err.message, 7000);
        },
      });

      // Process response...
      console.log('Upload successful:', response);
    } catch (err: any) {
      // Error already shown by onError callback
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
        disabled={isUploading}
      />
      {isUploading && <InlineLoading message="Uploading file..." />}
    </div>
  );
}

/**
 * Example 2: API Call with Manual Error Handling
 */
export function ManualErrorHandlingExample() {
  const { success, error, warning } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);

    try {
      const data = await apiClient('/models', {
        timeout: 10000,
        retry: { maxRetries: 2 },
      });

      if (data.models && data.models.length === 0) {
        warning(
          'No Models Found',
          'You need to train a model first before making predictions.',
          6000
        );
      } else {
        success('Models Loaded', `Found ${data.models.length} trained models`);
      }

      return data;
    } catch (err: any) {
      const apiError = parseApiError(err);
      error('Failed to Load Models', apiError.userMessage, 7000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button onClick={fetchData} disabled={isLoading}>
      {isLoading ? <LoadingSpinner size="sm" /> : 'Load Models'}
    </button>
  );
}

/**
 * Example 3: Training with Progress Updates
 */
export function TrainingWithToastsExample() {
  const { success, error, info } = useToast();
  const [isTraining, setIsTraining] = useState(false);

  const startTraining = async (csvFile: File, config: any) => {
    info('Starting Training', 'Initializing model training...', 3000);
    setIsTraining(true);

    try {
      const response = await uploadCSV(
        '/train',
        csvFile,
        { config: JSON.stringify(config) },
        {
          timeout: 300000, // 5 minutes
          onSuccess: (data) => {
            success(
              'Training Complete!',
              `Best model: ${data.results?.best_model?.model_name || 'Unknown'}`,
              8000
            );
          },
          onError: (err) => {
            error('Training Failed', err.userMessage || err.message, 10000);
          },
        }
      );

      return response;
    } catch (err: any) {
      // Error already handled by onError
      console.error('Training error:', err);
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div>
      {/* Training UI */}
      {isTraining && <InlineLoading message="Training in progress..." />}
    </div>
  );
}

/**
 * Example 4: Form Validation with Inline Errors
 */
export function FormValidationExample() {
  const { error } = useToast();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (values: any) => {
    const errors: Record<string, string> = {};

    if (!values.targetColumn) {
      errors.targetColumn = 'Target column is required';
    }

    if (!values.taskType) {
      errors.taskType = 'Please select a task type';
    }

    if (values.testSize < 0.1 || values.testSize > 0.9) {
      errors.testSize = 'Test size must be between 0.1 and 0.9';
    }

    if (Object.keys(errors).length > 0) {
      error('Form Validation Failed', 'Please fix the errors and try again.');
      setFormErrors(errors);
      return false;
    }

    setFormErrors({});
    return true;
  };

  const handleSubmit = (values: any) => {
    if (!validateForm(values)) {
      return;
    }

    // Proceed with submission
  };

  return (
    <form>
      {/* Form fields with inline error display */}
      {formErrors.targetColumn && (
        <p className="text-sm text-red-600 mt-1">{formErrors.targetColumn}</p>
      )}
    </form>
  );
}

/**
 * Example 5: Batch Operations with Progress
 */
export function BatchOperationsExample() {
  const { success, error, info } = useToast();
  const [progress, setProgress] = useState(0);

  const processBatch = async (items: any[]) => {
    info('Processing Batch', `Processing ${items.length} items...`, 3000);

    let completed = 0;
    const errors: any[] = [];

    for (const item of items) {
      try {
        await apiClient(`/process/${item.id}`, {
          method: 'POST',
          timeout: 30000,
        });

        completed++;
        setProgress((completed / items.length) * 100);
      } catch (err) {
        errors.push({ item, error: err });
      }
    }

    if (errors.length === 0) {
      success('Batch Complete', `Successfully processed all ${items.length} items`);
    } else if (completed > 0) {
      error(
        'Partial Success',
        `Processed ${completed}/${items.length} items. ${errors.length} failed.`,
        10000
      );
    } else {
      error('Batch Failed', 'All items failed to process', 10000);
    }

    setProgress(0);
  };

  return <div>{/* Batch processing UI */}</div>;
}

/**
 * INTEGRATION CHECKLIST:
 *
 * 1. Import useToast hook:
 *    import { useToast } from '@/components/ui/toast';
 *
 * 2. Initialize in component:
 *    const { success, error, warning, info } = useToast();
 *
 * 3. Use in API calls:
 *    - Show info toast when starting operation
 *    - Show success toast on completion
 *    - Show error toast on failure
 *
 * 4. Replace console.log with appropriate toasts:
 *    - console.log('Success') → success(title, message)
 *    - console.error('Error') → error(title, message)
 *    - console.warn('Warning') → warning(title, message)
 *
 * 5. Use LoadingStates components:
 *    - <InlineLoading /> for section loading
 *    - <LoadingSpinner /> for small loaders
 *    - <ProgressBar /> for progress tracking
 *
 * 6. Replace alert() with toasts:
 *    - alert('Success') → success(title, message)
 *    - alert('Error') → error(title, message)
 *
 * 7. Add form validation:
 *    - Use inline error messages
 *    - Show toast for form-level errors
 *
 * 8. Handle network errors:
 *    - Use apiClient or uploadCSV helpers
 *    - Errors are automatically parsed and shown
 */
