'use client';

import React, { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { ToastProvider } from '@/components/ui/toast';
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

interface ClientProvidersProps {
  children: ReactNode;
}

function ConnectionMonitor() {
  const { isOnline, isBackendReachable, checkNow } = useConnectionStatus({
    checkInterval: 30000, // Check every 30 seconds
  });

  return (
    <ConnectionBanner
      isOnline={isOnline}
      isBackendReachable={isBackendReachable}
      onRetry={checkNow}
    />
  );
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConnectionMonitor />
        {children}
      </ToastProvider>
    </ErrorBoundary>
  );
}
