'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Shield, HardDrive, Cpu } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure application settings and manage resources.
          </p>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Privacy & Security */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-x-3 mb-4">
              <Shield className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Privacy & Security</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Local-only mode</p>
                  <p className="text-xs text-gray-500">All data stays on your machine</p>
                </div>
                <div className="flex items-center gap-x-2 text-sm text-green-600">
                  <div className="h-2 w-2 rounded-full bg-green-400"></div>
                  <span>Enabled</span>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>
                Clear Cache
              </Button>
            </div>
          </div>

          {/* Resources */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-x-3 mb-4">
              <Cpu className="h-6 w-6 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Resources</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900">CPU Threads</p>
                <p className="text-xs text-gray-500">Maximum threads for training</p>
                <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option>Auto-detect</option>
                  <option>4 threads</option>
                  <option>8 threads</option>
                  <option>16 threads</option>
                </select>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Memory Limit</p>
                <p className="text-xs text-gray-500">Maximum memory usage</p>
                <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option>4 GB</option>
                  <option>8 GB</option>
                  <option>16 GB</option>
                  <option>Unlimited</option>
                </select>
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-x-3 mb-4">
              <HardDrive className="h-6 w-6 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Storage</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Project Location</p>
                <p className="text-xs text-gray-500">Default folder for new projects</p>
                <p className="mt-1 text-sm text-gray-600">~/Documents/AutoQuanta</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Change Location
              </Button>
            </div>
          </div>

          {/* About */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-x-3 mb-4">
              <Settings className="h-6 w-6 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">About</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Version:</span>
                <span className="font-medium">0.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Build:</span>
                <span className="font-medium">2024.01.15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Python:</span>
                <span className="font-medium">3.11.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
