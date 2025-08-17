'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Brain, Zap, Shield, BarChart3, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';

export default function Home() {
  const features = [
    {
      icon: FolderOpen,
      title: 'Project Management',
      description: 'Organize your data science projects with easy file management and version control.',
      href: '/project'
    },
    {
      icon: BarChart3,
      title: 'Data Exploration',
      description: 'Interactive data analysis with automatic profiling, visualizations, and insights.',
      href: '/eda'
    },
    {
      icon: Brain,
      title: 'Model Training',
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
              Your local-first desktop application for tabular machine learning. 
              Upload CSV files, explore data, train models, and make predictions - all on your machine.
            </p>
          </div>

          <div className="flex items-center justify-center gap-x-4">
            <span className="inline-flex items-center rounded-md bg-green-50 px-3 py-1 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              🔒 Local-only mode
            </span>
            <span className="text-sm text-gray-500">No data leaves your computer</span>
          </div>

          {/* Get Started Button */}
          <div className="pt-4">
            <Link href="/project">
              <Button size="lg" className="text-lg px-8 py-3">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* How It Works */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-lg">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Create a Project</h3>
              <p className="text-sm text-gray-600">Start by creating a new project and uploading your CSV data files.</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-lg">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Explore & Analyze</h3>
              <p className="text-sm text-gray-600">Use our interactive tools to explore your data and understand patterns.</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-lg">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Train & Predict</h3>
              <p className="text-sm text-gray-600">Train machine learning models and make predictions on new data.</p>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-500">
          <p>
            AutoQuanta v0 - Local-first machine learning for tabular data
          </p>
          <p className="mt-1">
            Built with Next.js, Tauri, and Python
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
