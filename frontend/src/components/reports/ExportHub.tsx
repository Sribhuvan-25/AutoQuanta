'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Download,
  FileText,
  Globe,
  BookOpen,
  Layout,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PDFReportGenerator } from './PDFReportGenerator';
import { HTMLReportGenerator } from './HTMLReportGenerator';
import { ModelDocExporter } from './ModelDocExporter';
import { ReportTemplateBuilder } from './ReportTemplateBuilder';

interface ExportHubProps {
  modelData?: any;
  trainingResults?: any;
  className?: string;
}

type ExportView = 'menu' | 'pdf' | 'html' | 'docs' | 'template';

const EXPORT_OPTIONS = [
  {
    id: 'pdf',
    name: 'PDF Report',
    description: 'Generate a professional PDF report with charts and metrics',
    icon: <FileText className="h-6 w-6" />,
    color: 'red'
  },
  {
    id: 'html',
    name: 'Interactive HTML',
    description: 'Create an interactive web report with dynamic visualizations',
    icon: <Globe className="h-6 w-6" />,
    color: 'blue'
  },
  {
    id: 'docs',
    name: 'Model Documentation',
    description: 'Export model documentation in various formats',
    icon: <BookOpen className="h-6 w-6" />,
    color: 'indigo'
  },
  {
    id: 'template',
    name: 'Custom Template',
    description: 'Build and save your own report templates',
    icon: <Layout className="h-6 w-6" />,
    color: 'purple'
  }
];

export function ExportHub({
  modelData,
  trainingResults,
  className
}: ExportHubProps) {
  const [currentView, setCurrentView] = useState<ExportView>('menu');

  const handlePDFGeneration = async (config: any) => {
    console.log('Generating PDF with config:', config);
    try {
      const response = await fetch('http://localhost:8000/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          modelData: modelData,
          trainingResults: trainingResults
        })
      });

      if (!response.ok) {
        throw new Error('PDF generation failed');
      }

      const result = await response.json();

      // Download the structured report data
      const blob = new Blob([JSON.stringify(result.report_data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.title.replace(/ /g, '_')}_report.json`;
      link.click();
      URL.revokeObjectURL(url);

      alert('PDF report data generated successfully! For full PDF, consider integrating with a PDF service.');
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF report: ' + (error as Error).message);
    }
  };

  const handleHTMLGeneration = async (config: any) => {
    console.log('Generating HTML with config:', config);
    try {
      const response = await fetch('http://localhost:8000/api/export/html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          modelData: modelData,
          trainingResults: trainingResults
        })
      });

      if (!response.ok) {
        throw new Error('HTML generation failed');
      }

      // Download the HTML file
      const htmlContent = await response.text();
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.title.replace(/ /g, '_')}.html`;
      link.click();
      URL.revokeObjectURL(url);

      alert('HTML report generated and downloaded successfully!');
    } catch (error) {
      console.error('HTML generation failed:', error);
      alert('Failed to generate HTML report: ' + (error as Error).message);
    }
  };

  const handleSaveTemplate = async (template: any) => {
    console.log('Saving template:', template);
    try {
      const response = await fetch('http://localhost:8000/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      const result = await response.json();
      alert(`Template "${template.name}" saved successfully!`);
    } catch (error) {
      console.error('Failed to save template:', error);
      // Fallback to localStorage
      localStorage.setItem(`report_template_${template.id}`, JSON.stringify(template));
      alert(`Template "${template.name}" saved to local storage (backend unavailable)`);
    }
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
      {currentView === 'menu' ? (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Download className="h-6 w-6 text-gray-900" />
            <h2 className="text-2xl font-bold text-gray-900">Export & Reports</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Choose how you'd like to export your model results and analysis
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EXPORT_OPTIONS.map(option => (
              <button
                key={option.id}
                onClick={() => setCurrentView(option.id as ExportView)}
                className={cn(
                  'p-6 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all text-left group',
                  'hover:shadow-md'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    'p-3 rounded-lg',
                    `bg-${option.color}-100 text-${option.color}-600`
                  )}>
                    {option.icon}
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {option.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {option.description}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              💡 <strong>Tip:</strong> All exports include your model metrics, visualizations, and analysis results.
              Choose the format that best suits your needs - PDF for static reports, HTML for interactive sharing,
              or custom templates for recurring reports.
            </p>
          </div>
        </div>
      ) : (
        <div>
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView('menu')}
            >
              ← Back to Export Options
            </Button>
          </div>

          <div className="p-6">
            {currentView === 'pdf' && (
              <PDFReportGenerator
                modelData={modelData}
                trainingResults={trainingResults}
                onGenerateReport={handlePDFGeneration}
              />
            )}

            {currentView === 'html' && (
              <HTMLReportGenerator
                modelData={modelData}
                trainingResults={trainingResults}
                onGenerateReport={handleHTMLGeneration}
              />
            )}

            {currentView === 'docs' && (
              <ModelDocExporter
                modelData={modelData}
              />
            )}

            {currentView === 'template' && (
              <ReportTemplateBuilder
                onSaveTemplate={handleSaveTemplate}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
