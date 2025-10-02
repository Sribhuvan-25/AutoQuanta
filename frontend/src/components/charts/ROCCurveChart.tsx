'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area,
  ComposedChart
} from 'recharts';
import { cn } from '@/lib/utils';
import { Activity, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ROCCurveChartProps {
  rocData: {
    fpr: number[];  // False Positive Rate
    tpr: number[];  // True Positive Rate
    thresholds: number[];
    auc: number;    // Area Under Curve
  };
  className?: string;
  title?: string;
}

export function ROCCurveChart({
  rocData,
  className,
  title = 'ROC Curve'
}: ROCCurveChartProps) {
  const [showThresholds, setShowThresholds] = useState(false);

  // Prepare data for chart
  const chartData = rocData.fpr.map((fpr, i) => ({
    fpr: fpr * 100,
    tpr: rocData.tpr[i] * 100,
    threshold: rocData.thresholds[i]
  }));

  // Add diagonal reference line data
  const diagonalData = [
    { fpr: 0, tpr: 0 },
    { fpr: 100, tpr: 100 }
  ];

  // Calculate Youden's index (optimal threshold)
  const youdensIndex = rocData.tpr.map((tpr, i) => tpr - rocData.fpr[i]);
  const optimalIdx = youdensIndex.indexOf(Math.max(...youdensIndex));
  const optimalThreshold = rocData.thresholds[optimalIdx];
  const optimalPoint = {
    fpr: rocData.fpr[optimalIdx] * 100,
    tpr: rocData.tpr[optimalIdx] * 100
  };

  const getAUCColor = (auc: number): string => {
    if (auc >= 0.9) return 'text-green-600';
    if (auc >= 0.8) return 'text-blue-600';
    if (auc >= 0.7) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getAUCLabel = (auc: number): string => {
    if (auc >= 0.9) return 'Excellent';
    if (auc >= 0.8) return 'Good';
    if (auc >= 0.7) return 'Fair';
    if (auc >= 0.6) return 'Poor';
    return 'Very Poor';
  };

  const handleExport = () => {
    const csv = ['FPR,TPR,Threshold\n'];
    rocData.fpr.forEach((fpr, i) => {
      csv.push(`${fpr},${rocData.tpr[i]},${rocData.thresholds[i]}\n`);
    });

    const blob = new Blob(csv, { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'roc_curve_data.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowThresholds(!showThresholds)}
          >
            {showThresholds ? 'Hide Thresholds' : 'Show Thresholds'}
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

      {/* AUC Score Display */}
      <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Area Under Curve (AUC)</p>
            <div className="flex items-center gap-3">
              <p className={cn('text-3xl font-bold', getAUCColor(rocData.auc))}>
                {rocData.auc.toFixed(4)}
              </p>
              <span className={cn(
                'px-3 py-1 rounded-full text-sm font-medium',
                rocData.auc >= 0.9 ? 'bg-green-100 text-green-700' :
                rocData.auc >= 0.8 ? 'bg-blue-100 text-blue-700' :
                rocData.auc >= 0.7 ? 'bg-yellow-100 text-yellow-700' :
                'bg-orange-100 text-orange-700'
              )}>
                {getAUCLabel(rocData.auc)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Optimal Threshold</p>
            <p className="text-lg font-bold text-purple-600">
              {optimalThreshold.toFixed(3)}
            </p>
            <p className="text-xs text-gray-500">
              TPR: {optimalPoint.tpr.toFixed(1)}%, FPR: {optimalPoint.fpr.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-900">
          <p className="font-medium mb-1">Understanding ROC Curve:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Closer the curve to the top-left corner, the better</li>
            <li>AUC of 1.0 = perfect classifier</li>
            <li>AUC of 0.5 = random guessing (diagonal line)</li>
            <li>Optimal threshold maximizes True Positives while minimizing False Positives</li>
          </ul>
        </div>
      </div>

      {/* ROC Curve Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="fpr"
            type="number"
            domain={[0, 100]}
            label={{
              value: 'False Positive Rate (%)',
              position: 'insideBottom',
              offset: -10,
              style: { fontSize: 12 }
            }}
            stroke="#6b7280"
          />
          <YAxis
            dataKey="tpr"
            type="number"
            domain={[0, 100]}
            label={{
              value: 'True Positive Rate (%)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12 }
            }}
            stroke="#6b7280"
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'threshold') return [value.toFixed(3), 'Threshold'];
              return [`${value.toFixed(1)}%`, name === 'tpr' ? 'TPR' : 'FPR'];
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
              if (value === 'tpr') return 'ROC Curve';
              if (value === 'diagonal') return 'Random Classifier';
              return value;
            }}
          />

          {/* Area under curve */}
          <Area
            data={chartData}
            type="monotone"
            dataKey="tpr"
            stroke="none"
            fill="#8b5cf6"
            fillOpacity={0.1}
          />

          {/* ROC Curve */}
          <Line
            data={chartData}
            type="monotone"
            dataKey="tpr"
            stroke="#8b5cf6"
            strokeWidth={3}
            dot={false}
            name="tpr"
          />

          {/* Diagonal reference line */}
          <Line
            data={diagonalData}
            type="linear"
            dataKey="tpr"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="diagonal"
          />

          {/* Optimal point marker */}
          <ReferenceLine
            x={optimalPoint.fpr}
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <ReferenceLine
            y={optimalPoint.tpr}
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Threshold Information */}
      {showThresholds && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Thresholds</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[0, Math.floor(chartData.length / 2), chartData.length - 1].map((idx) => {
              const point = chartData[idx];
              return (
                <div key={idx} className="p-3 bg-white rounded border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Threshold: {point.threshold.toFixed(3)}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">TPR:</span>
                      <span className="font-medium text-green-600 ml-1">{point.tpr.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">FPR:</span>
                      <span className="font-medium text-red-600 ml-1">{point.fpr.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance Interpretation */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
        <div className="p-2 bg-gray-50 rounded">
          <p className="text-gray-600">Sensitivity (TPR)</p>
          <p className="font-bold text-green-600">{(rocData.tpr[rocData.tpr.length - 1] * 100).toFixed(1)}%</p>
        </div>
        <div className="p-2 bg-gray-50 rounded">
          <p className="text-gray-600">Specificity</p>
          <p className="font-bold text-blue-600">
            {((1 - rocData.fpr[rocData.fpr.length - 1]) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="p-2 bg-gray-50 rounded">
          <p className="text-gray-600">Balance Point</p>
          <p className="font-bold text-purple-600">
            {((optimalPoint.tpr + (100 - optimalPoint.fpr)) / 2).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}