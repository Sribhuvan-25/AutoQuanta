'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Home, FolderOpen, BarChart3, Brain, Zap, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Project', href: '/project', icon: FolderOpen },
  { name: 'Data Explorer', href: '/eda', icon: BarChart3 },
  { name: 'Training', href: '/train', icon: Brain },
  { name: 'Predictions', href: '/predict', icon: Zap },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/80 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-1 left-1 z-50 w-72 bg-white rounded-xl shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:rounded-xl lg:shadow-lg',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Close button for mobile */}
        <div className="flex h-16 items-center justify-between px-6 lg:hidden">
          <h2 className="text-lg font-semibold text-gray-900">AutoQuanta</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="px-6 py-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                    onClick={() => setOpen(false)}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0',
                        isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'
                      )}
                    />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-x-2">
              <div className="h-2 w-2 rounded-full bg-green-400"></div>
              <span className="text-xs font-medium text-gray-700">Local-only mode</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              All data stays on your machine
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
