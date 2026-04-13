import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import { TableSkeleton } from './Skeleton';
import Input from './Input';
import Button from './Button';

const Table = React.forwardRef(
  (
    {
      columns,
      data = [],
      loading = false,
      error = null,
      onRowClick,
      searchable = true,
      paginated = true,
      pageSize = 10,
      className,
      emptyMessage = 'No data available',
      ...props
    },
    ref
  ) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Filter data based on search term
    const filteredData = useMemo(() => {
      if (!searchable || !searchTerm) return data;

      return data.filter((row) =>
        columns.some((col) => {
          const value = row[col.key];
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }, [data, searchTerm, columns, searchable]);

    // Paginate data
    const paginatedData = useMemo(() => {
      if (!paginated) return filteredData;

      const startIndex = (currentPage - 1) * pageSize;
      return filteredData.slice(startIndex, startIndex + pageSize);
    }, [filteredData, currentPage, pageSize, paginated]);

    const totalPages = Math.ceil(filteredData.length / pageSize);

    if (loading) {
      return <TableSkeleton rows={pageSize} columns={columns.length} />;
    }

    if (error) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-800">Error loading data: {error}</p>
        </div>
      );
    }

    if (filteredData.length === 0) {
      return (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
          <p className="text-neutral-600">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('space-y-4', className)} {...props}>
        {/* Search Bar */}
        {searchable && (
          <div className="relative">
            <Search className="absolute left-3 top-3 text-neutral-400" size={18} />
            <Input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
        )}

        {/* Table - Mobile Responsive with Horizontal Scroll */}
        <div className="w-full overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-max md:min-w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-neutral-900 whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    'border-b border-neutral-200 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-neutral-50'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-neutral-700 whitespace-nowrap"
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination - Mobile Responsive */}
        {paginated && totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs md:text-sm text-neutral-600 text-center md:text-left">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredData.length)} of{' '}
              {filteredData.length}
            </p>
            <div className="flex items-center gap-1 md:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={14} className="md:w-4 md:h-4" />
              </Button>
              <span className="text-xs md:text-sm text-neutral-600 whitespace-nowrap">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={14} className="md:w-4 md:h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

Table.displayName = 'Table';

export default Table;
