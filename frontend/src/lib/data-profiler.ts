/**
 * Advanced data profiling utilities for AutoQuanta
 * Provides comprehensive statistical analysis and data quality assessment
 */

import type { ColumnInfo, DataWarning } from './types';
import { generateColumnStats, analyzeColumnTypes } from './csv-utils';

export interface DataQualityReport {
  overall_score: number;
  completeness: number;
  validity: number;
  uniqueness: number;
  consistency: number;
  issues: DataQualityIssue[];
  recommendations: string[];
}

export interface DataQualityIssue {
  type: 'missing_data' | 'duplicates' | 'outliers' | 'inconsistent_format' | 'low_cardinality' | 'high_cardinality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  column: string;
  message: string;
  count: number;
  percentage: number;
  examples?: string[];
  suggestion: string;
}

export interface StatisticalSummary {
  dataset_info: {
    total_rows: number;
    total_columns: number;
    memory_usage_mb: number;
    duplicate_rows: number;
    complete_rows: number;
  };
  column_types: {
    numeric: number;
    categorical: number;
    datetime: number;
    boolean: number;
    text: number;
  };
  missing_data: {
    total_missing: number;
    missing_percentage: number;
    columns_with_missing: string[];
    missing_by_column: Record<string, number>;
  };
  outliers: {
    total_outliers: number;
    columns_with_outliers: string[];
    outlier_details: Record<string, { count: number; method: string; threshold: number }>;
  };
  correlations: {
    strong_positive: Array<{ col1: string; col2: string; correlation: number }>;
    strong_negative: Array<{ col1: string; col2: string; correlation: number }>;
    weak_correlations: Array<{ col1: string; col2: string; correlation: number }>;
  };
}

export interface AdvancedColumnProfile extends ColumnInfo {
  data_quality_score: number;
  completeness: number;
  validity: number;
  uniqueness_ratio: number;
  outlier_count: number;
  outlier_percentage: number;
  pattern_analysis: {
    common_patterns: Array<{ pattern: string; count: number; percentage: number }>;
    format_consistency: number;
  };
  distribution_analysis: {
    skewness?: number;
    kurtosis?: number;
    is_normal?: boolean;
    distribution_type?: 'normal' | 'uniform' | 'exponential' | 'bimodal' | 'unknown';
  };
  recommendations: string[];
}

/**
 * Generate comprehensive data profile with quality assessment
 */
export function generateAdvancedProfile(
  headers: string[], 
  rows: string[][]
): {
  columns: AdvancedColumnProfile[];
  statistical_summary: StatisticalSummary;
  quality_report: DataQualityReport;
  warnings: DataWarning[];
} {
  const warnings: DataWarning[] = [];
  const qualityIssues: DataQualityIssue[] = [];

  // Basic column analysis
  const basicColumnTypes = analyzeColumnTypes(headers, rows);
  
  // Advanced column profiling
  const columns: AdvancedColumnProfile[] = headers.map((header, columnIndex) => {
    const values = rows.map(row => row[columnIndex] || '');
    const nonEmptyValues = values.filter(val => val && val.trim().length > 0);
    const basicInfo = basicColumnTypes[columnIndex];
    
    // Calculate advanced metrics
    const completeness = nonEmptyValues.length / values.length;
    const uniqueValues = new Set(nonEmptyValues);
    const uniquenessRatio = uniqueValues.size / nonEmptyValues.length;
    
    // Outlier detection for numeric columns
    let outlierCount = 0;
    let outlierPercentage = 0;
    
    if (basicInfo.detectedType === 'integer' || basicInfo.detectedType === 'float') {
      const numericValues = nonEmptyValues.map(v => parseFloat(v)).filter(v => !isNaN(v));
      const outliers = detectOutliers(numericValues);
      outlierCount = outliers.length;
      outlierPercentage = (outlierCount / numericValues.length) * 100;
    }
    
    // Pattern analysis
    const patternAnalysis = analyzePatterns(nonEmptyValues);
    
    // Distribution analysis for numeric columns
    let distributionAnalysis = {};
    if (basicInfo.detectedType === 'integer' || basicInfo.detectedType === 'float') {
      const numericValues = nonEmptyValues.map(v => parseFloat(v)).filter(v => !isNaN(v));
      distributionAnalysis = analyzeDistribution(numericValues);
    }
    
    // Data quality scoring
    const validityScore = calculateValidityScore(nonEmptyValues, basicInfo.detectedType);
    const qualityScore = (completeness * 0.4) + (validityScore * 0.3) + (uniquenessRatio * 0.3);
    
    // Generate recommendations
    const recommendations = generateColumnRecommendations(
      header, 
      basicInfo, 
      completeness, 
      uniquenessRatio, 
      outlierPercentage,
      patternAnalysis.format_consistency
    );
    
    // Add quality issues
    addColumnQualityIssues(
      qualityIssues, 
      header, 
      completeness, 
      uniquenessRatio, 
      outlierPercentage,
      patternAnalysis.format_consistency,
      nonEmptyValues.length
    );
    
    return {
      name: basicInfo.name,
      dtype: basicInfo.detectedType === 'integer' ? 'int64' : 
            basicInfo.detectedType === 'float' ? 'float64' :
            basicInfo.detectedType === 'boolean' ? 'bool' : 'object',
      missing_count: basicInfo.nullCount,
      missing_percentage: (basicInfo.nullCount / values.length) * 100,
      unique_count: basicInfo.uniqueCount,
      unique_percentage: (basicInfo.uniqueCount / values.length) * 100,
      memory_usage: basicInfo.sampleValues.join('').length * 8,
      stats: generateColumnStats(nonEmptyValues, basicInfo.detectedType),
      warnings: basicInfo.confidence < 0.8 ? [`Low confidence (${(basicInfo.confidence * 100).toFixed(0)}%) in type detection`] : [],
      data_quality_score: qualityScore,
      completeness,
      validity: validityScore,
      uniqueness_ratio: uniquenessRatio,
      outlier_count: outlierCount,
      outlier_percentage: outlierPercentage,
      pattern_analysis: patternAnalysis,
      distribution_analysis: distributionAnalysis,
      recommendations
    };
  });

  // Generate statistical summary
  const statisticalSummary = generateStatisticalSummary(headers, rows, columns);
  
  // Generate overall quality report
  const qualityReport = generateQualityReport(columns, qualityIssues, statisticalSummary);
  
  // Generate warnings
  generateDataWarnings(warnings, columns, statisticalSummary);

  return {
    columns,
    statistical_summary: statisticalSummary,
    quality_report: qualityReport,
    warnings
  };
}

/**
 * Detect outliers using IQR method
 */
function detectOutliers(values: number[]): number[] {
  if (values.length < 4) return [];
  
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return values.filter(value => value < lowerBound || value > upperBound);
}

/**
 * Analyze patterns in categorical/text data
 */
function analyzePatterns(values: string[]): {
  common_patterns: Array<{ pattern: string; count: number; percentage: number }>;
  format_consistency: number;
} {
  if (values.length === 0) {
    return { common_patterns: [], format_consistency: 1 };
  }
  
  // Generate pattern signatures
  const patterns = values.map(value => generatePatternSignature(value));
  const patternCounts = patterns.reduce((acc, pattern) => {
    acc[pattern] = (acc[pattern] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const sortedPatterns = Object.entries(patternCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([pattern, count]) => ({
      pattern,
      count,
      percentage: (count / values.length) * 100
    }));
  
  // Calculate format consistency (how uniform the patterns are)
  const mostCommonCount = sortedPatterns[0]?.count || 0;
  const formatConsistency = mostCommonCount / values.length;
  
  return {
    common_patterns: sortedPatterns,
    format_consistency: formatConsistency
  };
}

/**
 * Generate a pattern signature for a value (e.g., "Aa999" -> "LlNNN")
 */
function generatePatternSignature(value: string): string {
  return value.replace(/[0-9]/g, 'N')
              .replace(/[A-Z]/g, 'L')
              .replace(/[a-z]/g, 'l')
              .replace(/[^NLl]/g, 'S');
}

/**
 * Analyze distribution characteristics for numeric data
 */
function analyzeDistribution(values: number[]): {
  skewness?: number;
  kurtosis?: number;
  is_normal?: boolean;
  distribution_type?: string;
} {
  if (values.length < 3) return {};
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return { distribution_type: 'constant' };
  
  // Calculate skewness
  const skewness = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0) / values.length;
  
  // Calculate kurtosis
  const kurtosis = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0) / values.length - 3;
  
  // Simple normality test (very basic)
  const isNormal = Math.abs(skewness) < 2 && Math.abs(kurtosis) < 7;
  
  // Determine distribution type
  let distributionType = 'unknown';
  if (isNormal) {
    distributionType = 'normal';
  } else if (skewness > 1) {
    distributionType = 'right_skewed';
  } else if (skewness < -1) {
    distributionType = 'left_skewed';
  }
  
  return {
    skewness,
    kurtosis,
    is_normal: isNormal,
    distribution_type: distributionType
  };
}

/**
 * Calculate validity score based on data type consistency
 */
function calculateValidityScore(values: string[], expectedType: string): number {
  if (values.length === 0) return 1;
  
  let validCount = 0;
  
  for (const value of values) {
    switch (expectedType) {
      case 'integer':
        if (Number.isInteger(parseFloat(value)) && isFinite(parseFloat(value))) validCount++;
        break;
      case 'float':
        if (!isNaN(parseFloat(value)) && isFinite(parseFloat(value))) validCount++;
        break;
      case 'date':
        if (!isNaN(Date.parse(value))) validCount++;
        break;
      case 'boolean':
        if (['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'].includes(value.toLowerCase())) validCount++;
        break;
      default:
        validCount++; // Text/categorical always valid
    }
  }
  
  return validCount / values.length;
}

/**
 * Generate recommendations for column improvements
 */
function generateColumnRecommendations(
  columnName: string,
  columnInfo: { detectedType: string },
  completeness: number,
  uniquenessRatio: number,
  outlierPercentage: number,
  formatConsistency: number
): string[] {
  const recommendations: string[] = [];
  
  if (completeness < 0.95) {
    recommendations.push(`Consider handling missing values (${((1-completeness)*100).toFixed(1)}% missing)`);
  }
  
  if (outlierPercentage > 5) {
    recommendations.push(`Review ${outlierPercentage.toFixed(1)}% outlier values for data quality`);
  }
  
  if (formatConsistency < 0.8) {
    recommendations.push('Standardize data format for better consistency');
  }
  
  if (uniquenessRatio < 0.01 && columnInfo.detectedType !== 'categorical') {
    recommendations.push('Very low uniqueness - consider if this column is needed');
  }
  
  if (uniquenessRatio > 0.95 && columnInfo.detectedType === 'categorical') {
    recommendations.push('High cardinality - consider grouping categories');
  }
  
  return recommendations;
}

/**
 * Add quality issues for a column
 */
function addColumnQualityIssues(
  issues: DataQualityIssue[],
  columnName: string,
  completeness: number,
  uniquenessRatio: number,
  outlierPercentage: number,
  formatConsistency: number,
  totalValues: number
): void {
  
  if (completeness < 0.9) {
    issues.push({
      type: 'missing_data',
      severity: completeness < 0.5 ? 'critical' : completeness < 0.8 ? 'high' : 'medium',
      column: columnName,
      message: `${((1-completeness)*100).toFixed(1)}% missing values`,
      count: Math.round((1-completeness) * totalValues),
      percentage: (1-completeness) * 100,
      suggestion: 'Consider imputation, removal, or data collection improvements'
    });
  }
  
  if (outlierPercentage > 10) {
    issues.push({
      type: 'outliers',
      severity: outlierPercentage > 20 ? 'high' : 'medium',
      column: columnName,
      message: `${outlierPercentage.toFixed(1)}% outlier values detected`,
      count: Math.round((outlierPercentage/100) * totalValues),
      percentage: outlierPercentage,
      suggestion: 'Review outliers for data entry errors or consider transformation'
    });
  }
  
  if (formatConsistency < 0.7) {
    issues.push({
      type: 'inconsistent_format',
      severity: formatConsistency < 0.5 ? 'high' : 'medium',
      column: columnName,
      message: 'Inconsistent data formatting detected',
      count: Math.round((1-formatConsistency) * totalValues),
      percentage: (1-formatConsistency) * 100,
      suggestion: 'Standardize data format and validation rules'
    });
  }
}

/**
 * Generate comprehensive statistical summary
 */
function generateStatisticalSummary(
  headers: string[],
  rows: string[][],
  columns: AdvancedColumnProfile[]
): StatisticalSummary {
  
  const totalRows = rows.length;
  const totalColumns = headers.length;
  
  // Count column types
  const columnTypes = columns.reduce((acc, col) => {
    switch (col.dtype) {
      case 'int64':
      case 'float64':
        acc.numeric++;
        break;
      case 'object':
        // Check if it was originally categorical
        if (col.unique_count < col.missing_count * 2) {
          acc.categorical++;
        } else {
          acc.text++;
        }
        break;
      case 'datetime64[ns]':
        acc.datetime++;
        break;
      case 'bool':
        acc.boolean++;
        break;
      default:
        acc.text++;
    }
    return acc;
  }, { numeric: 0, categorical: 0, datetime: 0, boolean: 0, text: 0 });
  
  // Calculate missing data statistics
  const totalMissing = columns.reduce((acc, col) => acc + col.missing_count, 0);
  const missingPercentage = (totalMissing / (totalRows * totalColumns)) * 100;
  const columnsWithMissing = columns.filter(col => col.missing_count > 0).map(col => col.name);
  const missingByColumn = columns.reduce((acc, col) => {
    if (col.missing_count > 0) {
      acc[col.name] = col.missing_count;
    }
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate duplicate rows
  const rowStrings = rows.map(row => row.join('|'));
  const uniqueRows = new Set(rowStrings);
  const duplicateRows = totalRows - uniqueRows.size;
  
  // Calculate complete rows (no missing values)
  const completeRows = rows.filter(row => 
    row.every(cell => cell && cell.trim().length > 0)
  ).length;
  
  // Calculate memory usage (rough estimate)
  const memoryUsageMb = (JSON.stringify(rows).length / 1024 / 1024);
  
  // Outlier summary
  const totalOutliers = columns.reduce((acc, col) => acc + col.outlier_count, 0);
  const columnsWithOutliers = columns.filter(col => col.outlier_count > 0).map(col => col.name);
  const outlierDetails = columns.reduce((acc, col) => {
    if (col.outlier_count > 0) {
      acc[col.name] = { count: col.outlier_count, method: 'IQR', threshold: 1.5 };
    }
    return acc;
  }, {} as Record<string, { count: number; method: string; threshold: number }>);
  
  return {
    dataset_info: {
      total_rows: totalRows,
      total_columns: totalColumns,
      memory_usage_mb: memoryUsageMb,
      duplicate_rows: duplicateRows,
      complete_rows: completeRows
    },
    column_types: columnTypes,
    missing_data: {
      total_missing: totalMissing,
      missing_percentage: missingPercentage,
      columns_with_missing: columnsWithMissing,
      missing_by_column: missingByColumn
    },
    outliers: {
      total_outliers: totalOutliers,
      columns_with_outliers: columnsWithOutliers,
      outlier_details: outlierDetails
    },
    correlations: {
      strong_positive: [],
      strong_negative: [],
      weak_correlations: []
    }
  };
}

/**
 * Generate overall data quality report
 */
function generateQualityReport(
  columns: AdvancedColumnProfile[],
  issues: DataQualityIssue[],
  summary: StatisticalSummary
): DataQualityReport {
  
  // Calculate overall scores
  const completeness = columns.reduce((acc, col) => acc + col.completeness, 0) / columns.length;
  const validity = columns.reduce((acc, col) => acc + col.validity, 0) / columns.length;
  const uniqueness = columns.reduce((acc, col) => acc + col.uniqueness_ratio, 0) / columns.length;
  
  // Format consistency (simplified)
  const consistency = columns.reduce((acc, col) => 
    acc + col.pattern_analysis.format_consistency, 0
  ) / columns.length;
  
  const overallScore = (completeness * 0.3) + (validity * 0.3) + (uniqueness * 0.2) + (consistency * 0.2);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (completeness < 0.9) {
    recommendations.push('Address missing data issues across multiple columns');
  }
  
  if (summary.dataset_info.duplicate_rows > 0) {
    recommendations.push(`Remove ${summary.dataset_info.duplicate_rows} duplicate rows`);
  }
  
  if (summary.outliers.total_outliers > summary.dataset_info.total_rows * 0.05) {
    recommendations.push('Review outlier detection and handling strategy');
  }
  
  if (issues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0) {
    recommendations.push('Prioritize fixing high-severity data quality issues');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Data quality looks good! Consider advanced feature engineering.');
  }
  
  return {
    overall_score: overallScore,
    completeness,
    validity,
    uniqueness,
    consistency,
    issues,
    recommendations
  };
}

/**
 * Generate data warnings
 */
function generateDataWarnings(
  warnings: DataWarning[],
  columns: AdvancedColumnProfile[],
  summary: StatisticalSummary
): void {
  
  if (summary.dataset_info.total_rows < 100) {
    warnings.push({
      type: 'warning',
      message: 'Small dataset detected - results may not be reliable',
      suggestion: 'Consider collecting more data for better model performance'
    });
  }
  
  if (summary.missing_data.missing_percentage > 20) {
    warnings.push({
      type: 'warning',
      message: `High percentage of missing data (${summary.missing_data.missing_percentage.toFixed(1)}%)`,
      suggestion: 'Consider data imputation strategies or additional data collection'
    });
  }
  
  if (summary.dataset_info.duplicate_rows > summary.dataset_info.total_rows * 0.1) {
    warnings.push({
      type: 'warning',
      message: `High number of duplicate rows (${summary.dataset_info.duplicate_rows})`,
      suggestion: 'Remove duplicates to improve data quality'
    });
  }
  
  const lowQualityColumns = columns.filter(col => col.data_quality_score < 0.7);
  if (lowQualityColumns.length > 0) {
    warnings.push({
      type: 'warning',
      message: `${lowQualityColumns.length} columns have low data quality scores`,
      suggestion: 'Review and clean the identified columns before modeling'
    });
  }
}