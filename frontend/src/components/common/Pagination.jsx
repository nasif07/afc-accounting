import React, { useId, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";
import Button from "./Button";
import Select from "./Select";

// Page-number slots rendered at most, ellipses included. 7 keeps the current
// page flanked by a neighbour on both sides without the row outgrowing the
// chevrons on a narrow viewport.
const MAX_VISIBLE_PAGES = 7;

// Every paginated endpoint clamps `limit` at 100 or higher, so this list is
// safe everywhere. Pages with a lower ceiling should pass a shorter list.
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const GAP_START = "gap-start";
const GAP_END = "gap-end";

/**
 * Collapses 1..totalPages into at most MAX_VISIBLE_PAGES slots, always
 * keeping the first page, the last page and current ±1 visible. The two
 * ellipsis slots carry distinct sentinels so they get stable React keys.
 */
const buildPageItems = (currentPage, totalPages) => {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, GAP_END, totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [
      1,
      GAP_START,
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [
    1,
    GAP_START,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    GAP_END,
    totalPages,
  ];
};

/**
 * The one pagination bar used by every paginated list in the app. Renders
 * the same markup whether it's driven by a server total or by Table.jsx's
 * client-side slice — only the numbers differ.
 *
 * Deliberately always renders (nav disabled rather than hidden on a single
 * page) so the page-size control stays discoverable on small result sets.
 */
const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  itemLabel = "records",
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  disabled = false,
  className,
  ...props
}) => {
  const gotoId = useId();
  const [gotoValue, setGotoValue] = useState("");

  const safePageSize = Math.max(1, Number(pageSize) || 1);
  const total = Math.max(0, Number(totalItems) || 0);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const page = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);

  const start = total === 0 ? 0 : (page - 1) * safePageSize + 1;
  const end = Math.min(page * safePageSize, total);

  // A hand-typed `?limit=37` would otherwise leave the select blank.
  const options = pageSizeOptions.includes(safePageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, safePageSize].sort((a, b) => a - b);

  const goTo = (nextPage) => {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    if (clamped !== page) onPageChange?.(clamped);
  };

  const commitGoto = () => {
    const parsed = Number.parseInt(gotoValue, 10);
    setGotoValue("");
    if (!Number.isFinite(parsed)) return; // non-numeric input is ignored
    goTo(parsed);
  };

  const items = buildPageItems(page, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3",
        "sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}>
      {/* Left — page size + range summary */}
      <div className="flex items-center gap-2.5">
        {onPageSizeChange && (
          <div className="w-18 shrink-0">
            <Select
              aria-label="Rows per page"
              value={String(safePageSize)}
              disabled={disabled}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              // Select defaults to min-h-[44px]; pinned to h-8 so the control
              // lines up with the 32px icon-sm chevrons on the right.
              className="h-8 min-h-0 rounded-lg py-0 pl-2.5 pr-7 text-xs">
              {options.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        )}
        <p className="text-xs text-slate-500 sm:text-sm">
          <span className="font-semibold text-slate-800">{start}</span>
          {end > start && (
            <>
              –<span className="font-semibold text-slate-800">{end}</span>
            </>
          )}{" "}
          of <span className="font-semibold text-slate-800">{total}</span>{" "}
          {itemLabel}
        </p>
      </div>

      {/* Right — chevrons, numbered pages, jump-to-page */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={disabled || page <= 1}
          onClick={() => goTo(page - 1)}
          aria-label="Previous page">
          <ChevronLeft size={14} />
        </Button>

        <div className="flex items-center gap-1">
          {items.map((item) =>
            item === GAP_START || item === GAP_END ? (
              <span
                key={item}
                aria-hidden="true"
                className="flex h-8 w-5 items-center justify-center text-xs text-slate-400">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                disabled={disabled}
                onClick={() => goTo(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  "flex h-8 w-8 select-none items-center justify-center rounded-full text-xs font-medium transition",
                  "focus:outline-none focus:ring-4 focus:ring-red-100",
                  item === page
                    ? "bg-red-600 text-white shadow-sm hover:bg-red-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  disabled && "cursor-not-allowed opacity-60",
                )}>
                {item}
              </button>
            ),
          )}
        </div>

        <Button
          variant="outline"
          size="icon-sm"
          disabled={disabled || page >= totalPages}
          onClick={() => goTo(page + 1)}
          aria-label="Next page">
          <ChevronRight size={14} />
        </Button>

        {/* Hidden on the narrowest screens — the numbered buttons already
            cover navigation there, and the row would otherwise overflow. */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <label htmlFor={gotoId} className="text-xs text-slate-500">
            Go to
          </label>
          <input
            id={gotoId}
            type="text"
            inputMode="numeric"
            value={gotoValue}
            disabled={disabled}
            placeholder={String(page)}
            onChange={(e) => setGotoValue(e.target.value.replace(/\D/g, ""))}
            onBlur={commitGoto}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitGoto();
              }
            }}
            aria-label={`Go to page, 1 to ${totalPages}`}
            className="h-8 w-12 rounded-lg border border-slate-300 bg-white text-center text-xs text-slate-900 transition focus:border-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>
      </div>
    </div>
  );
};

export default Pagination;
