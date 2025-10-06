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
      <div className="space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-8 pt-12">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl">
              AutoQuanta
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Local-first machine learning for tabular data.
              Train models, explore insights, make predictions—all on your machine.
            </p>
          </div>

          <div className="flex items-center justify-center gap-x-3">
            <span className="inline-flex items-center rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200">
              🔒 Private & Secure
            </span>
            <span className="text-sm text-gray-500">Data never leaves your device</span>
          </div>

          {/* Get Started Button */}
          <div className="pt-6">
            <Link href="/project">
              <Button size="lg" className="text-base px-10 py-6 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group bg-white/60 backdrop-blur-2xl border border-white/30 shadow-xl rounded-xl p-8 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ease-out hover:scale-[1.02] cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-gray-100 rounded-xl border border-gray-200">
                    <feature.icon className="h-6 w-6 text-gray-900" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* How It Works */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/30 shadow-xl rounded-xl p-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center space-y-4">
              <div className="bg-gray-900 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto shadow-sm">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">Create a Project</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Create a project and upload your CSV data files to get started.</p>
            </div>
            <div className="text-center space-y-4">
              <div className="bg-gray-900 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto shadow-sm">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">Explore & Analyze</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Use interactive tools to explore data and uncover insights.</p>
            </div>
            <div className="text-center space-y-4">
              <div className="bg-gray-900 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto shadow-sm">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">Train & Predict</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Train ML models and generate predictions on new data.</p>
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
