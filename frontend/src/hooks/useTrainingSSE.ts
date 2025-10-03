import { useEffect, useRef, useState, useCallback } from 'react';

export interface TrainingEvent {
  type: 'connected' | 'progress' | 'metric' | 'log' | 'status' | 'complete' | 'error' | 'ping';
  data?: any;
  timestamp: number;
  session_id?: string;
}

export interface TrainingProgress {
  stage?: string;
  progress?: number;
  message?: string;
}

export interface TrainingMetric {
  metric: string;
  value: any;
  model_name?: string;
  std_score?: number;
}

export interface TrainingLog {
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: number;
}

interface UseTrainingSSEOptions {
  sessionId: string;
  onProgress?: (progress: TrainingProgress) => void;
  onMetric?: (metric: TrainingMetric) => void;
  onLog?: (log: TrainingLog) => void;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}

export function useTrainingSSE({
  sessionId,
  onProgress,
  onMetric,
  onLog,
  onComplete,
  onError,
  autoConnect = true
}: UseTrainingSSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'>('idle');
  const [progress, setProgress] = useState<TrainingProgress>({});
  const [metrics, setMetrics] = useState<TrainingMetric[]>([]);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return; // Already connected
    }

    try {
      setStatus('connecting');
      setError(null);

      const url = `http://localhost:8000/training/stream/${sessionId}`;
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log('SSE connection opened');
        setIsConnected(true);
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedEvent: TrainingEvent = JSON.parse(event.data);

          switch (parsedEvent.type) {
            case 'connected':
              console.log('Training stream connected:', parsedEvent.session_id);
              break;

            case 'progress':
              const progressData = parsedEvent.data as TrainingProgress;
              setProgress(progressData);
              onProgress?.(progressData);
              break;

            case 'metric':
              const metricData = parsedEvent.data as TrainingMetric;
              setMetrics(prev => [...prev, metricData]);
              onMetric?.(metricData);
              break;

            case 'log':
              const logData = parsedEvent.data as TrainingLog;
              setLogs(prev => [...prev, logData]);
              onLog?.(logData);
              break;

            case 'status':
              if (parsedEvent.data?.status) {
                setStatus(parsedEvent.data.status);
              }
              break;

            case 'complete':
              console.log('Training completed');
              setStatus('disconnected');
              onComplete?.(parsedEvent.data);
              disconnect();
              break;

            case 'error':
              const errorMsg = parsedEvent.data?.error || 'Unknown error occurred';
              console.error('Training error:', errorMsg);
              setError(errorMsg);
              setStatus('error');
              onError?.(errorMsg);
              disconnect();
              break;

            case 'ping':
              // Keepalive ping, do nothing
              break;
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);
        setIsConnected(false);

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 5000);

          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            eventSource.close();
            eventSourceRef.current = null;
            connect();
          }, delay);
        } else {
          setError('Failed to connect after multiple attempts');
          setStatus('error');
          eventSource.close();
          eventSourceRef.current = null;
        }
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error('Error creating SSE connection:', err);
      setError('Failed to establish connection');
      setStatus('error');
    }
  }, [sessionId, onProgress, onMetric, onLog, onComplete, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setStatus('disconnected');
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const clearMetrics = useCallback(() => {
    setMetrics([]);
  }, []);

  useEffect(() => {
    if (autoConnect && sessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId, autoConnect, connect, disconnect]);

  return {
    isConnected,
    status,
    progress,
    metrics,
    logs,
    error,
    connect,
    disconnect,
    clearLogs,
    clearMetrics
  };
}
