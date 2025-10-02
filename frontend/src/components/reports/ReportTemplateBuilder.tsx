'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Layout,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Eye,
  Copy,
  Settings,
  FileText,
  BarChart3,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TemplateSection {
  id: string;
  type: 'header' | 'text' | 'metrics' | 'chart' | 'table' | 'image';
  title: string;
  content?: string;
  order: number;
  settings?: {
    fontSize?: string;
    alignment?: 'left' | 'center' | 'right';
    color?: string;
    chartType?: string;
  };
}

interface ReportTemplateBuilderProps {
  onSaveTemplate?: (template: ReportTemplate) => void;
  existingTemplate?: ReportTemplate;
  className?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: TemplateSection[];
  createdAt: string;
  updatedAt: string;
}

const SECTION_TYPES = [
  {
    type: 'header',
    label: 'Header',
    icon: <FileText className="h-4 w-4" />,
    description: 'Section title or heading'
  },
  {
    type: 'text',
    label: 'Text Block',
    icon: <FileText className="h-4 w-4" />,
    description: 'Paragraph or description'
  },
  {
    type: 'metrics',
    label: 'Metrics Display',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Key performance indicators'
  },
  {
    type: 'chart',
    label: 'Chart/Graph',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Visualization or plot'
  },
  {
    type: 'table',
    label: 'Data Table',
    icon: <Layout className="h-4 w-4" />,
    description: 'Tabular data display'
  },
  {
    type: 'image',
    label: 'Image',
    icon: <ImageIcon className="h-4 w-4" />,
    description: 'Custom image or logo'
  }
];

export function ReportTemplateBuilder({
  onSaveTemplate,
  existingTemplate,
  className
}: ReportTemplateBuilderProps) {
  const [templateName, setTemplateName] = useState(existingTemplate?.name || 'Custom Report Template');
  const [templateDescription, setTemplateDescription] = useState(existingTemplate?.description || '');
  const [sections, setSections] = useState<TemplateSection[]>(existingTemplate?.sections || []);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const addSection = (type: string) => {
    const newSection: TemplateSection = {
      id: `section_${Date.now()}`,
      type: type as any,
      title: `New ${type} Section`,
      order: sections.length,
      settings: {
        fontSize: 'medium',
        alignment: 'left',
      }
    };

    setSections([...sections, newSection]);
    setSelectedSection(newSection.id);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    if (selectedSection === id) {
      setSelectedSection(null);
    }
  };

  const updateSection = (id: string, updates: Partial<TemplateSection>) => {
    setSections(sections.map(s =>
      s.id === id ? { ...s, ...updates } : s
    ));
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const index = sections.findIndex(s => s.id === id);
    if (index === -1) return;

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= sections.length) return;

    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];

    // Update order
    newSections.forEach((section, idx) => {
      section.order = idx;
    });

    setSections(newSections);
  };

  const duplicateSection = (id: string) => {
    const section = sections.find(s => s.id === id);
    if (!section) return;

    const newSection = {
      ...section,
      id: `section_${Date.now()}`,
      title: `${section.title} (Copy)`,
      order: sections.length
    };

    setSections([...sections, newSection]);
  };

  const handleSaveTemplate = () => {
    const template: ReportTemplate = {
      id: existingTemplate?.id || `template_${Date.now()}`,
      name: templateName,
      description: templateDescription,
      sections: sections.sort((a, b) => a.order - b.order),
      createdAt: existingTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveTemplate?.(template);
  };

  const selected = sections.find(s => s.id === selectedSection);

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layout className="h-6 w-6 text-purple-600" />
            <h3 className="text-xl font-semibold text-gray-900">Report Template Builder</h3>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button size="sm" onClick={handleSaveTemplate}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., Executive Summary Report"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Brief description of this template"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-x divide-gray-200">
        <div className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">Add Sections</h4>
          <div className="space-y-2">
            {SECTION_TYPES.map(type => (
              <button
                key={type.type}
                onClick={() => addSection(type.type)}
                className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  {type.icon}
                  <span className="font-medium text-sm">{type.label}</span>
                </div>
                <p className="text-xs text-gray-600">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">
            Template Structure ({sections.length} sections)
          </h4>
          {sections.length === 0 ? (
            <div className="text-center py-8">
              <Layout className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Add sections from the left panel
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sections.sort((a, b) => a.order - b.order).map((section, index) => (
                <div
                  key={section.id}
                  onClick={() => setSelectedSection(section.id)}
                  className={cn(
                    'p-3 rounded-lg border-2 cursor-pointer transition-all',
                    selectedSection === section.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{section.title}</p>
                      <p className="text-xs text-gray-500">{section.type}</p>
                    </div>
                    <div className="flex gap-1">
                      {index > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSection(section.id, 'up');
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          ↑
                        </button>
                      )}
                      {index < sections.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSection(section.id, 'down');
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          ↓
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateSection(section.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSection(section.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">Section Settings</h4>
          {selected ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section Title
                </label>
                <input
                  type="text"
                  value={selected.title}
                  onChange={(e) => updateSection(selected.id, { title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {selected.type === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={selected.content || ''}
                    onChange={(e) => updateSection(selected.id, { content: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter text content..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Font Size
                </label>
                <select
                  value={selected.settings?.fontSize || 'medium'}
                  onChange={(e) => updateSection(selected.id, {
                    settings: { ...selected.settings, fontSize: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">Extra Large</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alignment
                </label>
                <select
                  value={selected.settings?.alignment || 'left'}
                  onChange={(e) => updateSection(selected.id, {
                    settings: { ...selected.settings, alignment: e.target.value as any }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>

              {selected.type === 'chart' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Type
                  </label>
                  <select
                    value={selected.settings?.chartType || 'auto'}
                    onChange={(e) => updateSection(selected.id, {
                      settings: { ...selected.settings, chartType: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="scatter">Scatter Plot</option>
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Select a section to configure
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
