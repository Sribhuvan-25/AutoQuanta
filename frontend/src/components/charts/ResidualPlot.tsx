'use client';

import React, { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis
} from 'recharts';
import { cn } from '@/lib/utils';
import { TrendingUp, Download, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResidualPlotProps {
  predictions: number[];
  actuals: number[];
  className?: string;
  title?: string;
}

export function ResidualPlot({
  predictions,
  actuals,
  className,
  title = 'Residual Plot'
}: ResidualPlotProps) {
  const [showStats, setShowStats] = useState(true);

  // Calculate residuals
  const residuals = predictions.map((pred, i) => actuals[i] - pred);

  // Prepare chart data
  const chartData = predictions.map((pred, i) => ({
    predicted: pred,
    residual: residuals[i],
    actual: actuals[i]
  }));

  // Calculate statistics
  const stats = {
    mean: residuals.reduce((sum, r) => sum + r, 0) / residuals.length,
    std: Math.sqrt(
      residuals.reduce((sum, r) => sum + Math.pow(r - (residuals.reduce((s, val) => s + val, 0) / residuals.length), 2), 0) / residuals.length
    ),
    min: Math.min(...residuals),
    max: Math.max(...residuals)
  };

  // Count outliers (residuals > 2 standard deviations)
  const outliers = residuals.filter(r => Math.abs(r) > 2 * stats.std);
  const outliersPercentage = (outliers.length / residuals.length) * 100;

  // Check for patterns (heteroscedasticity)
  const isHeteroscedastic = Math.abs(stats.std) > Math.abs(stats.mean) * 3;

  // Color points based on residual magnitude
  const getPointColor = (residual: number): string => {
    const absResidual = Math.abs(residual);
    if (absResidual > 2 * stats.std) return '#ef4444'; // Red for outliers
    if (absResidual > stats.std) return '#f97316'; // Orange
    return '#3b82f6'; // Blue for normal
  };

  const handleExport = () => {
    const csv = ['Predicted,Actual,Residual\n'];
    predictions.forEach((pred, i) => {
      csv.push(`${pred},${actuals[i]},${residuals[i]}\n`);
    });

    const blob = new Blob(csv, { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'residual_data.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? 'Hide Stats' : 'Show Stats'}
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

      {/* Info Box */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-900">
          <p className="font-medium mb-1">Understanding Residual Plot:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Points should be randomly scattered around zero line</li>
            <li>Patterns indicate model issues (non-linearity, heteroscedasticity)</li>
            <li>Outliers (red points) may need investigation</li>
            <li>Funnel shape suggests variance increases with prediction magnitude</li>
          </ul>
        </div>
      </div>

      {/* Warnings */}
      {(isHeteroscedastic || outliersPercentage > 5) && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-900">Potential Issues Detected:</p>
            <ul className="mt-1 space-y-1 text-yellow-800 text-xs ml-4 list-disc">
              {isHeteroscedastic && (
                <li>Heteroscedasticity: Variance of residuals is not constant</li>
              )}
              {outliersPercentage > 5 && (
                <li>{outliersPercentage.toFixed(1)}% of predictions are outliers (expected &lt;5%)</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Residual Scatter Plot */}
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="predicted"
            name="Predicted Value"
            label={{
              value: 'Predicted Values',
              position: 'insideBottom',
              offset: -10,
              style: { fontSize: 12 }
            }}
            stroke="#6b7280"
          />
          <YAxis
            dataKey="residual"
            name="Residual"
            label={{
              value: 'Residuals (Actual - Predicted)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12 }
            }}
            stroke="#6b7280"
          />
          <ZAxis range={[40, 40]} />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'Residual') return [value.toFixed(4), 'Residual'];
              if (name === 'Predicted Value') return [value.toFixed(4), 'Predicted'];
              if (name === 'Actual') return [value.toFixed(4), 'Actual'];
              return [value, name];
            }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              padding: '8px'
            }}
          />

          {/* Zero reference line */}
          <ReferenceLine
            y={0}
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: 'Perfect Prediction',
              position: 'right',
              fill: '#10b981',
              fontSize: 11
            }}
          />

          {/* +/- 1 std dev lines */}
          <ReferenceLine
            y={stats.std}
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <ReferenceLine
            y={-stats.std}
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {/* +/- 2 std dev lines (outlier boundaries) */}
          <ReferenceLine
            y={2 * stats.std}
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <ReferenceLine
            y={-2 * stats.std}
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {/* Scatter points */}
          <Scatter
            data={chartData}
            fill="#3b82f6"
            shape={(props: { cx: number; cy: number; payload: { residual: number } }) => {
              const { cx, cy, payload } = props;
              const color = getPointColor(payload.residual);
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={color}
                  fillOpacity={0.6}
                  stroke={color}
                  strokeWidth={1}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Statistics Panel */}
      {showStats && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 mb-1">Mean Residual</p>
            <p className="text-lg font-bold text-blue-700">
              {stats.mean.toFixed(4)}
            </p>
            <p className="text-xs text-blue-600">
              {Math.abs(stats.mean) < 0.01 ? '✓ Near zero (good)' : '⚠ Check for bias'}
            </p>
          </div>

          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-600 mb-1">Std Deviation</p>
            <p className="text-lg font-bold text-purple-700">
              {stats.std.toFixed(4)}
            </p>
            <p className="text-xs text-purple-600">Lower is better</p>
          </div>

          <div className="p-3 bg-orange-50 rounded-lg">
            <p className="text-xs text-orange-600 mb-1">Range</p>
            <p className="text-lg font-bold text-orange-700">
              {(stats.max - stats.min).toFixed(4)}
            </p>
            <p className="text-xs text-orange-600">
              [{stats.min.toFixed(2)}, {stats.max.toFixed(2)}]
            </p>
          </div>

          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-xs text-red-600 mb-1">Outliers</p>
            <p className="text-lg font-bold text-red-700">
              {outliers.length}
            </p>
            <p className="text-xs text-red-600">
              {outliersPercentage.toFixed(1)}% of total
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-600">Normal (&lt;1 σ)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-gray-600">Warning (1-2 σ)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-600">Outlier (&gt;2 σ)</span>
        </div>
      </div>
    </div>
  );
}