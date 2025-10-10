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
  totalNumericColumns: number;
}

export function CorrelationHeatmap({ data, className }: CorrelationHeatmapProps) {
  // Memory-efficient correlation calculation directly from rows
  const calculateCorrelationFromRows = (rows: string[][], indexX: number, indexY: number): number => {
    const values: Array<{x: number, y: number}> = [];
    
    // Extract and filter valid numeric pairs
    for (const row of rows) {
      const x = parseFloat(row[indexX]);
      const y = parseFloat(row[indexY]);
      if (!isNaN(x) && !isNaN(y)) {
        values.push({ x, y });
      }
    }
    
    if (values.length < 2) return 0;
    
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
    
    // Single pass calculation
    for (const {x, y} of values) {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
      sumYY += y * y;
    }
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const correlationData = useMemo((): CorrelationData | null => {
    if (!data || data.length <= 1) return null;
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Limit data size for performance - sample if too large
    const maxRows = 1000;
    const sampledRows = rows.length > maxRows ? 
      rows.filter((_, index) => index % Math.ceil(rows.length / maxRows) === 0).slice(0, maxRows) : 
      rows;
    
    // Find numeric columns (store indices only, not values)
    const numericColumnIndices: { name: string; index: number }[] = [];
    
    headers.forEach((header, index) => {
      const sampleValues = sampledRows.slice(0, 100).map(row => parseFloat(row[index]));
      const numericCount = sampleValues.filter(v => !isNaN(v)).length;

      if (numericCount > sampleValues.length * 0.5) { // At least 50% numeric values
        // Check if column has variance (not constant)
        const validValues = sampleValues.filter(v => !isNaN(v));
        const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
        const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length;

        // Only include columns with non-zero variance
        if (variance > 0.0000001) {
          numericColumnIndices.push({ name: header, index });
        }
      }
    });
    
    if (numericColumnIndices.length < 2) return null;
    
    // Store original count for display
    const totalNumericColumns = numericColumnIndices.length;
    
    // Limit to maximum 15 columns for better visualization
    const limitedColumns = numericColumnIndices.slice(0, 15);
    
    // Calculate correlation matrix without storing large arrays
    const matrix: number[][] = [];
    
    for (let i = 0; i < limitedColumns.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < limitedColumns.length; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          // Calculate correlation on-demand without storing arrays
          const correlation = calculateCorrelationFromRows(
            sampledRows, 
            limitedColumns[i].index, 
            limitedColumns[j].index
          );
          matrix[i][j] = correlation;
        }
      }
    }
    
    return {
      columns: limitedColumns.map(col => col.name),
      matrix,
      totalNumericColumns
    };
  }, [data]);

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
          {correlationData && correlationData.totalNumericColumns > 15 && (
            <span className="block text-orange-600 mt-1">
              Showing first 15 of {correlationData.totalNumericColumns} numeric columns
            </span>
          )}
        </p>
      </div>
      
      <div className="overflow-auto max-h-96 border border-gray-200 rounded-lg">
        <div className="inline-block min-w-full">
          <table className="border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr>
                <th className="w-24 bg-white sticky left-0 z-20"></th>
                {columns.map((col, index) => (
                  <th key={index} className="p-1 text-xs font-medium text-gray-700 bg-white">
                    <div 
                      className="w-24 text-center transform -rotate-45 origin-center"
                      title={col}
                      style={{ height: '80px', display: 'flex', alignItems: 'end', justifyContent: 'center', paddingBottom: '8px' }}
                    >
                      <span className="whitespace-nowrap text-xs">
                        {col.length > 12 ? `${col.substring(0, 10)}...` : col}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {columns.map((rowCol, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="p-2 text-xs font-medium text-gray-700 text-right bg-white sticky left-0 border-r border-gray-200 z-10">
                    <div 
                      className="w-20 truncate"
                      title={rowCol}
                    >
                      {rowCol.length > 12 ? `${rowCol.substring(0, 10)}...` : rowCol}
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