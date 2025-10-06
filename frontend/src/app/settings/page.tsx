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
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Settings</h1>
          <p className="text-lg text-gray-600 mt-3 max-w-3xl">
            Configure application settings and manage resources.
          </p>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Privacy & Security */}
          <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-x-3 mb-6">
              <div className="p-2 bg-gray-100 rounded-xl border border-gray-200">
                <Shield className="h-6 w-6 text-gray-900" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Privacy & Security</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-900">Local-only mode</p>
                  <p className="text-xs text-gray-600 mt-1">All data stays on your machine</p>
                </div>
                <div className="flex items-center gap-x-2">
                  <div className="p-1.5 bg-white rounded-lg border border-gray-300 shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-gray-900"></div>
                  </div>
                  <span className="text-sm text-gray-900 font-medium">Enabled</span>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled className="rounded-xl">
                Clear Cache
              </Button>
            </div>
          </div>

          {/* Resources */}
          <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-x-3 mb-6">
              <div className="p-2 bg-gray-100 rounded-xl border border-gray-200">
                <Cpu className="h-6 w-6 text-gray-900" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Resources</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">CPU Threads</p>
                <p className="text-xs text-gray-600 mb-2">Maximum threads for training</p>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white">
                  <option>Auto-detect</option>
                  <option>4 threads</option>
                  <option>8 threads</option>
                  <option>16 threads</option>
                </select>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">Memory Limit</p>
                <p className="text-xs text-gray-600 mb-2">Maximum memory usage</p>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white">
                  <option>4 GB</option>
                  <option>8 GB</option>
                  <option>16 GB</option>
                  <option>Unlimited</option>
                </select>
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-x-3 mb-6">
              <div className="p-2 bg-gray-100 rounded-xl border border-gray-200">
                <HardDrive className="h-6 w-6 text-gray-900" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Storage</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-1">Project Location</p>
                <p className="text-xs text-gray-600 mb-2">Default folder for new projects</p>
                <p className="text-sm text-gray-700 font-mono">~/Documents/AutoQuanta</p>
              </div>
              <Button variant="outline" size="sm" disabled className="rounded-xl">
                Change Location
              </Button>
            </div>
          </div>

          {/* About */}
          <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-x-3 mb-6">
              <div className="p-2 bg-gray-100 rounded-xl border border-gray-200">
                <Settings className="h-6 w-6 text-gray-900" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">About</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-sm text-gray-600">Version</span>
                <span className="text-sm font-medium text-gray-900">0.1.0</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-sm text-gray-600">Build</span>
                <span className="text-sm font-medium text-gray-900">2024.01.15</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-sm text-gray-600">Python</span>
                <span className="text-sm font-medium text-gray-900">3.11.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
