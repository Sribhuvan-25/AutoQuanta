'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Download,
  FileJson,
  FileText,
  Code,
  Package,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModelDocExporterProps {
  modelData: any;
  className?: string;
}

export interface ModelDocConfig {
  format: 'markdown' | 'json' | 'yaml' | 'python';
  includeHyperparameters: boolean;
  includeTrainingHistory: boolean;
  includeFeatureInfo: boolean;
  includeUsageExamples: boolean;
  includeDeploymentInfo: boolean;
}

const EXPORT_FORMATS = [
  {
    id: 'markdown',
    name: 'Markdown',
    icon: <FileText className="h-5 w-5" />,
    description: 'Human-readable documentation',
    extension: '.md',
    color: 'blue'
  },
  {
    id: 'json',
    name: 'JSON',
    icon: <FileJson className="h-5 w-5" />,
    description: 'Machine-readable metadata',
    extension: '.json',
    color: 'green'
  },
  {
    id: 'yaml',
    name: 'YAML',
    icon: <Code className="h-5 w-5" />,
    description: 'Configuration format',
    extension: '.yaml',
    color: 'purple'
  },
  {
    id: 'python',
    name: 'Python Script',
    icon: <Package className="h-5 w-5" />,
    description: 'Deployment code template',
    extension: '.py',
    color: 'amber'
  }
];

export function ModelDocExporter({
  modelData,
  className
}: ModelDocExporterProps) {
  const [selectedFormat, setSelectedFormat] = useState<'markdown' | 'json' | 'yaml' | 'python'>('markdown');
  const [includeHyperparameters, setIncludeHyperparameters] = useState(true);
  const [includeTrainingHistory, setIncludeTrainingHistory] = useState(true);
  const [includeFeatureInfo, setIncludeFeatureInfo] = useState(true);
  const [includeUsageExamples, setIncludeUsageExamples] = useState(true);
  const [includeDeploymentInfo, setIncludeDeploymentInfo] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const currentFormat = EXPORT_FORMATS.find(f => f.id === selectedFormat);

  const generateMarkdown = () => {
    const sections = [];

    sections.push(`# ${modelData?.model_name || 'ML Model'} Documentation\n`);
    sections.push(`**Model Type:** ${modelData?.model_type || 'N/A'}`);
    sections.push(`**Task:** ${modelData?.task_type || 'N/A'}`);
    sections.push(`**Created:** ${modelData?.created_at ? new Date(modelData.created_at).toLocaleDateString() : 'N/A'}\n`);

    sections.push(`## Overview\n`);
    sections.push(`This model was trained for ${modelData?.task_type || 'machine learning'} tasks.`);
    sections.push(`Performance score: **${modelData?.score?.toFixed(4) || 'N/A'}**\n`);

    if (includeHyperparameters && modelData?.hyperparameters) {
      sections.push(`## Hyperparameters\n`);
      sections.push('```json');
      sections.push(JSON.stringify(modelData.hyperparameters, null, 2));
      sections.push('```\n');
    }

    if (includeFeatureInfo && modelData?.feature_count) {
      sections.push(`## Features\n`);
      sections.push(`- Total features: ${modelData.feature_count}`);
      sections.push(`- Target column: ${modelData.target_column || 'N/A'}\n`);
    }

    if (includeTrainingHistory) {
      sections.push(`## Training Information\n`);
      sections.push(`- Cross-validation folds: ${modelData?.cv_folds || 5}`);
      sections.push(`- Training time: ${modelData?.training_time || 'N/A'}`);
      sections.push(`- Dataset size: ${modelData?.dataset_size || 'N/A'} samples\n`);
    }

    if (includeUsageExamples) {
      sections.push(`## Usage Example\n`);
      sections.push('```python');
      sections.push('import joblib');
      sections.push('import pandas as pd\n');
      sections.push('# Load the model');
      sections.push(`model = joblib.load('${modelData?.model_name || 'model'}.pkl')\n`);
      sections.push('# Prepare your data');
      sections.push('data = pd.DataFrame({');
      sections.push('    # Your features here');
      sections.push('})\n');
      sections.push('# Make predictions');
      sections.push('predictions = model.predict(data)');
      sections.push('```\n');
    }

    if (includeDeploymentInfo) {
      sections.push(`## Deployment\n`);
      sections.push(`### Requirements\n`);
      sections.push('```');
      sections.push('scikit-learn>=1.0.0');
      sections.push('pandas>=1.3.0');
      sections.push('numpy>=1.21.0');
      sections.push('```\n');
      sections.push('### API Endpoint Example\n');
      sections.push('```python');
      sections.push('from fastapi import FastAPI');
      sections.push('import joblib\n');
      sections.push('app = FastAPI()');
      sections.push(`model = joblib.load('${modelData?.model_name || 'model'}.pkl')\n`);
      sections.push('@app.post("/predict")');
      sections.push('def predict(data: dict):');
      sections.push('    prediction = model.predict([list(data.values())])');
      sections.push('    return {"prediction": prediction[0]}');
      sections.push('```\n');
    }

    return sections.join('\n');
  };

  const generateJSON = () => {
    const doc: any = {
      model_info: {
        name: modelData?.model_name || 'model',
        type: modelData?.model_type || 'unknown',
        task: modelData?.task_type || 'unknown',
        version: modelData?.version || '1.0',
        created_at: modelData?.created_at || new Date().toISOString(),
        score: modelData?.score || 0
      }
    };

    if (includeHyperparameters && modelData?.hyperparameters) {
      doc.hyperparameters = modelData.hyperparameters;
    }

    if (includeFeatureInfo) {
      doc.features = {
        count: modelData?.feature_count || 0,
        target: modelData?.target_column || null,
        names: modelData?.feature_names || []
      };
    }

    if (includeTrainingHistory) {
      doc.training = {
        cv_folds: modelData?.cv_folds || 5,
        training_time: modelData?.training_time || null,
        dataset_size: modelData?.dataset_size || null
      };
    }

    if (includeUsageExamples) {
      doc.usage = {
        language: 'python',
        example: `model = joblib.load('${modelData?.model_name || 'model'}.pkl')\npredictions = model.predict(data)`
      };
    }

    if (includeDeploymentInfo) {
      doc.deployment = {
        requirements: ['scikit-learn>=1.0.0', 'pandas>=1.3.0', 'numpy>=1.21.0'],
        framework: 'scikit-learn',
        python_version: '3.8+'
      };
    }

    return JSON.stringify(doc, null, 2);
  };

  const generateYAML = () => {
    const lines = [];

    lines.push('model_info:');
    lines.push(`  name: ${modelData?.model_name || 'model'}`);
    lines.push(`  type: ${modelData?.model_type || 'unknown'}`);
    lines.push(`  task: ${modelData?.task_type || 'unknown'}`);
    lines.push(`  version: ${modelData?.version || '1.0'}`);
    lines.push(`  score: ${modelData?.score || 0}\n`);

    if (includeHyperparameters && modelData?.hyperparameters) {
      lines.push('hyperparameters:');
      Object.entries(modelData.hyperparameters).forEach(([key, value]) => {
        lines.push(`  ${key}: ${value}`);
      });
      lines.push('');
    }

    if (includeFeatureInfo) {
      lines.push('features:');
      lines.push(`  count: ${modelData?.feature_count || 0}`);
      lines.push(`  target: ${modelData?.target_column || 'null'}\n`);
    }

    if (includeTrainingHistory) {
      lines.push('training:');
      lines.push(`  cv_folds: ${modelData?.cv_folds || 5}`);
      lines.push(`  dataset_size: ${modelData?.dataset_size || 'null'}\n`);
    }

    if (includeDeploymentInfo) {
      lines.push('deployment:');
      lines.push('  requirements:');
      lines.push('    - scikit-learn>=1.0.0');
      lines.push('    - pandas>=1.3.0');
      lines.push('    - numpy>=1.21.0');
    }

    return lines.join('\n');
  };

  const generatePython = () => {
    const lines = [];

    lines.push('"""');
    lines.push(`${modelData?.model_name || 'Model'} Deployment Script`);
    lines.push('');
    lines.push('This script provides a template for deploying your trained model.');
    lines.push('"""');
    lines.push('');
    lines.push('import joblib');
    lines.push('import pandas as pd');
    lines.push('import numpy as np');
    lines.push('from typing import Union, List, Dict');
    lines.push('');
    lines.push('');
    lines.push('class ModelPredictor:');
    lines.push('    """Wrapper class for model predictions"""');
    lines.push('    ');
    lines.push('    def __init__(self, model_path: str):');
    lines.push('        """Load the trained model"""');
    lines.push('        self.model = joblib.load(model_path)');
    lines.push(`        self.model_name = "${modelData?.model_name || 'model'}"`);
    lines.push(`        self.model_type = "${modelData?.model_type || 'unknown'}"`);
    lines.push('    ');
    lines.push('    def predict(self, data: Union[pd.DataFrame, np.ndarray, List]) -> np.ndarray:');
    lines.push('        """Make predictions on input data"""');
    lines.push('        if isinstance(data, list):');
    lines.push('            data = pd.DataFrame(data)');
    lines.push('        ');
    lines.push('        predictions = self.model.predict(data)');
    lines.push('        return predictions');
    lines.push('    ');
    lines.push('    def predict_proba(self, data: Union[pd.DataFrame, np.ndarray, List]) -> np.ndarray:');
    lines.push('        """Get prediction probabilities (if supported)"""');
    lines.push('        if isinstance(data, list):');
    lines.push('            data = pd.DataFrame(data)');
    lines.push('        ');
    lines.push('        if hasattr(self.model, "predict_proba"):');
    lines.push('            return self.model.predict_proba(data)');
    lines.push('        else:');
    lines.push('            raise NotImplementedError("Model does not support probability predictions")');
    lines.push('');
    lines.push('');
    lines.push('if __name__ == "__main__":');
    lines.push('    # Example usage');
    lines.push(`    predictor = ModelPredictor("${modelData?.model_name || 'model'}.pkl")`);
    lines.push('    ');
    lines.push('    # Sample data');
    lines.push('    sample_data = {');
    lines.push('        # Add your feature columns here');
    lines.push('    }');
    lines.push('    ');
    lines.push('    # Make prediction');
    lines.push('    predictions = predictor.predict([sample_data])');
    lines.push('    print(f"Prediction: {predictions[0]}")');

    return lines.join('\n');
  };

  const handleExport = () => {
    setIsExporting(true);

    let content = '';
    let filename = `${modelData?.model_name || 'model'}_documentation${currentFormat?.extension}`;

    switch (selectedFormat) {
      case 'markdown':
        content = generateMarkdown();
        break;
      case 'json':
        content = generateJSON();
        break;
      case 'yaml':
        content = generateYAML();
        break;
      case 'python':
        content = generatePython();
        break;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    setTimeout(() => setIsExporting(false), 500);
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-indigo-600" />
          <h3 className="text-xl font-semibold text-gray-900">Model Documentation Export</h3>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export Documentation
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Export Format
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {EXPORT_FORMATS.map(format => (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id as any)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all text-left',
                  selectedFormat === format.id
                    ? `border-${format.color}-500 bg-${format.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className={cn(
                  'p-2 rounded-lg mb-2 inline-flex',
                  selectedFormat === format.id
                    ? `bg-${format.color}-600 text-white`
                    : 'bg-gray-100 text-gray-600'
                )}>
                  {format.icon}
                </div>
                <h4 className={cn(
                  'font-medium text-sm mb-1',
                  selectedFormat === format.id
                    ? `text-${format.color}-900`
                    : 'text-gray-900'
                )}>
                  {format.name}
                </h4>
                <p className="text-xs text-gray-600">{format.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Documentation Sections
          </label>

          <div className="space-y-2">
            {[
              { key: 'hyperparameters', label: 'Hyperparameters', desc: 'Model configuration and settings', state: includeHyperparameters, setState: setIncludeHyperparameters },
              { key: 'training', label: 'Training History', desc: 'Training process and cross-validation info', state: includeTrainingHistory, setState: setIncludeTrainingHistory },
              { key: 'features', label: 'Feature Information', desc: 'Input features and target column details', state: includeFeatureInfo, setState: setIncludeFeatureInfo },
              { key: 'usage', label: 'Usage Examples', desc: 'Code examples for using the model', state: includeUsageExamples, setState: setIncludeUsageExamples },
              { key: 'deployment', label: 'Deployment Info', desc: 'Dependencies and deployment guidelines', state: includeDeploymentInfo, setState: setIncludeDeploymentInfo },
            ].map(section => (
              <div
                key={section.key}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => section.setState(!section.state)}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className={cn(
                    'h-5 w-5',
                    section.state ? 'text-green-600 fill-green-600' : 'text-gray-300'
                  )} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{section.label}</p>
                    <p className="text-xs text-gray-600">{section.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <div className="flex items-start gap-2">
            <FileText className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-indigo-900 mb-1">
                Export Summary
              </p>
              <ul className="text-xs text-indigo-700 space-y-1 ml-4 list-disc">
                <li>Format: <strong>{currentFormat?.name}</strong> ({currentFormat?.extension})</li>
                <li>Sections: <strong>{[includeHyperparameters, includeTrainingHistory, includeFeatureInfo, includeUsageExamples, includeDeploymentInfo].filter(Boolean).length}/5</strong> included</li>
                <li>File: <strong>{modelData?.model_name || 'model'}_documentation{currentFormat?.extension}</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
