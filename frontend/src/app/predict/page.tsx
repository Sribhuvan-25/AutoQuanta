'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Upload, Download } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function PredictPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Predictions</h1>
          <p className="text-gray-600 mt-1">
            Use trained models to make predictions on new data.
          </p>
        </div>

        {/* Coming Soon */}
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Zap className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Prediction Interface</h2>
          <p className="text-gray-600 mb-6">
            The prediction interface is coming soon. You&apos;ll be able to select trained models,
            upload new data, and download prediction results.
          </p>
          <div className="flex justify-center gap-4">
            <Button disabled>
              <Upload className="h-4 w-4 mr-2" />
              Upload Data
            </Button>
            <Button variant="outline" disabled>
              <Download className="h-4 w-4 mr-2" />
              Download Results
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
