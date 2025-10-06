'use client';

import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load chart components
const LazyBarChart = lazy(() => import('@/components/charts/BarChart').then(mod => ({ default: mod.BarChart })));
const LazyLineChart = lazy(() => import('@/components/charts/LineChart').then(mod => ({ default: mod.LineChart })));
const LazyScatterPlot = lazy(() => import('@/components/charts/ScatterPlot').then(mod => ({ default: mod.ScatterPlot })));
const LazyHeatmap = lazy(() => import('@/components/charts/Heatmap').then(mod => ({ default: mod.Heatmap })));

interface ChartLoadingFallbackProps {
  height?: string;
  message?: string;
}

function ChartLoadingFallback({ height = '300px', message = 'Loading visualization...' }: ChartLoadingFallbackProps) {
  return (
    <div
      className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200"
      style={{ height }}
    >
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// Lazy-loaded chart wrapper components
export function LazyBarChartWrapper(props: Record<string, unknown>) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <LazyBarChart {...props} />
    </Suspense>
  );
}

export function LazyLineChartWrapper(props: Record<string, unknown>) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <LazyLineChart {...props} />
    </Suspense>
  );
}

export function LazyScatterPlotWrapper(props: Record<string, unknown>) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <LazyScatterPlot {...props} />
    </Suspense>
  );
}

export function LazyHeatmapWrapper(props: Record<string, unknown>) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <LazyHeatmap {...props} />
    </Suspense>
  );
}

/**
 * Intersection Observer-based lazy loader
 * Only loads component when it enters viewport
 */
interface IntersectionLazyLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
}

export function IntersectionLazyLoad({
  children,
  fallback = <ChartLoadingFallback />,
  rootMargin = '100px',
  threshold = 0.1
}: IntersectionLazyLoadProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
}
