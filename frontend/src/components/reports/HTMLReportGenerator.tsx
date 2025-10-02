'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Code,
  Download,
  Eye,
  Globe,
  Sparkles,
  CheckSquare,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HTMLReportGeneratorProps {
  modelData: any;
  trainingResults: any;
  onGenerateReport?: (config: HTMLReportConfig) => Promise<void>;
  className?: string;
}

export interface HTMLReportConfig {
  title: string;
  includeInteractiveCharts: boolean;
  includeDarkMode: boolean;
  includeSearchFilter: boolean;
  includeDownloadButtons: boolean;
  standalone: boolean;
  template: 'modern' | 'classic' | 'dashboard';
}

const TEMPLATES = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean, card-based layout with smooth animations',
    preview: 'bg-gradient-to-br from-blue-50 to-purple-50'
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional report layout with clear sections',
    preview: 'bg-gradient-to-br from-gray-50 to-blue-50'
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Interactive dashboard with metrics and charts',
    preview: 'bg-gradient-to-br from-indigo-50 to-cyan-50'
  }
];

export function HTMLReportGenerator({
  modelData,
  trainingResults,
  onGenerateReport,
  className
}: HTMLReportGeneratorProps) {
  const [reportTitle, setReportTitle] = useState('Interactive ML Report');
  const [template, setTemplate] = useState<'modern' | 'classic' | 'dashboard'>('modern');
  const [includeInteractiveCharts, setIncludeInteractiveCharts] = useState(true);
  const [includeDarkMode, setIncludeDarkMode] = useState(true);
  const [includeSearchFilter, setIncludeSearchFilter] = useState(true);
  const [includeDownloadButtons, setIncludeDownloadButtons] = useState(true);
  const [standalone, setStandalone] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);

    const config: HTMLReportConfig = {
      title: reportTitle,
      includeInteractiveCharts,
      includeDarkMode,
      includeSearchFilter,
      includeDownloadButtons,
      standalone,
      template
    };

    try {
      await onGenerateReport?.(config);
    } catch (error) {
      console.error('HTML report generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Globe className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900">HTML Interactive Report</h3>
        </div>
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Generate HTML
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Title
          </label>
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter report title..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Report Template
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TEMPLATES.map(tmpl => (
              <button
                key={tmpl.id}
                onClick={() => setTemplate(tmpl.id as any)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all text-left',
                  template === tmpl.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className={cn('h-20 rounded-lg mb-3', tmpl.preview)} />
                <h4 className={cn(
                  'font-medium mb-1',
                  template === tmpl.id ? 'text-blue-900' : 'text-gray-900'
                )}>
                  {tmpl.name}
                </h4>
                <p className="text-xs text-gray-600">{tmpl.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Interactive Features
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Interactive Charts</p>
                  <p className="text-xs text-gray-600">Hover, zoom, and filter visualizations</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeInteractiveCharts}
                onChange={(e) => setIncludeInteractiveCharts(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Eye className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Dark Mode Toggle</p>
                  <p className="text-xs text-gray-600">Allow users to switch themes</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeDarkMode}
                onChange={(e) => setIncludeDarkMode(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Search & Filter</p>
                  <p className="text-xs text-gray-600">Search through report sections</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeSearchFilter}
                onChange={(e) => setIncludeSearchFilter(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Download className="h-4 w-4 text-indigo-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Download Buttons</p>
                  <p className="text-xs text-gray-600">Allow downloading charts and data</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeDownloadButtons}
                onChange={(e) => setIncludeDownloadButtons(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Code className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Standalone HTML</p>
                  <p className="text-xs text-gray-600">Single file with embedded resources</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={standalone}
                onChange={(e) => setStandalone(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Globe className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-2">
                Interactive Report Features:
              </p>
              <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                <li><strong>{template.charAt(0).toUpperCase() + template.slice(1)}</strong> template design</li>
                {includeInteractiveCharts && <li>Interactive, zoomable charts with tooltips</li>}
                {includeDarkMode && <li>Dark/Light mode switcher for comfortable viewing</li>}
                {includeSearchFilter && <li>Search and filter functionality</li>}
                {includeDownloadButtons && <li>Export charts as PNG and data as CSV</li>}
                {standalone && <li>Single HTML file - no external dependencies</li>}
                <li>Mobile-responsive design</li>
                <li>Print-optimized CSS</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <Sparkles className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-900">
              <p className="font-medium mb-1">💡 Tip:</p>
              <p>HTML reports are perfect for sharing with stakeholders. They can be opened in any browser, shared via email, or hosted on a web server.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
