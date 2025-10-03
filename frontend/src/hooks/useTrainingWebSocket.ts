import { useEffect, useRef, useState } from 'react';

export interface TrainingUpdate {
  type: 'progress' | 'metric' | 'log' | 'complete' | 'error' | 'status';
  timestamp: string;
  data: any;
}

export interface TrainingMetrics {
  epoch?: number;
  total_epochs?: number;
  loss?: number;
  accuracy?: number;
  val_loss?: number;
  val_accuracy?: number;
  learning_rate?: number;
  progress?: number;
  current_model?: string;
  models_completed?: number;
  total_models?: number;
  cv_fold?: number;
  total_cv_folds?: number;
}

export interface TrainingLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

interface UseTrainingWebSocketOptions {
  sessionId: string;
  onUpdate?: (update: TrainingUpdate) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}

export function useTrainingWebSocket({
  sessionId,
  onUpdate,
  onComplete,
  onError,
  autoConnect = true
}: UseTrainingWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState<TrainingMetrics>({});
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'training' | 'paused' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setStatus('connecting');
      const wsUrl = `ws://localhost:8000/ws/training/${sessionId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setStatus('training');
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const update: TrainingUpdate = JSON.parse(event.data);

          // Handle different update types
          switch (update.type) {
            case 'metric':
              setMetrics(prev => ({ ...prev, ...update.data }));
              break;

            case 'log':
              setLogs(prev => [...prev, update.data as TrainingLog]);
              break;

            case 'progress':
              setMetrics(prev => ({ ...prev, progress: update.data.progress }));
              break;

            case 'status':
              setStatus(update.data.status);
              break;

            case 'complete':
              setStatus('completed');
              onComplete?.(update.data);
              break;

            case 'error':
              setStatus('error');
              setError(update.data.error || 'Training error occurred');
              onError?.(update.data.error);
              break;
          }

          // Call the general update handler
          onUpdate?.(update);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);

        // Attempt to reconnect if not intentionally closed
        if (
          event.code !== 1000 &&
          reconnectAttemptsRef.current < maxReconnectAttempts &&
          status !== 'completed'
        ) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);

          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Failed to reconnect after multiple attempts');
          setStatus('error');
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      setError('Failed to establish connection');
      setStatus('error');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setStatus('idle');
  };

  const sendCommand = (command: string, data?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command, data }));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  const pauseTraining = () => {
    sendCommand('pause');
    setStatus('paused');
  };

  const resumeTraining = () => {
    sendCommand('resume');
    setStatus('training');
  };

  const stopTraining = () => {
    sendCommand('stop');
    setStatus('completed');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  useEffect(() => {
    if (autoConnect && sessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId, autoConnect]);

  return {
    isConnected,
    status,
    metrics,
    logs,
    error,
    connect,
    disconnect,
    pauseTraining,
    resumeTraining,
    stopTraining,
    clearLogs,
    sendCommand
  };
}
