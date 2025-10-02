'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  FileText,
  Download,
  CheckSquare,
  Image as ImageIcon,
  BarChart3,
  Settings,
  Eye,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReportSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  included: boolean;
}

interface PDFReportGeneratorProps {
  modelData: any;
  trainingResults: any;
  onGenerateReport?: (config: ReportConfig) => Promise<void>;
  className?: string;
}

export interface ReportConfig {
  title: string;
  author: string;
  includeSections: string[];
  includeCharts: boolean;
  includeCode: boolean;
  includeRawData: boolean;
  colorScheme: 'default' | 'professional' | 'minimal';
  pageSize: 'A4' | 'Letter';
}

const DEFAULT_SECTIONS: ReportSection[] = [
  {
    id: 'executive_summary',
    title: 'Executive Summary',
    description: 'High-level overview of model performance and key insights',
    icon: <FileText className="h-4 w-4" />,
    included: true
  },
  {
    id: 'data_overview',
    title: 'Data Overview',
    description: 'Dataset statistics, distributions, and quality metrics',
    icon: <BarChart3 className="h-4 w-4" />,
    included: true
  },
  {
    id: 'preprocessing',
    title: 'Preprocessing Steps',
    description: 'Data cleaning, transformations, and feature engineering',
    icon: <Settings className="h-4 w-4" />,
    included: true
  },
  {
    id: 'model_architecture',
    title: 'Model Architecture',
    description: 'Model type, hyperparameters, and configuration details',
    icon: <Settings className="h-4 w-4" />,
    included: true
  },
  {
    id: 'training_process',
    title: 'Training Process',
    description: 'Training methodology, cross-validation, and optimization',
    icon: <BarChart3 className="h-4 w-4" />,
    included: true
  },
  {
    id: 'performance_metrics',
    title: 'Performance Metrics',
    description: 'Accuracy, precision, recall, and other evaluation metrics',
    icon: <BarChart3 className="h-4 w-4" />,
    included: true
  },
  {
    id: 'visualizations',
    title: 'Visualizations',
    description: 'Charts, confusion matrix, ROC curves, and feature importance',
    icon: <ImageIcon className="h-4 w-4" />,
    included: true
  },
  {
    id: 'feature_importance',
    title: 'Feature Importance',
    description: 'Analysis of feature contributions and relevance',
    icon: <BarChart3 className="h-4 w-4" />,
    included: true
  },
  {
    id: 'recommendations',
    title: 'Recommendations',
    description: 'Suggestions for model improvement and deployment',
    icon: <FileText className="h-4 w-4" />,
    included: true
  },
  {
    id: 'technical_details',
    title: 'Technical Details',
    description: 'Implementation code, dependencies, and reproducibility info',
    icon: <FileText className="h-4 w-4" />,
    included: false
  }
];

export function PDFReportGenerator({
  modelData,
  trainingResults,
  onGenerateReport,
  className
}: PDFReportGeneratorProps) {
  const [sections, setSections] = useState<ReportSection[]>(DEFAULT_SECTIONS);
  const [reportTitle, setReportTitle] = useState('ML Model Report');
  const [author, setAuthor] = useState('');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeCode, setIncludeCode] = useState(false);
  const [includeRawData, setIncludeRawData] = useState(false);
  const [colorScheme, setColorScheme] = useState<'default' | 'professional' | 'minimal'>('professional');
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(section =>
      section.id === id ? { ...section, included: !section.included } : section
    ));
  };

  const selectAllSections = () => {
    setSections(prev => prev.map(section => ({ ...section, included: true })));
  };

  const deselectAllSections = () => {
    setSections(prev => prev.map(section => ({ ...section, included: false })));
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);

    const config: ReportConfig = {
      title: reportTitle,
      author,
      includeSections: sections.filter(s => s.included).map(s => s.id),
      includeCharts,
      includeCode,
      includeRawData,
      colorScheme,
      pageSize
    };

    try {
      await onGenerateReport?.(config);
    } catch (error) {
      console.error('Report generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedCount = sections.filter(s => s.included).length;

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-red-600" />
          <h3 className="text-xl font-semibold text-gray-900">PDF Report Generator</h3>
        </div>
        <Button
          onClick={handleGenerateReport}
          disabled={selectedCount === 0 || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Generate PDF
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Title
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter report title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Author (Optional)
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter author name..."
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Report Sections ({selectedCount} selected)
            </label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllSections}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAllSections}>
                Deselect All
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sections.map(section => (
              <div
                key={section.id}
                onClick={() => toggleSection(section.id)}
                className={cn(
                  'p-3 rounded-lg border-2 cursor-pointer transition-all',
                  section.included
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-0.5',
                    section.included ? 'text-red-600' : 'text-gray-400'
                  )}>
                    <CheckSquare className={cn(
                      'h-5 w-5',
                      section.included && 'fill-red-600'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      'font-medium text-sm mb-1',
                      section.included ? 'text-red-900' : 'text-gray-900'
                    )}>
                      {section.title}
                    </h4>
                    <p className="text-xs text-gray-600">
                      {section.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Report Options
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ImageIcon className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Include Charts & Visualizations</p>
                  <p className="text-xs text-gray-600">Add all generated charts to the report</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Include Code Snippets</p>
                  <p className="text-xs text-gray-600">Add implementation code and examples</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeCode}
                onChange={(e) => setIncludeCode(e.target.checked)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Include Raw Data Tables</p>
                  <p className="text-xs text-gray-600">Add detailed metric tables and statistics</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeRawData}
                onChange={(e) => setIncludeRawData(e.target.checked)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Scheme
            </label>
            <select
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="default">Default (Colorful)</option>
              <option value="professional">Professional (Blue/Gray)</option>
              <option value="minimal">Minimal (Black/White)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Page Size
            </label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="Letter">Letter (8.5 × 11 in)</option>
            </select>
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Eye className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                Report Preview
              </p>
              <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                <li>{selectedCount} sections included</li>
                <li>{includeCharts ? 'With' : 'Without'} charts and visualizations</li>
                <li>{includeCode ? 'With' : 'Without'} code snippets</li>
                <li>{includeRawData ? 'With' : 'Without'} raw data tables</li>
                <li>{colorScheme.charAt(0).toUpperCase() + colorScheme.slice(1)} color scheme on {pageSize} paper</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
