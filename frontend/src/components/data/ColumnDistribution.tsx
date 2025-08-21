'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import type { ColumnInfo } from '@/lib/types';

interface ColumnDistributionProps {
  column: ColumnInfo;
  data: string[][];
  className?: string;
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export function ColumnDistribution({ column, data, className }: ColumnDistributionProps) {
  const columnIndex = useMemo(() => {
    if (!data || data.length === 0) return -1;
    const headers = data[0];
    return headers.findIndex(header => header === column.name);
  }, [data, column.name]);

  const distributionData = useMemo(() => {
    if (columnIndex === -1 || !data || data.length <= 1) return [];
    
    const values = data.slice(1).map(row => row[columnIndex]).filter(Boolean);
    
    if (column.dtype === 'int64' || column.dtype === 'float64') {
      // For numeric columns, create histogram bins
      const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      if (numericValues.length === 0) return [];
      
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const binCount = Math.min(10, Math.max(5, Math.ceil(Math.sqrt(numericValues.length))));
      const binSize = (max - min) / binCount;
      
      const bins: Record<string, number> = {};
      
      for (let i = 0; i < binCount; i++) {
        const binStart = min + i * binSize;
        const binEnd = min + (i + 1) * binSize;
        const binLabel = i === binCount - 1 
          ? `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`
          : `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`;
        bins[binLabel] = 0;
      }
      
      numericValues.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
        const binStart = min + binIndex * binSize;
        const binEnd = min + (binIndex + 1) * binSize;
        const binLabel = binIndex === binCount - 1 
          ? `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`
          : `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`;
        bins[binLabel]++;
      });
      
      return Object.entries(bins).map(([range, count]) => ({
        name: range,
        value: count,
        percentage: ((count / numericValues.length) * 100).toFixed(1)
      }));
    } else {
      // For categorical columns, count frequencies
      const counts: Record<string, number> = {};
      values.forEach(value => {
        const val = value.toString();
        counts[val] = (counts[val] || 0) + 1;
      });
      
      // Sort by frequency and take top 10
      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, value]) => ({
          name: name.length > 20 ? name.substring(0, 17) + '...' : name,
          value,
          percentage: ((value / values.length) * 100).toFixed(1)
        }));
    }
  }, [columnIndex, data, column.dtype, column.name]);

  if (distributionData.length === 0) {
    return (
      <div className={cn('p-4 text-center text-gray-500', className)}>
        No data available for visualization
      </div>
    );
  }

  const isNumeric = column.dtype === 'int64' || column.dtype === 'float64';

  return (
    <div className={cn('w-full h-64', className)}>
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-900 mb-1 truncate" title={column.name}>
          {column.name} Distribution
        </h4>
        <p className="text-xs text-gray-500">
          {isNumeric ? 'Histogram' : 'Top Categories'} • {distributionData.length} bins
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        {isNumeric ? (
          <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-sm text-blue-600">
                        Count: {payload[0].value}
                      </p>
                      <p className="text-xs text-gray-500">
                        {payload[0].payload.percentage}% of total
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" fill="#3B82F6" />
          </BarChart>
        ) : (
          <PieChart>
            <Pie
              data={distributionData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percentage }) => `${name} (${percentage}%)`}
            >
              {distributionData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="text-sm font-medium">{payload[0].payload.name}</p>
                      <p className="text-sm text-blue-600">
                        Count: {payload[0].value}
                      </p>
                      <p className="text-xs text-gray-500">
                        {payload[0].payload.percentage}% of total
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}