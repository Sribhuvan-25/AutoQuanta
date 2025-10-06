'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Brush
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Download,
  Info,
  Filter,
  ZoomIn,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PerformanceDataPoint {
  timestamp: string;
  score: number;
  version?: string;
  model_type?: string;
  notes?: string;
  metrics?: {
    [key: string]: number;
  };
}

interface ModelPerformanceHistoryProps {
  modelName: string;
  taskType: 'classification' | 'regression';
  history: PerformanceDataPoint[];
  targetMetric?: string;
  showTrendline?: boolean;
  className?: string;
}

export function ModelPerformanceHistory({
  modelName,
  taskType,
  history,
  targetMetric = 'score',
  showTrendline = true,
  className
}: ModelPerformanceHistoryProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>(targetMetric);
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [showBrush, setShowBrush] = useState(history.length > 10);

  // Sort history by timestamp
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Prepare chart data
  const chartData = sortedHistory.map((point, index) => ({
    index: index + 1,
    timestamp: new Date(point.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    score: point.score * (taskType === 'regression' ? 1 : 100),
    version: point.version || `v${index + 1}`,
    rawTimestamp: point.timestamp,
    ...point.metrics
  }));

  // Calculate statistics
  const scores = chartData.map(d => d.score);
  const stats = {
    latest: scores[scores.length - 1],
    earliest: scores[0],
    average: scores.reduce((sum, s) => sum + s, 0) / scores.length,
    min: Math.min(...scores),
    max: Math.max(...scores),
    improvement: scores[scores.length - 1] - scores[0],
    improvementPercent: ((scores[scores.length - 1] - scores[0]) / scores[0]) * 100
  };

  // Calculate trendline using linear regression
  const calculateTrendline = () => {
    const n = chartData.length;
    const sumX = chartData.reduce((sum, _, i) => sum + i, 0);
    const sumY = scores.reduce((sum, s) => sum + s, 0);
    const sumXY = chartData.reduce((sum, d, i) => sum + i * d.score, 0);
    const sumXX = chartData.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return chartData.map((_, i) => ({
      index: i + 1,
      trend: slope * i + intercept
    }));
  };

  const trendlineData = showTrendline ? calculateTrendline() : [];

  // Get available metrics for filtering
  const availableMetrics = history[0]?.metrics
    ? ['score', ...Object.keys(history[0].metrics)]
    : ['score'];

  const formatScore = (value: number): string => {
    if (taskType === 'regression') {
      return value.toFixed(4);
    }
    return `${value.toFixed(1)}%`;
  };

  const handleExport = () => {
    const csv = ['Timestamp,Version,Score,Notes\n'];
    sortedHistory.forEach((point) => {
      csv.push(
        `${point.timestamp},${point.version || 'N/A'},${point.score},"${point.notes || ''}"\n`
      );
    });

    const blob = new Blob(csv, { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${modelName}_performance_history.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (history.length === 0) {
    return (
      <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
        <div className="text-center py-12">
          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">No performance history available</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: { version: string; timestamp: string }; dataKey: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {data.version}
          </p>
          <p className="text-xs text-gray-500 mb-2">{data.timestamp}</p>
          <div className="space-y-1">
            {payload.map((entry: { dataKey: string; value: number; color: string }) => (
              <div key={entry.dataKey} className="flex items-center justify-between gap-3">
                <span className="text-xs text-gray-600 capitalize">
                  {entry.dataKey}:
                </span>
                <span className="text-xs font-medium" style={{ color: entry.color }}>
                  {formatScore(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Performance History</h3>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {history.length} versions
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBrush(!showBrush)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableMetrics.map((metric) => (
              <option key={metric} value={metric}>
                {metric === 'score' ? 'Main Score' : metric.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setChartType('line')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-l-lg transition-colors',
              chartType === 'line'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Line
          </button>
          <button
            onClick={() => setChartType('area')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-r-lg transition-colors',
              chartType === 'area'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Area
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-900">
          <p>
            Tracking model performance over {history.length} versions.
            {showTrendline && ' Trendline shows overall improvement direction.'}
          </p>
        </div>
      </div>

      {/* Performance Chart */}
      <ResponsiveContainer width="100%" height={350}>
        {chartType === 'area' ? (
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="version"
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              stroke="#6b7280"
              label={{
                value: taskType === 'regression' ? 'R² Score' : 'Accuracy (%)',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />

            {/* Reference line for average */}
            <ReferenceLine
              y={stats.average}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{
                value: `Avg: ${formatScore(stats.average)}`,
                position: 'right',
                fill: '#f59e0b',
                fontSize: 11
              }}
            />

            <Area
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#scoreGradient)"
              name="Performance"
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />

            {showTrendline && (
              <Line
                data={trendlineData}
                type="monotone"
                dataKey="trend"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Trend"
              />
            )}

            {showBrush && <Brush dataKey="version" height={30} stroke="#3b82f6" />}
          </AreaChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="version"
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              stroke="#6b7280"
              label={{
                value: taskType === 'regression' ? 'R² Score' : 'Accuracy (%)',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />

            {/* Reference line for average */}
            <ReferenceLine
              y={stats.average}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{
                value: `Avg: ${formatScore(stats.average)}`,
                position: 'right',
                fill: '#f59e0b',
                fontSize: 11
              }}
            />

            <Line
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', r: 5 }}
              activeDot={{ r: 7 }}
              name="Performance"
            />

            {showTrendline && (
              <Line
                data={trendlineData}
                type="monotone"
                dataKey="trend"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Trend"
              />
            )}

            {showBrush && <Brush dataKey="version" height={30} stroke="#3b82f6" />}
          </LineChart>
        )}
      </ResponsiveContainer>

      {/* Statistics Summary */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 mb-1">Latest</p>
          <p className="text-lg font-bold text-blue-700">
            {formatScore(stats.latest)}
          </p>
        </div>

        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-600 mb-1">Average</p>
          <p className="text-lg font-bold text-purple-700">
            {formatScore(stats.average)}
          </p>
        </div>

        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600 mb-1">Best</p>
          <p className="text-lg font-bold text-green-700">
            {formatScore(stats.max)}
          </p>
        </div>

        <div className={cn(
          'p-3 rounded-lg',
          stats.improvement >= 0 ? 'bg-green-50' : 'bg-red-50'
        )}>
          <p className={cn(
            'text-xs mb-1',
            stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            Improvement
          </p>
          <p className={cn(
            'text-lg font-bold',
            stats.improvement >= 0 ? 'text-green-700' : 'text-red-700'
          )}>
            {stats.improvement >= 0 ? '+' : ''}{formatScore(Math.abs(stats.improvement))}
          </p>
          <p className={cn(
            'text-xs',
            stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {stats.improvementPercent >= 0 ? '+' : ''}{stats.improvementPercent.toFixed(1)}%
          </p>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Range</p>
          <p className="text-lg font-bold text-gray-700">
            {formatScore(stats.max - stats.min)}
          </p>
          <p className="text-xs text-gray-600">
            [{formatScore(stats.min)}, {formatScore(stats.max)}]
          </p>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-start gap-2">
          <BarChart3 className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Performance Insights:</p>
            <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
              {stats.improvement > 0 && (
                <li className="text-green-600">
                  ✓ Model has improved by {formatScore(stats.improvement)} ({stats.improvementPercent.toFixed(1)}%) since first version
                </li>
              )}
              {stats.improvement < 0 && (
                <li className="text-red-600">
                  ⚠ Model performance has decreased by {formatScore(Math.abs(stats.improvement))} since first version
                </li>
              )}
              {stats.max - stats.min > (taskType === 'regression' ? 0.1 : 10) && (
                <li>
                  High variance between versions - consider analyzing what changes led to improvements
                </li>
              )}
              {stats.latest >= stats.max * 0.95 && (
                <li className="text-green-600">
                  ✓ Current version is performing near the best historical performance
                </li>
              )}
              {history.length >= 5 && stats.improvement === 0 && (
                <li className="text-yellow-600">
                  Performance has plateaued - consider trying different approaches or features
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
