/**
 * CSV parsing and validation utilities for AutoQuanta frontend
 * Handles CSV file processing, validation, and data type detection
 */

import type { DataWarning } from './types';

export interface CSVParseResult {
  data: string[][];
  headers: string[];
  rows: string[][];
  rowCount: number;
  columnCount: number;
  warnings: DataWarning[];
  errors: string[];
}

export interface CSVValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: DataWarning[];
  suggestions: string[];
}

export interface ColumnTypeInfo {
  name: string;
  detectedType: 'numeric' | 'integer' | 'float' | 'boolean' | 'date' | 'categorical' | 'text';
  confidence: number;
  nullCount: number;
  uniqueCount: number;
  sampleValues: string[];
}

/**
 * Parse CSV text content into structured data
 */
export function parseCSV(content: string, delimiter: string = ','): CSVParseResult {
  const warnings: DataWarning[] = [];
  const errors: string[] = [];
  
  if (!content || content.trim().length === 0) {
    errors.push('CSV content is empty');
    return {
      data: [],
      headers: [],
      rows: [],
      rowCount: 0,
      columnCount: 0,
      warnings,
      errors
    };
  }

  try {
    // Split into lines and handle different line endings
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      errors.push('No valid data rows found');
      return {
        data: [],
        headers: [],
        rows: [],
        rowCount: 0,
        columnCount: 0,
        warnings,
        errors
      };
    }

    // Parse CSV rows using a simple parser
    const parsedLines = lines.map(line => parseCSVLine(line, delimiter));
    
    // Validate consistent column count
    const columnCounts = parsedLines.map(row => row.length);
    const expectedColumns = columnCounts[0];
    const inconsistentRows = columnCounts.filter(count => count !== expectedColumns);
    
    if (inconsistentRows.length > 0) {
      warnings.push({
        type: 'warning',
        message: `${inconsistentRows.length} rows have inconsistent column counts. Expected ${expectedColumns} columns.`,
        suggestion: 'Check for missing delimiters or extra commas in your data'
      });
    }

    // Extract headers and data rows
    const headers = parsedLines[0] || [];
    const rows = parsedLines.slice(1);

    // Validate headers
    if (headers.length === 0) {
      errors.push('No column headers found');
    } else {
      // Check for duplicate headers
      const headerSet = new Set(headers);
      if (headerSet.size !== headers.length) {
        warnings.push({
          type: 'warning',
          message: 'Duplicate column headers detected',
          suggestion: 'Ensure all column headers are unique'
        });
      }

      // Check for empty headers
      const emptyHeaders = headers.filter((h) => !h || h.trim().length === 0);
      if (emptyHeaders.length > 0) {
        warnings.push({
          type: 'warning',
          message: `${emptyHeaders.length} empty column headers found`,
          suggestion: 'Consider providing meaningful names for all columns'
        });
      }
    }

    return {
      data: parsedLines,
      headers,
      rows,
      rowCount: rows.length,
      columnCount: headers.length,
      warnings,
      errors
    };

  } catch (error) {
    errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      data: [],
      headers: [],
      rows: [],
      rowCount: 0,
      columnCount: 0,
      warnings,
      errors
    };
  }
}

/**
 * Parse a single CSV line, handling quoted values and escaped quotes
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i += 2;
      } else {
        // Start or end of quoted field
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field separator outside quotes
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

/**
 * Detect the most likely delimiter for a CSV file
 */
export function detectDelimiter(content: string): string {
  const delimiters = [',', '\t', ';', '|'];
  const sampleLines = content.split(/\r?\n/).slice(0, 5);
  
  let bestDelimiter = ',';
  let bestScore = 0;
  
  for (const delimiter of delimiters) {
    let score = 0;
    let consistency = 0;
    
    const lineCounts = sampleLines.map(line => {
      // Count delimiter occurrences outside quotes
      let count = 0;
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          inQuotes = !inQuotes;
        } else if (line[i] === delimiter && !inQuotes) {
          count++;
        }
      }
      return count;
    }).filter(count => count > 0);
    
    if (lineCounts.length > 0) {
      // Check consistency (all lines should have same number of delimiters)
      const avgCount = lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length;
      consistency = lineCounts.filter(count => count === lineCounts[0]).length / lineCounts.length;
      score = avgCount * consistency;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }
  
  return bestDelimiter;
}

/**
 * Analyze column types from parsed CSV data
 */
export function analyzeColumnTypes(headers: string[], rows: string[][]): ColumnTypeInfo[] {
  return headers.map((header, columnIndex) => {
    const values = rows.map(row => row[columnIndex] || '').filter(val => val.trim().length > 0);
    const nullCount = rows.length - values.length;
    const uniqueValues = [...new Set(values)];
    
    return {
      name: header,
      detectedType: detectColumnType(values),
      confidence: calculateTypeConfidence(values),
      nullCount,
      uniqueCount: uniqueValues.length,
      sampleValues: uniqueValues.slice(0, 5)
    };
  });
}

/**
 * Detect the most likely data type for a column
 */
function detectColumnType(values: string[]): ColumnTypeInfo['detectedType'] {
  if (values.length === 0) return 'text';
  
  // Check for boolean
  const booleanValues = ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'];
  const booleanMatches = values.filter(val => 
    booleanValues.includes(val.toLowerCase())
  ).length;
  
  if (booleanMatches / values.length > 0.8) {
    return 'boolean';
  }
  
  // Check for numeric types
  const numericValues = values.filter(val => !isNaN(parseFloat(val)) && isFinite(parseFloat(val)));
  const numericRatio = numericValues.length / values.length;
  
  if (numericRatio > 0.8) {
    // Check if integers
    const integerValues = numericValues.filter(val => Number.isInteger(parseFloat(val)));
    const integerRatio = integerValues.length / numericValues.length;
    
    if (integerRatio > 0.9) {
      return 'integer';
    } else {
      return 'float';
    }
  }
  
  // Check for dates
  const dateValues = values.filter(val => !isNaN(Date.parse(val)));
  const dateRatio = dateValues.length / values.length;
  
  if (dateRatio > 0.8) {
    return 'date';
  }
  
  // Check if categorical (low cardinality)
  const uniqueValues = new Set(values);
  const uniqueRatio = uniqueValues.size / values.length;
  
  if (uniqueRatio < 0.1 && uniqueValues.size < 50) {
    return 'categorical';
  }
  
  return 'text';
}

/**
 * Calculate confidence score for type detection
 */
function calculateTypeConfidence(values: string[]): number {
  if (values.length === 0) return 0;
  
  const detectedType = detectColumnType(values);
  let matches = 0;
  
  switch (detectedType) {
    case 'boolean':
      const booleanValues = ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'];
      matches = values.filter(val => booleanValues.includes(val.toLowerCase())).length;
      break;
    case 'integer':
      matches = values.filter(val => Number.isInteger(parseFloat(val)) && isFinite(parseFloat(val))).length;
      break;
    case 'float':
      matches = values.filter(val => !isNaN(parseFloat(val)) && isFinite(parseFloat(val))).length;
      break;
    case 'date':
      matches = values.filter(val => !isNaN(Date.parse(val))).length;
      break;
    case 'categorical':
      // For categorical, confidence is based on how concentrated the values are
      const uniqueValues = new Set(values);
      return Math.max(0, 1 - (uniqueValues.size / values.length));
    default:
      matches = values.length; // Text always matches
  }
  
  return matches / values.length;
}

/**
 * Validate CSV data and provide suggestions
 */
export function validateCSVData(parseResult: CSVParseResult): CSVValidationResult {
  const errors: string[] = [...parseResult.errors];
  const warnings: DataWarning[] = [...parseResult.warnings];
  const suggestions: string[] = [];
  
  // Check minimum requirements
  if (parseResult.rowCount < 1) {
    errors.push('CSV must contain at least one data row');
  }
  
  if (parseResult.columnCount < 1) {
    errors.push('CSV must contain at least one column');
  }
  
  // Analyze data quality
  if (parseResult.rowCount < 10) {
    warnings.push({
      type: 'warning',
      message: 'Dataset is very small (less than 10 rows)',
      suggestion: 'Consider collecting more data for better model performance'
    });
  }
  
  if (parseResult.columnCount < 2) {
    warnings.push({
      type: 'warning', 
      message: 'Dataset has only one column',
      suggestion: 'You need at least two columns (features and target) for machine learning'
    });
  }
  
  // Check for empty rows
  const emptyRows = parseResult.rows.filter(row => row.every(cell => !cell || cell.trim().length === 0));
  if (emptyRows.length > 0) {
    warnings.push({
      type: 'warning',
      message: `Found ${emptyRows.length} empty rows`,
      suggestion: 'Consider removing empty rows from your dataset'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Generate statistics for a column
 */
export function generateColumnStats(values: string[], columnType: ColumnTypeInfo['detectedType']): Record<string, unknown> {
  const nonEmptyValues = values.filter(val => val && val.trim().length > 0);
  
  if (nonEmptyValues.length === 0) {
    return { count: 0 };
  }
  
  const stats: Record<string, unknown> = {
    count: nonEmptyValues.length,
    unique_count: new Set(nonEmptyValues).size
  };
  
  if (columnType === 'integer' || columnType === 'float') {
    const numericValues = nonEmptyValues.map(val => parseFloat(val)).filter(val => !isNaN(val));
    
    if (numericValues.length > 0) {
      stats.min = Math.min(...numericValues);
      stats.max = Math.max(...numericValues);
      stats.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      
      const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - (stats.mean as number), 2), 0) / numericValues.length;
      stats.std = Math.sqrt(variance);
      
      // Quartiles
      const sorted = [...numericValues].sort((a, b) => a - b);
      stats.q25 = getPercentile(sorted, 0.25);
      stats.median = getPercentile(sorted, 0.5);
      stats.q75 = getPercentile(sorted, 0.75);
    }
  } else if (columnType === 'categorical' || columnType === 'text') {
    const valueCounts = nonEmptyValues.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const sortedEntries = Object.entries(valueCounts).sort(([,a], [,b]) => b - a);
    stats.top_categories = sortedEntries.slice(0, 10).map(([value, count]) => ({ value, count }));
    stats.most_frequent = sortedEntries[0]?.[0];
    stats.most_frequent_count = sortedEntries[0]?.[1];
  }
  
  return stats;
}

/**
 * Calculate percentile for sorted numeric array
 */
function getPercentile(sortedArray: number[], percentile: number): number {
  const index = percentile * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  
  if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
  if (lower < 0) return sortedArray[0];
  
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}