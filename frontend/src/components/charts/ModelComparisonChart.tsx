'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { cn } from '@/lib/utils';
import { BarChart3, Target, Download, RadioTower } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ModelPerformance } from '@/lib/types';

interface ModelComparisonChartProps {
  models: ModelPerformance[];
  taskType: 'classification' | 'regression';
  className?: string;
  title?: string;
}

export function ModelComparisonChart({
  models,
  taskType,
  className,
  title = 'Model Comparison'
}: ModelComparisonChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');

  // Prepare data for bar chart
  const barChartData = models.map(model => ({
    name: model.model_name.replace(/_/g, ' '),
    score: model.mean_score * (taskType === 'regression' ? 1 : 100),
    trainingTime: model.training_time,
    stdDev: model.std_score * (taskType === 'regression' ? 1 : 100)
  })).sort((a, b) => b.score - a.score);

  // Prepare data for radar chart
  const radarChartData = models.map(model => {
    const metrics = model.comprehensive_metrics || {};

    if (taskType === 'classification') {
      return {
        model: model.model_name.replace(/_/g, ' ').substring(0, 15),
        Accuracy: (metrics.accuracy || model.mean_score) * 100,
        Precision: (metrics.precision || 0) * 100,
        Recall: (metrics.recall || 0) * 100,
        'F1 Score': (metrics.f1_score || 0) * 100,
        Speed: Math.max(0, 100 - (model.training_time / 10))
      };
    } else {
      return {
        model: model.model_name.replace(/_/g, ' ').substring(0, 15),
        'R² Score': (metrics.r2_score || model.mean_score) * 100,
        'Accuracy': Math.max(0, (1 - (metrics.mse || 1)) * 100),
        'Consistency': Math.max(0, (1 - model.std_score) * 100),
        Speed: Math.max(0, 100 - (model.training_time / 10))
      };
    }
  });

  const getScoreLabel = () => {
    return taskType === 'classification' ? 'Accuracy (%)' : 'R² Score';
  };

  const formatScore = (value: number) => {
    if (taskType === 'regression') {
      return value.toFixed(4);
    }
    return `${value.toFixed(1)}%`;
  };

  const handleExport = () => {
    const csv = ['Model,Score,Training Time (s),Std Dev\n'];
    models.forEach(model => {
      csv.push(`${model.model_name},${model.mean_score},${model.training_time},${model.std_score}\n`);
    });

    const blob = new Blob(csv, { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'model_comparison.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const bestModel = models.reduce((best, current) =>
    current.mean_score > best.mean_score ? current : best
  );

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">({models.length} models)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChartType(chartType === 'bar' ? 'radar' : 'bar')}
          >
            {chartType === 'bar' ? (
              <>
                <RadioTower className="h-4 w-4 mr-1" />
                Radar
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4 mr-1" />
                Bar
              </>
            )}
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

      {/* Best Model Highlight */}
      <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-xs text-gray-600">Best Model</p>
            <p className="text-sm font-semibold text-gray-900">{bestModel.model_name.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600">{getScoreLabel()}</p>
          <p className="text-lg font-bold text-green-600">
            {formatScore(bestModel.mean_score * (taskType === 'regression' ? 1 : 100))}
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      {chartType === 'bar' && (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              stroke="#6b7280"
              label={{
                value: getScoreLabel(),
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12 }
              }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'score') return [formatScore(value), getScoreLabel()];
                if (name === 'trainingTime') return [`${value.toFixed(2)}s`, 'Training Time'];
                if (name === 'stdDev') return [formatScore(value), 'Std Dev'];
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
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => {
                if (value === 'score') return getScoreLabel();
                if (value === 'trainingTime') return 'Training Time (s)';
                if (value === 'stdDev') return 'Std Dev';
                return value;
              }}
            />
            <Bar dataKey="score" fill="#3b82f6" name="score" radius={[4, 4, 0, 0]} />
            <Bar dataKey="trainingTime" fill="#f59e0b" name="trainingTime" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Radar Chart */}
      {chartType === 'radar' && (
        <ResponsiveContainer width="100%" height={500}>
          <RadarChart data={radarChartData[0] ? Object.keys(radarChartData[0])
            .filter(key => key !== 'model')
            .map(metric => {
              const dataPoint: Record<string, unknown> = { metric };
              radarChartData.forEach(model => {
                dataPoint[model.model] = model[metric as keyof typeof model];
              });
              return dataPoint;
            }) : []}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fontSize: 11, fill: '#6b7280' }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(1)}%`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '8px'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
            {radarChartData.map((model, index) => {
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
              return (
                <Radar
                  key={index}
                  name={model.model}
                  dataKey={model.model}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.2}
                />
              );
            })}
          </RadarChart>
        </ResponsiveContainer>
      )}

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 mb-1">Average Score</p>
          <p className="text-lg font-bold text-blue-700">
            {formatScore((models.reduce((sum, m) => sum + m.mean_score, 0) / models.length) * (taskType === 'regression' ? 1 : 100))}
          </p>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <p className="text-xs text-orange-600 mb-1">Avg Training Time</p>
          <p className="text-lg font-bold text-orange-700">
            {(models.reduce((sum, m) => sum + m.training_time, 0) / models.length).toFixed(2)}s
          </p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-600 mb-1">Best Improvement</p>
          <p className="text-lg font-bold text-purple-700">
            {formatScore(((bestModel.mean_score - models[models.length - 1].mean_score) / models[models.length - 1].mean_score * 100))}
          </p>
        </div>
      </div>
    </div>
  );
}