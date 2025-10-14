'use client';

import { useState, useEffect, useCallback } from 'react';
import { checkBackendHealth } from '@/lib/api-error-handler';

export interface ConnectionStatus {
  isOnline: boolean;
  isBackendReachable: boolean;
  lastChecked: Date | null;
  isChecking: boolean;
}

interface UseConnectionStatusOptions {
  checkInterval?: number;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

const DEFAULT_CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Hook to monitor browser online status and backend connectivity
 */
export function useConnectionStatus(options: UseConnectionStatusOptions = {}) {
  const { checkInterval = DEFAULT_CHECK_INTERVAL, onConnectionChange } = options;

  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isBackendReachable: true,
    lastChecked: null,
    isChecking: false,
  });

  // Check backend health
  const checkBackend = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isChecking: true }));

    try {
      const isReachable = await checkBackendHealth();
      const newStatus: ConnectionStatus = {
        isOnline: navigator.onLine,
        isBackendReachable: isReachable,
        lastChecked: new Date(),
        isChecking: false,
      };

      setStatus(newStatus);

      // Notify about connection change
      if (onConnectionChange) {
        onConnectionChange(newStatus);
      }
    } catch (error) {
      const newStatus: ConnectionStatus = {
        isOnline: navigator.onLine,
        isBackendReachable: false,
        lastChecked: new Date(),
        isChecking: false,
      };

      setStatus(newStatus);

      if (onConnectionChange) {
        onConnectionChange(newStatus);
      }
    }
  }, [onConnectionChange]);

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
      checkBackend(); // Check backend when coming back online
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false, isBackendReachable: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkBackend]);

  // Periodic backend health check
  useEffect(() => {
    // Initial check
    checkBackend();

    // Set up interval
    const intervalId = setInterval(checkBackend, checkInterval);

    return () => clearInterval(intervalId);
  }, [checkBackend, checkInterval]);

  return {
    ...status,
    checkNow: checkBackend,
  };
}

/**
 * Hook for displaying connection status notifications
 */
export function useConnectionNotifications() {
  const [previousStatus, setPreviousStatus] = useState<ConnectionStatus | null>(null);

  const handleConnectionChange = useCallback((status: ConnectionStatus) => {
    // Only show notifications for changes
    if (!previousStatus) {
      setPreviousStatus(status);
      return;
    }

    // Backend became unreachable
    if (previousStatus.isBackendReachable && !status.isBackendReachable) {
      console.warn('Backend server is not reachable');
    }

    // Backend became reachable again
    if (!previousStatus.isBackendReachable && status.isBackendReachable) {
      console.log('Backend server is reachable again');
    }

    // Went offline
    if (previousStatus.isOnline && !status.isOnline) {
      console.warn('Internet connection lost');
    }

    // Came back online
    if (!previousStatus.isOnline && status.isOnline) {
      console.log('Internet connection restored');
    }

    setPreviousStatus(status);
  }, [previousStatus]);

  return handleConnectionChange;
}
