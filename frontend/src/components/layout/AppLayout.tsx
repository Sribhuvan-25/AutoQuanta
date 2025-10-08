'use client';

import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="mx-auto max-w-[1920px] px-4 lg:px-6">
        <div className="flex gap-4 lg:gap-6 py-4">
          {/* Sidebar */}
          <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <Header onMenuClick={() => setSidebarOpen(true)} />

            {/* Page content */}
            <main className="mt-6">
              <div className="min-h-[calc(100vh-12rem)] animate-fadeIn">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
