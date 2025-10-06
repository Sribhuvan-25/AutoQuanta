'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import { BarChart3, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DistributionPlotProps {
  data: number[];
  featureName: string;
  bins?: number;
  showOutliers?: boolean;
  className?: string;
}

export function DistributionPlot({
  data,
  featureName,
  bins = 30,
  showOutliers = true,
  className
}: DistributionPlotProps) {
  const [selectedBin, setSelectedBin] = useState<number | null>(null);

  // Calculate statistics
  const stats = useMemo(() => {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;

    const mean = data.reduce((sum, val) => sum + val, 0) / n;
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // IQR for outlier detection
    const q1Index = Math.floor(n * 0.25);
    const q3Index = Math.floor(n * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outliers = data.filter(val => val < lowerBound || val > upperBound);

    return {
      mean,
      median,
      stdDev,
      min: sorted[0],
      max: sorted[n - 1],
      q1,
      q3,
      iqr,
      lowerBound,
      upperBound,
      outliers,
      count: n
    };
  }, [data]);

  // Create histogram bins
  const histogram = useMemo(() => {
    const min = stats.min;
    const max = stats.max;
    const binWidth = (max - min) / bins;

    const binData = Array.from({ length: bins }, (_, i) => ({
      binStart: min + i * binWidth,
      binEnd: min + (i + 1) * binWidth,
      count: 0,
      isOutlier: false
    }));

    // Count values in each bin
    data.forEach(value => {
      const binIndex = Math.min(
        Math.floor((value - min) / binWidth),
        bins - 1
      );
      binData[binIndex].count++;
    });

    // Mark bins containing outliers
    binData.forEach(bin => {
      bin.isOutlier = showOutliers && (
        bin.binStart < stats.lowerBound ||
        bin.binEnd > stats.upperBound
      );
    });

    return binData;
  }, [data, bins, stats, showOutliers]);

  const handleExport = () => {
    const csv = ['Bin Start,Bin End,Count\n'];
    histogram.forEach(bin => {
      csv.push(`${bin.binStart.toFixed(3)},${bin.binEnd.toFixed(3)},${bin.count}\n`);
    });

    const blob = new Blob(csv, { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${featureName}_distribution.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Distribution: {featureName}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600">Mean</p>
          <p className="text-lg font-bold text-blue-700">{stats.mean.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600">Median</p>
          <p className="text-lg font-bold text-green-700">{stats.median.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-600">Std Dev</p>
          <p className="text-lg font-bold text-purple-700">{stats.stdDev.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-orange-50 rounded-lg">
          <p className="text-xs text-orange-600">Range</p>
          <p className="text-lg font-bold text-orange-700">
            {stats.min.toFixed(1)} - {stats.max.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Outlier Warning */}
      {showOutliers && stats.outliers.length > 0 && (
        <div className="flex items-start gap-2 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">
              {stats.outliers.length} Outlier{stats.outliers.length !== 1 ? 's' : ''} Detected
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Values outside [{stats.lowerBound.toFixed(2)}, {stats.upperBound.toFixed(2)}]
              are highlighted in red
            </p>
          </div>
        </div>
      )}

      {/* Distribution Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={histogram}
          margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
          onMouseMove={(state: { activeTooltipIndex?: number }) => {
            if (state?.activeTooltipIndex !== undefined) {
              setSelectedBin(state.activeTooltipIndex);
            }
          }}
          onMouseLeave={() => setSelectedBin(null)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="binStart"
            tickFormatter={(value) => value.toFixed(1)}
            stroke="#6b7280"
            label={{
              value: featureName,
              position: 'insideBottom',
              offset: -10,
              style: { fontSize: 12, fontWeight: 500 }
            }}
          />
          <YAxis
            stroke="#6b7280"
            label={{
              value: 'Frequency',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12 }
            }}
          />
          <Tooltip
            formatter={(value: number, name: string, props: { payload: { binStart: number; binEnd: number } }) => {
              const bin = props.payload;
              return [
                `Count: ${value}`,
                `Range: ${bin.binStart.toFixed(2)} - ${bin.binEnd.toFixed(2)}`
              ];
            }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              padding: '8px'
            }}
          />

          {/* Mean line */}
          <ReferenceLine
            x={stats.mean}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: `Mean: ${stats.mean.toFixed(2)}`,
              position: 'top',
              fill: '#3b82f6',
              fontSize: 11
            }}
          />

          {/* Median line */}
          <ReferenceLine
            x={stats.median}
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: `Median: ${stats.median.toFixed(2)}`,
              position: 'bottom',
              fill: '#10b981',
              fontSize: 11
            }}
          />

          {/* Outlier bounds */}
          {showOutliers && (
            <>
              <ReferenceLine
                x={stats.lowerBound}
                stroke="#ef4444"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <ReferenceLine
                x={stats.upperBound}
                stroke="#ef4444"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            </>
          )}

          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {histogram.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isOutlier ? '#ef4444' : '#3b82f6'}
                opacity={selectedBin === null || selectedBin === index ? 1 : 0.5}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Quartile Information */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-gray-600">Q1 (25%)</p>
          <p className="font-bold text-gray-900">{stats.q1.toFixed(2)}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-gray-600">Q2 (50%)</p>
          <p className="font-bold text-gray-900">{stats.median.toFixed(2)}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-gray-600">Q3 (75%)</p>
          <p className="font-bold text-gray-900">{stats.q3.toFixed(2)}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-gray-600">Normal Distribution</span>
        </div>
        {showOutliers && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-gray-600">Outliers</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-blue-500" style={{ borderTop: '2px dashed' }} />
          <span className="text-gray-600">Mean</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-green-500" style={{ borderTop: '2px dashed' }} />
          <span className="text-gray-600">Median</span>
        </div>
      </div>
    </div>
  );
}