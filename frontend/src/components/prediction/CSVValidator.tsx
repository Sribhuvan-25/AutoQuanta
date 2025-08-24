'use client';

import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface CSVValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: {
    rows: number;
    columns: number;
    columnNames: string[];
    missingColumns: string[];
    extraColumns: string[];
    sampleData: string[][];
  };
}

interface CSVValidatorProps {
  csvData: string;
  expectedFeatures: string[];
  onValidation: (result: CSVValidationResult) => void;
}

export function CSVValidator({ csvData, expectedFeatures, onValidation }: CSVValidatorProps) {
  React.useEffect(() => {
    if (!csvData || expectedFeatures.length === 0) return;
    
    const validateCSV = () => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      try {
        // Parse CSV data
        const lines = csvData.trim().split('\n');
        
        if (lines.length < 2) {
          errors.push('CSV file must have at least a header row and one data row');
          return {
            isValid: false,
            errors,
            warnings,
            info: {
              rows: lines.length,
              columns: 0,
              columnNames: [],
              missingColumns: expectedFeatures,
              extraColumns: [],
              sampleData: []
            }
          };
        }
        
        // Parse header
        const header = lines[0].split(',').map(col => col.trim().replace(/"/g, ''));
        const dataRows = lines.slice(1).map(line => 
          line.split(',').map(cell => cell.trim().replace(/"/g, ''))
        );
        
        // Basic validation
        const rows = dataRows.length;
        const columns = header.length;
        
        if (columns === 0) {
          errors.push('No columns found in CSV file');
        }
        
        if (rows === 0) {
          errors.push('No data rows found in CSV file');
        }
        
        // Feature matching validation
        const missingColumns = expectedFeatures.filter(feature => !header.includes(feature));
        const extraColumns = header.filter(col => !expectedFeatures.includes(col));
        
        if (missingColumns.length > 0) {
          if (missingColumns.length === expectedFeatures.length) {
            errors.push(`None of the expected columns found. Expected: ${expectedFeatures.join(', ')}`);
          } else {
            warnings.push(`Missing expected columns: ${missingColumns.join(', ')}`);
          }
        }
        
        if (extraColumns.length > 0) {
          warnings.push(`Extra columns found (will be ignored): ${extraColumns.join(', ')}`);
        }
        
        // Data quality checks
        const inconsistentRows = dataRows.filter(row => row.length !== columns);
        if (inconsistentRows.length > 0) {
          errors.push(`${inconsistentRows.length} rows have inconsistent column count`);
        }
        
        // Check for numeric data in expected columns
        const availableExpectedColumns = expectedFeatures.filter(feature => header.includes(feature));
        if (availableExpectedColumns.length > 0 && rows > 0) {
          for (const column of availableExpectedColumns) {
            const columnIndex = header.indexOf(column);
            const columnValues = dataRows.map(row => row[columnIndex]).filter(val => val && val.trim());
            const numericValues = columnValues.map(v => parseFloat(v)).filter(v => !isNaN(v));
            
            if (numericValues.length < columnValues.length * 0.8) {
              warnings.push(`Column '${column}' appears to have non-numeric values (${numericValues.length}/${columnValues.length} are numeric)`);
            }
          }
        }
        
        // Sample data for preview
        const sampleData = [header, ...dataRows.slice(0, 3)];
        
        const result: CSVValidationResult = {
          isValid: errors.length === 0,
          errors,
          warnings,
          info: {
            rows,
            columns,
            columnNames: header,
            missingColumns,
            extraColumns,
            sampleData
          }
        };
        
        onValidation(result);
        return result;
        
      } catch (error) {
        const result: CSVValidationResult = {
          isValid: false,
          errors: [`Failed to parse CSV: ${error}`],
          warnings,
          info: {
            rows: 0,
            columns: 0,
            columnNames: [],
            missingColumns: expectedFeatures,
            extraColumns: [],
            sampleData: []
          }
        };
        
        onValidation(result);
        return result;
      }
    };
    
    const result = validateCSV();
  }, [csvData, expectedFeatures, onValidation]);
  
  return null; // This component only handles validation logic
}

interface CSVValidationDisplayProps {
  validation: CSVValidationResult | null;
  onDismiss?: () => void;
}

export function CSVValidationDisplay({ validation, onDismiss }: CSVValidationDisplayProps) {
  if (!validation) return null;
  
  return (
    <div className="space-y-4">
      {/* Validation Status */}
      <div className={`p-4 rounded-lg border ${
        validation.isValid 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            {validation.isValid ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div>
              <h3 className={`font-medium ${
                validation.isValid ? 'text-green-800' : 'text-red-800'
              }`}>
                {validation.isValid ? 'CSV Validation Passed' : 'CSV Validation Failed'}
              </h3>
              <p className={`text-sm mt-1 ${
                validation.isValid ? 'text-green-700' : 'text-red-700'
              }`}>
                {validation.info.rows} rows, {validation.info.columns} columns
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`p-1 rounded-full hover:bg-gray-100 ${
                validation.isValid ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Errors */}
      {validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Errors</h4>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Warnings</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Data Preview */}
      {validation.info.sampleData.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-gray-600" />
            <h4 className="font-medium text-gray-800">Data Preview</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {validation.info.sampleData[0]?.map((header, index) => (
                    <th key={index} className="text-left p-2 font-medium text-gray-700">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {validation.info.sampleData.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-100">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="p-2 text-gray-600">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {validation.info.rows > 3 && (
            <p className="text-xs text-gray-500 mt-2">
              ... and {validation.info.rows - 3} more rows
            </p>
          )}
        </div>
      )}
    </div>
  );
}