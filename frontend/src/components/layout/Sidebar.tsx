'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Home, FolderOpen, BarChart3, Brain, Package, Zap, Settings, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectSidebar, toggleSidebar, setSidebarCollapsed } from '@/store/slices/uiSlice';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Project', href: '/project', icon: FolderOpen },
  { name: 'Data Explorer', href: '/eda', icon: BarChart3 },
  { name: 'Training', href: '/train', icon: Brain },
  { name: 'Models', href: '/models', icon: Package },
  { name: 'Predictions', href: '/predict', icon: Zap },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebar = useAppSelector(selectSidebar);
  const [isHovering, setIsHovering] = useState(false);

  // Determine if sidebar should be expanded
  const isExpanded = open || isHovering || !sidebar.isCollapsed;

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
          'fixed inset-y-4 left-4 z-50 bg-white/80 backdrop-blur-lg border border-white/40 rounded-2xl shadow-xl transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          // Width transitions
          isExpanded ? 'w-72' : 'w-16 lg:w-16',
          // Mobile transform
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-3">
          {isExpanded && (
            <h2 className="text-lg font-semibold text-slate-900 lg:block">AutoQuanta</h2>
          )}
          
          {/* Desktop toggle button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.innerWidth >= 1024) {
                dispatch(setSidebarCollapsed(!sidebar.isCollapsed));
              } else {
                setOpen(false);
              }
            }}
            className={cn(
              "hidden lg:flex transition-transform duration-200",
              !isExpanded && "rotate-180"
            )}
          >
            {open && window.innerWidth < 1024 ? (
              <X className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </Button>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 flex-1">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative',
                      isActive
                        ? 'bg-black text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                    onClick={() => setOpen(false)}
                    title={!isExpanded ? item.name : undefined}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                      )}
                    />
                    <span
                      className={cn(
                        'transition-all duration-300',
                        !isExpanded && 'opacity-0 w-0 overflow-hidden'
                      )}
                    >
                      {item.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="p-3">
          <div className={cn(
            "rounded-xl bg-gray-100 border border-gray-200 transition-all duration-300",
            isExpanded ? "p-3" : "p-2"
          )}>
            <div className="flex items-center gap-x-2">
              <div className="h-2 w-2 rounded-full bg-gray-900 flex-shrink-0"></div>
              {isExpanded && (
                <div className="overflow-hidden">
                  <span className="text-xs font-medium text-gray-900 whitespace-nowrap">Local-only</span>
                  <p className="text-xs text-gray-600 whitespace-nowrap">
                    Data stays on your machine
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
