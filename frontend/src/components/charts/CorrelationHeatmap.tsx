'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Flame, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CorrelationHeatmapProps {
  correlationMatrix: number[][];
  featureNames: string[];
  className?: string;
  title?: string;
}

export function CorrelationHeatmap({
  correlationMatrix,
  featureNames,
  className,
  title = 'Feature Correlation Heatmap'
}: CorrelationHeatmapProps) {
  const [cellSize, setCellSize] = useState(60);
  const [showValues, setShowValues] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  // Get color based on correlation value
  const getColor = (value: number): string => {
    // Normalize to 0-1 range (correlation is -1 to 1)
    const normalized = (value + 1) / 2;

    if (value > 0.7) return '#dc2626'; // Strong positive - red
    if (value > 0.4) return '#f97316'; // Moderate positive - orange
    if (value > 0.1) return '#fbbf24'; // Weak positive - yellow
    if (value > -0.1) return '#e5e7eb'; // No correlation - gray
    if (value > -0.4) return '#93c5fd'; // Weak negative - light blue
    if (value > -0.7) return '#3b82f6'; // Moderate negative - blue
    return '#1e40af'; // Strong negative - dark blue
  };

  const getTextColor = (value: number): string => {
    const absValue = Math.abs(value);
    return absValue > 0.5 ? 'text-white' : 'text-gray-900';
  };

  const getCorrelationLabel = (value: number): string => {
    const abs = Math.abs(value);
    if (abs > 0.7) return 'Strong';
    if (abs > 0.4) return 'Moderate';
    if (abs > 0.1) return 'Weak';
    return 'None';
  };

  const handleExport = () => {
    const csv = [',' + featureNames.join(',') + '\n'];
    correlationMatrix.forEach((row, i) => {
      csv.push(`${featureNames[i]},${row.map(v => v.toFixed(3)).join(',')}\n`);
    });

    const blob = new Blob(csv, { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'correlation_matrix.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const zoomIn = () => setCellSize(Math.min(cellSize + 10, 100));
  const zoomOut = () => setCellSize(Math.max(cellSize - 10, 30));

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-red-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowValues(!showValues)}
          >
            {showValues ? 'Hide Values' : 'Show Values'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={cellSize <= 30}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={cellSize >= 100}
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

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4">
        Shows how features relate to each other. Red = positive correlation, Blue = negative correlation.
      </p>

      {/* Hovered cell info */}
      {hoveredCell && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Feature 1:</span>
              <span className="font-medium text-gray-900 ml-2">{featureNames[hoveredCell.row]}</span>
            </div>
            <div>
              <span className="text-gray-600">Feature 2:</span>
              <span className="font-medium text-gray-900 ml-2">{featureNames[hoveredCell.col]}</span>
            </div>
            <div>
              <span className="text-gray-600">Correlation:</span>
              <span className="font-bold text-blue-600 ml-2">
                {correlationMatrix[hoveredCell.row][hoveredCell.col].toFixed(3)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Strength:</span>
              <span className="font-medium text-gray-900 ml-2">
                {getCorrelationLabel(correlationMatrix[hoveredCell.row][hoveredCell.col])}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap */}
      <div className="overflow-auto max-h-[600px]">
        <table className="border-collapse" style={{ fontSize: `${Math.max(8, cellSize / 8)}px` }}>
          <thead>
            <tr>
              <th className="p-1 sticky top-0 left-0 bg-white z-20 border border-gray-300" />
              {featureNames.map((name, i) => (
                <th
                  key={i}
                  className="sticky top-0 bg-gray-50 z-10 border border-gray-300 p-1"
                  style={{
                    width: cellSize,
                    minWidth: cellSize,
                    maxWidth: cellSize,
                    height: cellSize
                  }}
                >
                  <div
                    className="transform -rotate-45 origin-left text-xs font-medium text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{ maxWidth: cellSize * 1.4 }}
                    title={name}
                  >
                    {name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {correlationMatrix.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td
                  className="sticky left-0 bg-gray-50 z-10 border border-gray-300 p-2 text-xs font-medium text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{
                    maxWidth: 150,
                    minWidth: 100
                  }}
                  title={featureNames[rowIndex]}
                >
                  {featureNames[rowIndex]}
                </td>
                {row.map((value, colIndex) => (
                  <td
                    key={colIndex}
                    className={cn(
                      'border border-gray-300 text-center font-medium transition-all cursor-pointer',
                      getTextColor(value),
                      hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex && 'ring-2 ring-blue-500'
                    )}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      minWidth: cellSize,
                      maxWidth: cellSize,
                      backgroundColor: getColor(value)
                    }}
                    onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${featureNames[rowIndex]} vs ${featureNames[colIndex]}: ${value.toFixed(3)}`}
                  >
                    {showValues && cellSize >= 50 && (
                      <div className="flex items-center justify-center h-full">
                        {value.toFixed(2)}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6">
        <p className="text-xs font-medium text-gray-700 mb-2">Correlation Strength</p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="h-6 rounded flex">
              <div className="flex-1 bg-[#1e40af]" />
              <div className="flex-1 bg-[#3b82f6]" />
              <div className="flex-1 bg-[#93c5fd]" />
              <div className="flex-1 bg-[#e5e7eb]" />
              <div className="flex-1 bg-[#fbbf24]" />
              <div className="flex-1 bg-[#f97316]" />
              <div className="flex-1 bg-[#dc2626]" />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>-1.0</span>
              <span>-0.5</span>
              <span>0.0</span>
              <span>0.5</span>
              <span>1.0</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-2">
          <span>Strong Negative</span>
          <span>No Correlation</span>
          <span>Strong Positive</span>
        </div>
      </div>

      {/* High Correlation Warnings */}
      {(() => {
        const highCorrelations: { f1: string; f2: string; value: number }[] = [];
        for (let i = 0; i < correlationMatrix.length; i++) {
          for (let j = i + 1; j < correlationMatrix[i].length; j++) {
            const value = correlationMatrix[i][j];
            if (Math.abs(value) > 0.8) {
              highCorrelations.push({
                f1: featureNames[i],
                f2: featureNames[j],
                value
              });
            }
          }
        }

        if (highCorrelations.length > 0) {
          return (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-900 mb-2">
                High Correlations Detected ({highCorrelations.length})
              </p>
              <div className="space-y-1 text-xs text-yellow-800">
                {highCorrelations.slice(0, 5).map((item, i) => (
                  <div key={i}>
                    {item.f1} ↔ {item.f2}: <span className="font-bold">{item.value.toFixed(3)}</span>
                  </div>
                ))}
                {highCorrelations.length > 5 && (
                  <p className="text-yellow-700">...and {highCorrelations.length - 5} more</p>
                )}
              </div>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}