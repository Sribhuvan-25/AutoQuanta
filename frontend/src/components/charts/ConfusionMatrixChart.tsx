'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Grid3x3, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfusionMatrixChartProps {
  confusionMatrix: number[][];
  classLabels?: string[];
  className?: string;
  title?: string;
}

export function ConfusionMatrixChart({
  confusionMatrix,
  classLabels,
  className,
  title = 'Confusion Matrix'
}: ConfusionMatrixChartProps) {
  const [showPercentages, setShowPercentages] = useState(false);

  // Calculate total for percentages
  const total = confusionMatrix.reduce((sum, row) =>
    sum + row.reduce((rowSum, val) => rowSum + val, 0), 0
  );

  // Calculate row totals for normalization
  const rowTotals = confusionMatrix.map(row =>
    row.reduce((sum, val) => sum + val, 0)
  );

  // Get color based on value intensity
  const getColor = (value: number, rowIndex: number) => {
    const maxInRow = Math.max(...confusionMatrix[rowIndex]);
    const intensity = maxInRow > 0 ? value / maxInRow : 0;

    // Diagonal (correct predictions) - green gradient
    const colIndex = confusionMatrix[rowIndex].indexOf(value);
    if (rowIndex === colIndex) {
      if (intensity > 0.8) return 'bg-green-600 text-white';
      if (intensity > 0.6) return 'bg-green-500 text-white';
      if (intensity > 0.4) return 'bg-green-400 text-gray-900';
      if (intensity > 0.2) return 'bg-green-300 text-gray-900';
      return 'bg-green-100 text-gray-900';
    }

    // Off-diagonal (incorrect predictions) - red gradient
    if (intensity > 0.6) return 'bg-red-600 text-white';
    if (intensity > 0.4) return 'bg-red-500 text-white';
    if (intensity > 0.2) return 'bg-red-400 text-gray-900';
    if (intensity > 0.1) return 'bg-red-300 text-gray-900';
    return 'bg-red-100 text-gray-900';
  };

  // Calculate metrics
  const calculateMetrics = () => {
    const n = confusionMatrix.length;
    let totalCorrect = 0;

    for (let i = 0; i < n; i++) {
      totalCorrect += confusionMatrix[i][i];
    }

    const accuracy = total > 0 ? (totalCorrect / total) * 100 : 0;

    // Per-class metrics
    const classMetrics = confusionMatrix.map((row, i) => {
      const truePositives = confusionMatrix[i][i];
      const falsePositives = confusionMatrix.reduce((sum, r, idx) =>
        idx !== i ? sum + r[i] : sum, 0
      );
      const falseNegatives = row.reduce((sum, val, idx) =>
        idx !== i ? sum + val : sum, 0
      );

      const precision = (truePositives + falsePositives) > 0
        ? (truePositives / (truePositives + falsePositives)) * 100
        : 0;
      const recall = (truePositives + falseNegatives) > 0
        ? (truePositives / (truePositives + falseNegatives)) * 100
        : 0;
      const f1Score = (precision + recall) > 0
        ? (2 * precision * recall) / (precision + recall)
        : 0;

      return { precision, recall, f1Score };
    });

    return { accuracy, classMetrics };
  };

  const metrics = calculateMetrics();
  const labels = classLabels || confusionMatrix.map((_, i) => `Class ${i}`);

  const handleExport = () => {
    const csv = ['Actual/Predicted,' + labels.join(',') + '\n'];
    confusionMatrix.forEach((row, i) => {
      csv.push(`${labels[i]},${row.join(',')}\n`);
    });

    const blob = new Blob(csv, { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'confusion_matrix.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPercentages(!showPercentages)}
          >
            {showPercentages ? 'Show Counts' : 'Show %'}
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
      <div className="flex items-start gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-900">
          Rows show actual classes, columns show predicted classes.
          Diagonal values (green) are correct predictions, off-diagonal (red) are mistakes.
        </p>
      </div>

      {/* Overall Accuracy */}
      <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-600">Overall Accuracy</p>
          <p className="text-3xl font-bold text-green-600">
            {metrics.accuracy.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Confusion Matrix */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-xs font-medium text-gray-600 border border-gray-200 bg-gray-50">
                  Actual ↓ / Predicted →
                </th>
                {labels.map((label, i) => (
                  <th key={i} className="p-2 text-xs font-medium text-gray-900 border border-gray-200 bg-gray-50 min-w-[80px]">
                    {label}
                  </th>
                ))}
                <th className="p-2 text-xs font-medium text-gray-600 border border-gray-200 bg-gray-50">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {confusionMatrix.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="p-2 text-sm font-medium text-gray-900 border border-gray-200 bg-gray-50">
                    {labels[rowIndex]}
                  </td>
                  {row.map((value, colIndex) => {
                    const percentage = rowTotals[rowIndex] > 0
                      ? (value / rowTotals[rowIndex]) * 100
                      : 0;

                    return (
                      <td
                        key={colIndex}
                        className={cn(
                          'p-3 text-center border border-gray-200 transition-colors',
                          getColor(value, rowIndex)
                        )}
                      >
                        <div className="font-bold">
                          {showPercentages ? `${percentage.toFixed(1)}%` : value}
                        </div>
                        {value > 0 && (
                          <div className="text-xs opacity-75">
                            {showPercentages ? `(${value})` : `${percentage.toFixed(0)}%`}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-2 text-sm font-medium text-gray-700 border border-gray-200 bg-gray-50 text-center">
                    {rowTotals[rowIndex]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Class Metrics */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Per-Class Metrics</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.classMetrics.map((metric, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-900 mb-2">{labels[i]}</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Precision:</span>
                  <span className="font-medium text-blue-600">{metric.precision.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recall:</span>
                  <span className="font-medium text-green-600">{metric.recall.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">F1 Score:</span>
                  <span className="font-medium text-purple-600">{metric.f1Score.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-gray-600">Correct Predictions</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-gray-600">Incorrect Predictions</span>
        </div>
      </div>
    </div>
  );
}