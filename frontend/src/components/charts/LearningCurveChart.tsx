'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart
} from 'recharts';
import { cn } from '@/lib/utils';
import { TrendingUp, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LearningCurveChartProps {
  foldResults: Array<{
    fold_idx: number;
    train_score: number;
    val_score: number;
  }>;
  taskType: 'classification' | 'regression';
  className?: string;
  title?: string;
}

export function LearningCurveChart({
  foldResults,
  taskType,
  className,
  title = 'Learning Curve'
}: LearningCurveChartProps) {

  // Prepare chart data
  const chartData = foldResults.map((fold, index) => ({
    fold: `Fold ${fold.fold_idx + 1}`,
    trainScore: fold.train_score * (taskType === 'regression' ? 1 : 100),
    valScore: fold.val_score * (taskType === 'regression' ? 1 : 100),
    gap: (fold.train_score - fold.val_score) * (taskType === 'regression' ? 1 : 100)
  }));

  // Calculate statistics
  const stats = {
    avgTrain: chartData.reduce((sum, d) => sum + d.trainScore, 0) / chartData.length,
    avgVal: chartData.reduce((sum, d) => sum + d.valScore, 0) / chartData.length,
    avgGap: chartData.reduce((sum, d) => sum + Math.abs(d.gap), 0) / chartData.length,
    maxGap: Math.max(...chartData.map(d => Math.abs(d.gap))),
    minVal: Math.min(...chartData.map(d => d.valScore)),
    maxVal: Math.max(...chartData.map(d => d.valScore))
  };

  // Detect overfitting (large gap between train and val)
  const isOverfitting = stats.avgGap > (taskType === 'regression' ? 0.1 : 10);
  // Detect underfitting (both scores are low)
  const isUnderfitting = stats.avgVal < (taskType === 'regression' ? 0.5 : 70);

  const formatScore = (value: number): string => {
    if (taskType === 'regression') {
      return value.toFixed(4);
    }
    return `${value.toFixed(1)}%`;
  };

  const handleExport = () => {
    const csv = ['Fold,Train Score,Validation Score,Gap\n'];
    chartData.forEach((data) => {
      csv.push(`${data.fold},${data.trainScore},${data.valScore},${data.gap}\n`);
    });

    const blob = new Blob(csv, { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'learning_curve_data.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Info Box */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-900">
          <p className="font-medium mb-1">Understanding Learning Curve:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Training score shows model performance on training data</li>
            <li>Validation score shows performance on unseen data</li>
            <li>Large gap = overfitting (model memorizes training data)</li>
            <li>Both scores low = underfitting (model too simple)</li>
          </ul>
        </div>
      </div>

      {/* Diagnostics */}
      {(isOverfitting || isUnderfitting) && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm font-medium text-yellow-900 mb-2">Model Diagnostics:</p>
          <ul className="space-y-1 text-xs text-yellow-800 ml-4 list-disc">
            {isOverfitting && (
              <li>
                <strong>Overfitting detected:</strong> Average gap of {formatScore(stats.avgGap)} between train and validation.
                Consider regularization, more data, or simpler model.
              </li>
            )}
            {isUnderfitting && (
              <li>
                <strong>Underfitting detected:</strong> Validation score of {formatScore(stats.avgVal)} is low.
                Consider more complex model, better features, or longer training.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Learning Curve Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="fold"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
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
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'trainScore') return [formatScore(value), 'Training Score'];
              if (name === 'valScore') return [formatScore(value), 'Validation Score'];
              if (name === 'gap') return [formatScore(Math.abs(value)), 'Gap'];
              return [value, name];
            }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              padding: '8px'
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => {
              if (value === 'trainScore') return 'Training Score';
              if (value === 'valScore') return 'Validation Score';
              if (value === 'gap') return 'Overfitting Gap';
              return value;
            }}
          />

          {/* Gap area (overfitting indicator) */}
          <Area
            type="monotone"
            dataKey="gap"
            fill="#fbbf24"
            fillOpacity={0.2}
            stroke="none"
            name="gap"
          />

          {/* Training score line */}
          <Line
            type="monotone"
            dataKey="trainScore"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ fill: '#10b981', r: 5 }}
            name="trainScore"
          />

          {/* Validation score line */}
          <Line
            type="monotone"
            dataKey="valScore"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 5 }}
            name="valScore"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Statistics Summary */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600 mb-1">Avg Training Score</p>
          <p className="text-lg font-bold text-green-700">
            {formatScore(stats.avgTrain)}
          </p>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 mb-1">Avg Validation Score</p>
          <p className="text-lg font-bold text-blue-700">
            {formatScore(stats.avgVal)}
          </p>
        </div>

        <div className="p-3 bg-yellow-50 rounded-lg">
          <p className="text-xs text-yellow-600 mb-1">Avg Gap</p>
          <p className="text-lg font-bold text-yellow-700">
            {formatScore(stats.avgGap)}
          </p>
          <p className="text-xs text-yellow-600">
            {isOverfitting ? '⚠ High' : '✓ Good'}
          </p>
        </div>

        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-600 mb-1">Val Score Range</p>
          <p className="text-lg font-bold text-purple-700">
            {formatScore(stats.maxVal - stats.minVal)}
          </p>
          <p className="text-xs text-purple-600">
            [{formatScore(stats.minVal)}, {formatScore(stats.maxVal)}]
          </p>
        </div>
      </div>

      {/* Model Recommendations */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs font-medium text-gray-700 mb-2">Recommendations:</p>
        <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
          {!isOverfitting && !isUnderfitting && (
            <li className="text-green-600">✓ Model is well-balanced with consistent performance across folds</li>
          )}
          {isOverfitting && (
            <>
              <li>Increase regularization strength (L1/L2)</li>
              <li>Reduce model complexity or add dropout</li>
              <li>Gather more training data</li>
            </>
          )}
          {isUnderfitting && (
            <>
              <li>Use a more complex model architecture</li>
              <li>Add more relevant features</li>
              <li>Reduce regularization</li>
            </>
          )}
          {stats.maxVal - stats.minVal > (taskType === 'regression' ? 0.2 : 15) && (
            <li>High variance between folds - consider using more CV folds or stratification</li>
          )}
        </ul>
      </div>
    </div>
  );
}