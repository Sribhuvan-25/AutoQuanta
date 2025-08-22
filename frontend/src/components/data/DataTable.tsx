'use client';

import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, Search, Filter, Download, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { 
  selectTableView, 
  updateTableView, 
  setTablePage, 
  setTableSort, 
  setTableSearch,
  toggleRowSelection,
  clearRowSelection,
  selectAllRows
} from '@/store/slices/uiSlice';

interface DataTableProps {
  data: string[][];
  maxRows?: number;
  className?: string;
  enableSelection?: boolean;
  onRowSelect?: (selectedRows: string[]) => void;
}

export function DataTable({ 
  data, 
  maxRows = 1000, 
  className, 
  enableSelection = false, 
  onRowSelect 
}: DataTableProps) {
  const dispatch = useAppDispatch();
  const tableView = useAppSelector(selectTableView);
  
  const [hiddenColumns, setHiddenColumns] = useState<Set<number>>(new Set());
  const [columnFilters, setColumnFilters] = useState<Record<number, string>>({});

  const headers = useMemo(() => data?.[0] || [], [data]);
  const allRows = useMemo(() => data?.slice(1) || [], [data]);
  
  // Detect completely empty columns and hide them by default
  const emptyColumns = useMemo(() => {
    if (!data || data.length <= 1) return new Set<number>();
    
    const emptyColIndices = new Set<number>();
    headers.forEach((_, columnIndex) => {
      const columnValues = allRows.map(row => row[columnIndex] || '').filter(val => val.trim().length > 0);
      if (columnValues.length === 0) {
        emptyColIndices.add(columnIndex);
      }
    });
    return emptyColIndices;
  }, [headers, allRows, data]);
  
  // Enhanced data processing with search, filtering, and sorting
  const processedRows = useMemo(() => {
    let filteredRows = [...allRows];
    
    // Apply search filter
    if (tableView.searchQuery) {
      const searchLower = tableView.searchQuery.toLowerCase();
      filteredRows = filteredRows.filter(row =>
        row.some(cell => 
          cell && cell.toString().toLowerCase().includes(searchLower)
        )
      );
    }
    
    // Apply column filters
    Object.entries(columnFilters).forEach(([columnIndex, filterValue]) => {
      if (filterValue) {
        const colIndex = parseInt(columnIndex);
        filteredRows = filteredRows.filter(row => {
          const cellValue = row[colIndex] || '';
          return cellValue.toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });
    
    // Apply sorting
    if (tableView.sortColumn !== null) {
      const columnIndex = headers.findIndex(h => h === tableView.sortColumn);
      if (columnIndex >= 0) {
        filteredRows.sort((a, b) => {
          const aValue = a[columnIndex] || '';
          const bValue = b[columnIndex] || '';

          // Try to sort as numbers first
          const aNum = parseFloat(aValue);
          const bNum = parseFloat(bValue);
          
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return tableView.sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
          }

          // Fall back to string comparison
          const comparison = aValue.localeCompare(bValue);
          return tableView.sortDirection === 'asc' ? comparison : -comparison;
        });
      }
    }
    
    return filteredRows.slice(0, maxRows);
  }, [allRows, tableView.searchQuery, tableView.sortColumn, tableView.sortDirection, columnFilters, headers, maxRows]);

  // Pagination
  const totalPages = Math.ceil(processedRows.length / tableView.pageSize);
  const startIndex = (tableView.currentPage - 1) * tableView.pageSize;
  const endIndex = startIndex + tableView.pageSize;
  const currentRows = processedRows.slice(startIndex, endIndex);

  // Combine hidden columns with empty columns (but allow manual override)
  const effectivelyHiddenColumns = useMemo(() => {
    const combined = new Set(hiddenColumns);
    // Auto-hide empty columns unless user has explicitly made them visible
    emptyColumns.forEach(index => {
      combined.add(index);
    });
    return combined;
  }, [hiddenColumns, emptyColumns]);

  const visibleHeaders = headers.filter((_, index) => !effectivelyHiddenColumns.has(index));
  const visibleColumnIndices = headers.map((_, index) => index).filter(index => !effectivelyHiddenColumns.has(index));

  // Event handlers
  const handleSort = (columnName: string) => {
    const currentDirection = tableView.sortColumn === columnName ? tableView.sortDirection : 'asc';
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    dispatch(setTableSort({ column: columnName, direction: newDirection }));
    dispatch(setTablePage(1));
  };

  const handleSearch = (query: string) => {
    dispatch(setTableSearch(query));
    dispatch(setTablePage(1));
  };

  const handleColumnFilter = (columnIndex: number, filterValue: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnIndex]: filterValue
    }));
    dispatch(setTablePage(1));
  };

  const toggleColumnVisibility = (columnIndex: number) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnIndex)) {
        newSet.delete(columnIndex);
      } else {
        newSet.add(columnIndex);
      }
      return newSet;
    });
  };

  const handleRowSelection = (rowIndex: number) => {
    if (enableSelection) {
      const rowId = `row-${startIndex + rowIndex}`;
      dispatch(toggleRowSelection(rowId));
      if (onRowSelect) {
        const newSelection = tableView.selectedRows.includes(rowId) 
          ? tableView.selectedRows.filter(id => id !== rowId)
          : [...tableView.selectedRows, rowId];
        onRowSelect(newSelection);
      }
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        No data available
      </div>
    );
  }

  const getColumnType = (columnIndex: number) => {
    const values = processedRows.slice(0, 100).map(row => row[columnIndex]).filter(Boolean);
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
    <div className={cn('w-full space-y-4', className)}>
      {/* Table Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search all columns..."
              value={tableView.searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Table Info and Actions */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {processedRows.length} rows • {visibleHeaders.length} visible columns
            {emptyColumns.size > 0 && (
              <span className="text-orange-600 ml-1">
                ({emptyColumns.size} empty hidden)
              </span>
            )}
          </span>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Column Visibility Controls */}
      <div className="flex flex-wrap gap-2">
        {headers.map((header, index) => {
          const isEmpty = emptyColumns.has(index);
          const isHidden = effectivelyHiddenColumns.has(index);
          const isManuallyHidden = hiddenColumns.has(index);
          
          return (
            <button
              key={index}
              onClick={() => toggleColumnVisibility(index)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors",
                isHidden
                  ? isEmpty && !isManuallyHidden
                    ? "bg-orange-100 text-orange-600 border border-orange-200"
                    : "bg-gray-100 text-gray-500"
                  : "bg-blue-100 text-blue-700"
              )}
              title={isEmpty && !isManuallyHidden ? "Empty column (auto-hidden)" : isHidden ? "Column hidden" : "Column visible"}
            >
              {isHidden ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
              <span className="truncate max-w-[120px]">
                {header}
                {isEmpty && <span className="ml-1 text-orange-500">∅</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {enableSelection && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allRowIds = currentRows.map((_, i) => `row-${startIndex + i}`);
                        dispatch(selectAllRows(allRowIds));
                        onRowSelect?.(allRowIds);
                      } else {
                        dispatch(clearRowSelection());
                        onRowSelect?.([]);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {visibleColumnIndices.map((columnIndex) => (
                <th
                  key={columnIndex}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div className="space-y-2">
                    {/* Header with sort */}
                    <div 
                      className="flex items-center gap-x-1 cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort(headers[columnIndex])}
                    >
                      <span>{headers[columnIndex]}</span>
                      {tableView.sortColumn === headers[columnIndex] && (
                        tableView.sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      )}
                    </div>
                    
                    {/* Column type */}
                    <div className="text-xs font-normal text-gray-400">
                      {getColumnType(columnIndex)}
                    </div>
                    
                    {/* Column filter */}
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={columnFilters[columnIndex] || ''}
                      onChange={(e) => handleColumnFilter(columnIndex, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {currentRows.map((row, rowIndex) => {
              const rowId = `row-${startIndex + rowIndex}`;
              const isSelected = tableView.selectedRows.includes(rowId);
              
              return (
                <tr 
                  key={rowIndex} 
                  className={cn(
                    "hover:bg-slate-50 transition-colors cursor-pointer",
                    isSelected && "bg-blue-50"
                  )}
                  onClick={() => handleRowSelection(rowIndex)}
                >
                  {enableSelection && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRowSelection(rowIndex)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  {visibleColumnIndices.map((columnIndex) => {
                    const cellValue = row[columnIndex];
                    const hasValue = cellValue && cellValue.trim().length > 0;
                    
                    return (
                      <td
                        key={columnIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {hasValue ? (
                          cellValue
                        ) : (
                          <span className="text-gray-400 italic text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Showing {startIndex + 1}-{Math.min(endIndex, processedRows.length)} of {processedRows.length} rows
          </span>
          <select
            value={tableView.pageSize}
            onChange={(e) => dispatch(updateTableView({ pageSize: parseInt(e.target.value) }))}
            className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch(setTablePage(Math.max(1, tableView.currentPage - 1)))}
              disabled={tableView.currentPage === 1}
            >
              Previous
            </Button>
            
            <span className="px-3 py-1 text-sm">
              Page {tableView.currentPage} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch(setTablePage(Math.min(totalPages, tableView.currentPage + 1)))}
              disabled={tableView.currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
