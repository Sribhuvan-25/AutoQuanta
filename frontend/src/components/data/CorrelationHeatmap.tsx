'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface CorrelationHeatmapProps {
  data: string[][];
  className?: string;
}

interface CorrelationData {
  columns: string[];
  matrix: number[][];
}

export function CorrelationHeatmap({ data, className }: CorrelationHeatmapProps) {
  const correlationData = useMemo((): CorrelationData | null => {
    if (!data || data.length <= 1) return null;
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Find numeric columns
    const numericColumns: { name: string; index: number; values: number[] }[] = [];
    
    headers.forEach((header, index) => {
      const values = rows.map(row => parseFloat(row[index])).filter(v => !isNaN(v));
      if (values.length > rows.length * 0.5) { // At least 50% numeric values
        numericColumns.push({ name: header, index, values });
      }
    });
    
    if (numericColumns.length < 2) return null;
    
    // Calculate correlation matrix
    const matrix: number[][] = [];
    
    for (let i = 0; i < numericColumns.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < numericColumns.length; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const correlation = calculateCorrelation(numericColumns[i].values, numericColumns[j].values);
          matrix[i][j] = correlation;
        }
      }
    }
    
    return {
      columns: numericColumns.map(col => col.name),
      matrix
    };
  }, [data]);

  const calculateCorrelation = (x: number[], y: number[]): number => {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const getColorForCorrelation = (correlation: number): string => {
    const abs = Math.abs(correlation);
    const hue = correlation >= 0 ? 200 : 0; // Blue for positive, red for negative
    const saturation = Math.round(abs * 100);
    const lightness = Math.round(90 - abs * 40); // Darker for stronger correlation
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  if (!correlationData) {
    return (
      <div className={cn('p-6 text-center text-gray-500 bg-gray-50 rounded-lg', className)}>
        <p className="text-sm">Not enough numeric columns for correlation analysis</p>
        <p className="text-xs mt-1">Need at least 2 numeric columns</p>
      </div>
    );
  }

  const { columns, matrix } = correlationData;

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-1">
          Correlation Matrix
        </h4>
        <p className="text-xs text-gray-500">
          {columns.length} numeric columns • Correlation coefficients (-1 to +1)
        </p>
      </div>
      
      <div className="overflow-auto">
        <div className="inline-block min-w-full">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="w-24"></th>
                {columns.map((col, index) => (
                  <th key={index} className="p-1 text-xs font-medium text-gray-700">
                    <div 
                      className="w-20 truncate"
                      title={col}
                    >
                      {col}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {columns.map((rowCol, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="p-1 text-xs font-medium text-gray-700 text-right pr-2">
                    <div 
                      className="w-20 truncate"
                      title={rowCol}
                    >
                      {rowCol}
                    </div>
                  </td>
                  {columns.map((colCol, colIndex) => {
                    const correlation = matrix[rowIndex][colIndex];
                    return (
                      <td
                        key={colIndex}
                        className="w-20 h-12 p-1 border border-gray-200 text-center"
                        style={{ backgroundColor: getColorForCorrelation(correlation) }}
                        title={`${rowCol} vs ${colCol}: ${correlation.toFixed(3)}`}
                      >
                        <span className="text-xs font-medium text-gray-800">
                          {correlation.toFixed(2)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-200 border border-gray-300"></div>
          <span>Strong Negative</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border border-gray-300"></div>
          <span>No Correlation</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-200 border border-gray-300"></div>
          <span>Strong Positive</span>
        </div>
      </div>
    </div>
  );
}