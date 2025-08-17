'use client';

import React from 'react';
import { Menu, Settings, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-x-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          onClick={onMenuClick}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </Button>

        {/* Separator */}
        <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

        {/* App title and project info */}
        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <div className="flex flex-1 items-center gap-x-4 lg:gap-x-6">
            <div className="flex items-center gap-x-2">
              <h1 className="text-lg font-semibold text-gray-900">AutoQuanta</h1>
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                Local-only
              </span>
            </div>
            
            {/* Project info */}
            <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />
            <div className="hidden lg:flex lg:items-center lg:gap-x-2">
              <span className="text-sm text-gray-500">Project:</span>
              <span className="text-sm font-medium text-gray-900">No project selected</span>
            </div>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Help button */}
          <Button variant="ghost" size="sm" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
            <span className="sr-only">View help</span>
            <HelpCircle className="h-6 w-6" aria-hidden="true" />
          </Button>

          {/* Settings button */}
          <Button variant="ghost" size="sm" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
            <span className="sr-only">Open settings</span>
            <Settings className="h-6 w-6" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
