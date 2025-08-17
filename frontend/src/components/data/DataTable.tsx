'use client';

import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableProps {
  data: string[][];
  maxRows?: number;
  className?: string;
}

interface SortConfig {
  column: number;
  direction: 'asc' | 'desc';
}

export function DataTable({ data, maxRows = 100, className }: DataTableProps) {
  const [sortConfig, setSortConfig] = React.useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 20;

  const headers = data?.[0] || [];
  
  const rows = React.useMemo(() => {
    return data?.slice(1, maxRows + 1) || [];
  }, [data, maxRows]);

  // Sorting logic
  const sortedRows = React.useMemo(() => {
    if (!rows || rows.length === 0) return [];
    if (!sortConfig) return rows;

    return [...rows].sort((a, b) => {
      const aValue = a[sortConfig.column] || '';
      const bValue = b[sortConfig.column] || '';

      // Try to sort as numbers first
      const aNum = parseFloat(aValue);
      const bNum = parseFloat(bValue);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // Fall back to string comparison
      const comparison = aValue.localeCompare(bValue);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [rows, sortConfig]);

  if (!data || data.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        No data available
      </div>
    );
  }

  // Pagination
  const totalPages = Math.ceil(sortedRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = sortedRows.slice(startIndex, endIndex);

  const handleSort = (columnIndex: number) => {
    setSortConfig(current => {
      if (current?.column === columnIndex) {
        return {
          column: columnIndex,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { column: columnIndex, direction: 'asc' };
    });
    setCurrentPage(1);
  };

  const getColumnType = (columnIndex: number) => {
    const values = rows.map(row => row[columnIndex]).filter(Boolean);
    if (values.length === 0) return 'text';

    // Check if all values are numbers
    const allNumbers = values.every(val => !isNaN(parseFloat(val)));
    if (allNumbers) return 'number';

    // Check if all values are dates
    const allDates = values.every(val => !isNaN(Date.parse(val)));
    if (allDates) return 'date';

    return 'text';
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Table info */}
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
        <span>
          Showing {startIndex + 1}-{Math.min(endIndex, sortedRows.length)} of {sortedRows.length} rows
        </span>
        <span>
          {headers.length} columns
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort(index)}
                >
                  <div className="flex items-center gap-x-1">
                    <span>{header}</span>
                    {sortConfig?.column === index && (
                      sortConfig.direction === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )
                    )}
                  </div>
                  <div className="mt-1 text-xs font-normal text-gray-400">
                    {getColumnType(index)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {cell || (
                      <span className="text-gray-400 italic">empty</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
