'use client';

import React from 'react';
import { WifiOff, ServerCrash, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectionBannerProps {
  isOnline: boolean;
  isBackendReachable: boolean;
  onRetry?: () => void;
}

export function ConnectionBanner({ isOnline, isBackendReachable, onRetry }: ConnectionBannerProps) {
  // Show nothing if everything is fine
  if (isOnline && isBackendReachable) {
    return null;
  }

  // Internet connection lost
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9998] bg-red-600 text-white py-3 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <WifiOff className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">No Internet Connection</p>
              <p className="text-xs text-red-100">
                You're offline. Some features may not be available.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Backend not reachable
  if (!isBackendReachable) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9998] bg-yellow-600 text-white py-3 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <ServerCrash className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Backend Server Not Available</p>
              <p className="text-xs text-yellow-100">
                The backend server is not running or not reachable. Please start the server with "npm run dev"
              </p>
            </div>
          </div>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="flex-shrink-0 bg-white text-yellow-900 hover:bg-yellow-50 border-yellow-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
