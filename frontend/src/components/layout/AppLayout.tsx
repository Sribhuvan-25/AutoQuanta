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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-1">
      <div className="mx-auto max-w-7xl">
        <div className="flex gap-2">
          {/* Sidebar */}
          <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
          
          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <Header onMenuClick={() => setSidebarOpen(true)} />
            
            {/* Page content */}
            <main className="mt-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6 min-h-[calc(100vh-8rem)]">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
