'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Brain, Zap, Shield, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/common/FileUpload';
import { AppLayout } from '@/components/layout/AppLayout';

export default function Home() {
  const handleFileSelect = (filePath: string) => {
    console.log('File selected:', filePath);
    // In a real app, this would navigate to the EDA page with the file
  };

  const features = [
    {
      icon: Upload,
      title: 'Upload & Explore',
      description: 'Drag and drop your CSV files for instant data exploration and profiling.',
      href: '/eda'
    },
    {
      icon: Brain,
      title: 'Train Models',
      description: 'Automatically train and compare multiple ML models with cross-validation.',
      href: '/train'
    },
    {
      icon: Zap,
      title: 'Make Predictions',
      description: 'Use trained models to make predictions on new data with ONNX export.',
      href: '/predict'
    },
    {
      icon: Shield,
      title: 'Local & Private',
      description: 'Everything runs on your machine. No data leaves your computer.',
      href: '/settings'
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              AutoQuanta
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your local-first desktop application for analysis and machine learning. 
              For now work with tabular data, explore data, train models, and make predictions - all on your machine.
            </p>
          </div>

          <div className="flex items-center justify-center gap-x-4">
            <span className="inline-flex items-center rounded-md bg-green-50 px-3 py-1 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              🔒 Local-only mode
            </span>
            <span className="text-sm text-gray-500">No data leaves your computer</span>
          </div>
        </div>

        {/* Quick Start */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Start</h2>
            <p className="text-sm text-gray-600 mb-4">
              Upload a CSV file to begin exploring your data and training models.
            </p>
            <FileUpload
              onFileSelect={handleFileSelect}
              title="Upload your first CSV"
              description="Start by uploading a CSV file to explore and analyze"
            />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group relative bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-x-4">
                <div className="flex-shrink-0">
                  <feature.icon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {feature.description}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </Link>
          ))}
        </div>

        {/* Project Management */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Project Management</h2>
              <p className="text-sm text-gray-600 mt-1">
                Create or open a project to organize your data, models, and results.
              </p>
            </div>
            <Link href="/project">
              <Button>
                Manage Projects
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-500">
          <p>
            AutoQuanta v0 - Local-first machine learning for tabular data
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
