'use client';

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Terminal,
  Trash2,
  Download,
  Search,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrainingLog } from '@/hooks/useTrainingSSE';

interface TrainingLogsViewerProps {
  logs: TrainingLog[];
  onClear?: () => void;
  className?: string;
  maxHeight?: string;
  autoScroll?: boolean;
}

export function TrainingLogsViewer({
  logs,
  onClear,
  className,
  maxHeight = '400px',
  autoScroll = true
}: TrainingLogsViewerProps) {
  const [filter, setFilter] = useState<'all' | 'info' | 'warning' | 'error' | 'success'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && isExpanded) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, isExpanded]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Terminal className="h-4 w-4 text-gray-600" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info':
        return 'bg-blue-50 border-l-blue-500 text-blue-900';
      case 'warning':
        return 'bg-yellow-50 border-l-yellow-500 text-yellow-900';
      case 'error':
        return 'bg-red-50 border-l-red-500 text-red-900';
      case 'success':
        return 'bg-green-50 border-l-green-500 text-green-900';
      default:
        return 'bg-gray-50 border-l-gray-500 text-gray-900';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = searchTerm === '' || log.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExport = () => {
    const logText = logs
      .map(log => `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training_logs_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const logCounts = {
    all: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    warning: logs.filter(l => l.level === 'warning').length,
    error: logs.filter(l => l.level === 'error').length,
    success: logs.filter(l => l.level === 'success').length
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Terminal className="h-5 w-5 text-gray-700" />
            <h3 className="font-semibold text-gray-900">Training Logs</h3>
            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
              {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-3">
            {/* Filter Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {(['all', 'info', 'success', 'warning', 'error'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setFilter(level)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                    filter === level
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  )}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                  {logCounts[level] > 0 && (
                    <span className="ml-1.5 opacity-75">({logCounts[level]})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Search and Actions */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={logs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>

              {onClear && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClear}
                  disabled={logs.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Logs Container */}
      {isExpanded && (
        <div
          className="overflow-y-auto font-mono text-xs"
          style={{ maxHeight }}
        >
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Terminal className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {searchTerm || filter !== 'all'
                  ? 'No logs match your filters'
                  : 'No logs yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-3 border-l-4 transition-colors hover:bg-gray-50',
                    getLevelColor(log.level)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase">
                          {log.level}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {log.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
