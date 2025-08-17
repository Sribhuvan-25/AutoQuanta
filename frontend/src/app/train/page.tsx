'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Play, Settings } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function TrainPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Model Training</h1>
          <p className="text-gray-600 mt-1">
            Configure and train machine learning models on your data.
          </p>
        </div>

        {/* Coming Soon */}
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Brain className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Training Interface</h2>
          <p className="text-gray-600 mb-6">
            The model training interface is coming soon. You&apos;ll be able to configure training parameters,
            select models, and monitor training progress.
          </p>
          <div className="flex justify-center gap-4">
            <Button disabled>
              <Play className="h-4 w-4 mr-2" />
              Start Training
            </Button>
            <Button variant="outline" disabled>
              <Settings className="h-4 w-4 mr-2" />
              Configure Models
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
