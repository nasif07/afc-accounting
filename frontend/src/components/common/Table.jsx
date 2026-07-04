import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "../../utils/cn";
import { TableSkeleton } from "./Loaders";
import Button from "./Button";

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
      emptyMessage = "No data available",
      ...props
    },
    ref,
  ) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const filteredData = useMemo(() => {
      if (!searchable || !searchTerm) return data;
      return data.filter((row) =>
        columns.some((col) => {
          const value = row[col.key];
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        }),
      );
    }, [data, searchTerm, columns, searchable]);

    const paginatedData = useMemo(() => {
      if (!paginated) return filteredData;
      const start = (currentPage - 1) * pageSize;
      return filteredData.slice(start, start + pageSize);
    }, [filteredData, currentPage, pageSize, paginated]);

    const totalPages = Math.ceil(filteredData.length / pageSize);

    if (loading) return <TableSkeleton rows={pageSize} columns={columns.length} />;

    if (error) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-800">Error loading data: {error}</p>
        </div>
      );
    }

    if (filteredData.length === 0) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-600">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        {searchable && (
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-100"
            />
          </div>
        )}

        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-max md:min-w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold text-slate-900 md:px-6 md:py-4 md:text-sm">
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
                    "border-b border-slate-200 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-slate-50",
                  )}
                  onClick={() => onRowClick?.(row)}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-3 py-3 text-xs text-slate-700 md:px-6 md:py-4 md:text-sm">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paginated && totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-center text-xs text-slate-600 md:text-left md:text-sm">
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}
            </p>
            <div className="flex items-center gap-1 md:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}>
                <ChevronLeft size={14} />
              </Button>
              <span className="whitespace-nowrap text-xs text-slate-600 md:text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

Table.displayName = "Table";

export default Table;
