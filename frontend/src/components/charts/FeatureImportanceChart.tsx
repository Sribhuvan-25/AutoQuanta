'use client';

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { TrendingUp, Download, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeatureImportanceChartProps {
  featureImportance: Record<string, number>;
  maxFeatures?: number;
  className?: string;
  title?: string;
}

export function FeatureImportanceChart({
  featureImportance,
  maxFeatures = 15,
  className,
  title = 'Feature Importance'
}: FeatureImportanceChartProps) {
  const [expanded, setExpanded] = useState(false);
  const [showCount, setShowCount] = useState(maxFeatures);

  // Convert to array and sort by importance
  const sortedFeatures = Object.entries(featureImportance)
    .map(([name, importance]) => ({
      name,
      importance: importance * 100, // Convert to percentage
      rawImportance: importance
    }))
    .sort((a, b) => b.rawImportance - a.rawImportance)
    .slice(0, showCount);

  // Color gradient based on importance
  const getColor = (importance: number, index: number) => {
    const total = sortedFeatures.length;
    const position = index / total;

    if (position < 0.2) return '#10b981'; // Green for top features
    if (position < 0.5) return '#3b82f6'; // Blue for mid features
    if (position < 0.8) return '#f59e0b'; // Orange for lower features
    return '#6b7280'; // Gray for lowest features
  };

  const handleExport = () => {
    const csv = ['Feature,Importance\n'];
    Object.entries(featureImportance)
      .sort(([, a], [, b]) => b - a)
      .forEach(([name, importance]) => {
        csv.push(`"${name}",${importance}\n`);
      });

    const blob = new Blob(csv, { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'feature_importance.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalFeatures = Object.keys(featureImportance).length;

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">
            (Top {showCount} of {totalFeatures})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4">
        Shows which features had the most influence on the model&apos;s predictions
      </p>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={expanded ? 600 : 400}>
        <BarChart
          data={sortedFeatures}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            tickFormatter={(value) => `${value.toFixed(1)}%`}
            stroke="#6b7280"
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Importance']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              padding: '8px'
            }}
          />
          <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
            {sortedFeatures.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.importance, index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Show more/less buttons */}
      {totalFeatures > maxFeatures && (
        <div className="flex justify-center mt-4 gap-2">
          {showCount < totalFeatures && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCount(Math.min(showCount + 10, totalFeatures))}
            >
              Show More ({totalFeatures - showCount} remaining)
            </Button>
          )}
          {showCount > maxFeatures && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCount(maxFeatures)}
            >
              Show Less
            </Button>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }} />
          <span className="text-gray-600">High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }} />
          <span className="text-gray-600">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }} />
          <span className="text-gray-600">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#6b7280' }} />
          <span className="text-gray-600">Minimal</span>
        </div>
      </div>
    </div>
  );
}