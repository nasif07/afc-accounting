import React, {
  Fragment,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, Inbox, Search } from "lucide-react";
import { cn } from "../../utils/cn";
import Button from "./Button";
import { TableSkeleton } from "./Loaders";
import Pagination from "./Pagination";

// The one table in the app. Every list screen renders through this so the
// header weight, row padding, zebra banding, hover tint, empty/loading/error
// states, mobile behaviour and pagination footer can never drift apart again.
//
// ── Column shape ────────────────────────────────────────────────────────────
//   key          unique id, and the property read from the row when there is
//                no `render`
//   label        header text
//   align        "left" (default) | "right" | "center"
//   render       (value, row, index) => node
//   mono         monospace + tabular figures — use for money, codes, dates
//   primary      marks the column used as the card title on mobile
//   hideOnMobile drop from the mobile card (noise, or shown elsewhere)
//   width        e.g. "w-32", applied to the <th>
//   className    extra classes for the body cells
//
// ── Mobile ──────────────────────────────────────────────────────────────────
// Below `mobileBreakpoint` (default lg) the table becomes one card per row:
// the `primary` column is the title, the rest render as label/value pairs,
// and a column with `type: "actions"` moves to the card footer. Pass
// `renderMobileCard` to take over completely, or `mobile="scroll"` to keep a
// horizontally scrolling table instead.

const ALIGN = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

const MOBILE_HIDE = {
  md: "hidden md:block",
  lg: "hidden lg:block",
  xl: "hidden xl:block",
};

const MOBILE_SHOW = {
  md: "md:hidden",
  lg: "lg:hidden",
  xl: "xl:hidden",
};

const cellValue = (column, row, index) => {
  const value = row?.[column.key];
  return column.render ? column.render(value, row, index) : value;
};

const isEmptyNode = (node) =>
  node === null || node === undefined || node === "";

function TableEmpty({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      <Icon className="h-12 w-12 text-slate-300" />
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const Table = React.forwardRef(
  (
    {
      columns = [],
      data = [],
      rowKey,
      loading = false,
      error = null,
      onRetry,
      onRowClick,
      rowClassName,

      // Built-in search box above the table. Off by default — most screens
      // own their search (usually server-side); this is for the few that hold
      // every row in memory.
      searchable = false,
      // Seeds the built-in search box — lets a caller land the table
      // pre-filtered (e.g. arriving from the global search drawer with
      // ?search=<code>). Only an initial value: the box stays uncontrolled
      // afterwards, so remount the Table (via `key`) to re-seed it.
      initialSearch = "",

      paginated = true,
      // Initial page size only — the footer's page-size selector owns it
      // afterwards. Pass `pageSize` + `onPageSizeChange` to control it.
      pageSize = 10,
      // ── Server-driven mode ──────────────────────────────────────────────
      // Passing `totalItems` (and usually `page`/`onPageChange`) opts out of
      // the client-side slice below: the table renders `data` verbatim and
      // the footer reports the server's total. Without these props the table
      // slices whatever array it's handed, which is only correct when the
      // caller has already loaded every row.
      totalItems,
      page,
      onPageChange,
      onPageSizeChange,
      paginationDisabled = false,
      pageSizeOptions,
      itemLabel = "records",

      striped = true,
      dense = false,
      stickyHeader = false,
      minWidth = "min-w-[720px]",
      // A totals row (or any node) pinned under the body — reports need it.
      footer,
      // Mirror of `footer` at the top of the body, for the opening-balance
      // row a ledger has to show before its first transaction.
      leadingRow,
      // (row, index) => ReactNode | null. Renders an extra <tr> under a row in
      // the desktop table. Pair it with `renderCardExtra` so the same detail
      // survives the mobile card layout.
      renderSubRow,
      // (row, index) => ReactNode | null. Appended inside the default mobile
      // card. Ignored when `renderMobileCard` replaces the card wholesale.
      renderCardExtra,
      toolbar,

      mobile = "cards",
      mobileBreakpoint = "lg",
      renderMobileCard,

      emptyIcon,
      emptyMessage = "No records found",
      emptyDescription,
      emptyAction,

      className,
      ...props
    },
    ref,
  ) => {
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [internalPage, setInternalPage] = useState(1);
    const [internalPageSize, setInternalPageSize] = useState(pageSize);

    // A server-driven caller owns page state; otherwise we keep our own.
    const isServerDriven = totalItems !== undefined;
    const currentPage = isServerDriven ? (page ?? 1) : internalPage;
    const effectivePageSize = onPageSizeChange ? pageSize : internalPageSize;

    const setPage = (next) =>
      isServerDriven ? onPageChange?.(next) : setInternalPage(next);

    const changePageSize = (next) => {
      if (onPageSizeChange) {
        onPageSizeChange(next);
        return;
      }
      setInternalPageSize(next);
      setInternalPage(1);
    };

    const filteredData = useMemo(() => {
      if (!searchable || !searchTerm) return data;
      const needle = searchTerm.toLowerCase();
      return data.filter((row) =>
        columns.some((col) =>
          String(row?.[col.key] ?? "")
            .toLowerCase()
            .includes(needle),
        ),
      );
    }, [data, searchTerm, columns, searchable]);

    const rows = useMemo(() => {
      // Server-driven callers already receive exactly one page of rows.
      if (!paginated || isServerDriven) return filteredData;
      const start = (currentPage - 1) * effectivePageSize;
      return filteredData.slice(start, start + effectivePageSize);
    }, [
      filteredData,
      currentPage,
      effectivePageSize,
      paginated,
      isServerDriven,
    ]);

    // ── Sticky footer ───────────────────────────────────────────────────
    // The totals row and the pagination bar stay pinned to the bottom of the
    // viewport while the table is on screen. The table itself sits in an
    // overflow-x-auto scroller, which traps `position: sticky`, so the footer
    // is rendered twice: once collapsed inside the real table (so it still
    // sizes the columns) and once in a fixed-layout copy outside the scroller
    // whose column widths are measured from the header and whose horizontal
    // scroll follows the table's.
    const scrollerRef = useRef(null);
    const tableRef = useRef(null);
    const footerScrollerRef = useRef(null);
    const [footerLayout, setFooterLayout] = useState(null);

    const hasFooter = Boolean(footer);
    useLayoutEffect(() => {
      const table = tableRef.current;
      if (!hasFooter || !table) return undefined;

      const measure = () => {
        const next = {
          tableWidth: table.getBoundingClientRect().width,
          colWidths: Array.from(
            table.querySelectorAll(":scope > thead th"),
            (th) => th.getBoundingClientRect().width,
          ),
        };
        setFooterLayout((prev) =>
          prev &&
          prev.tableWidth === next.tableWidth &&
          prev.colWidths.length === next.colWidths.length &&
          prev.colWidths.every((w, i) => w === next.colWidths[i])
            ? prev
            : next,
        );
        if (footerScrollerRef.current && scrollerRef.current) {
          footerScrollerRef.current.scrollLeft = scrollerRef.current.scrollLeft;
        }
      };

      measure();
      // Absent in jsdom (tests); a one-off measure is enough there.
      if (typeof ResizeObserver === "undefined") return undefined;
      const observer = new ResizeObserver(measure);
      observer.observe(table);
      table
        .querySelectorAll(":scope > thead th")
        .forEach((th) => observer.observe(th));
      return () => observer.disconnect();
    }, [hasFooter, rows, columns.length, loading, error]);

    const syncFooterScroll = (event) => {
      if (footerScrollerRef.current) {
        footerScrollerRef.current.scrollLeft = event.currentTarget.scrollLeft;
      }
    };

    const totalCount = isServerDriven ? totalItems : filteredData.length;
    const keyFor = (row, index) =>
      rowKey ? rowKey(row, index) : (row?._id ?? row?.id ?? index);

    const primaryColumn =
      columns.find((col) => col.primary) ||
      columns.find((col) => col.type !== "actions");
    const actionsColumn = columns.find((col) => col.type === "actions");
    const detailColumns = columns.filter(
      (col) =>
        col !== primaryColumn && col !== actionsColumn && !col.hideOnMobile,
    );

    const searchBox = searchable && (
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
          size={16}
        />
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 transition focus:border-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-100"
        />
      </div>
    );

    // ── Non-row states ──────────────────────────────────────────────────
    // All three render inside the same bordered shell as the table itself,
    // so the page doesn't reflow between loading, empty and loaded.
    const shell = (children) => (
      <div ref={ref} className={cn("space-y-3", className)} {...props}>
        {searchBox}
        {toolbar}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {children}
        </div>
      </div>
    );

    if (loading) {
      return shell(
        <>
          <div className={MOBILE_HIDE[mobileBreakpoint]}>
            <TableSkeleton
              rows={Math.min(effectivePageSize, 8)}
              columns={columns.length}
            />
          </div>
          <div className={MOBILE_SHOW[mobileBreakpoint]}>
            <TableSkeleton rows={5} columns={2} />
          </div>
        </>,
      );
    }

    if (error) {
      return shell(
        <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
          <AlertCircle className="h-12 w-12 text-red-300" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">
            Could not load this list
          </h3>
          <p className="mt-1 max-w-sm text-sm text-red-700">{String(error)}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-4 border-slate-300 text-slate-700 hover:bg-slate-50">
              Try again
            </Button>
          )}
        </div>,
      );
    }

    if (rows.length === 0) {
      return shell(
        <TableEmpty
          icon={emptyIcon}
          title={emptyMessage}
          description={emptyDescription}
          action={emptyAction}
        />,
      );
    }

    const rowTint = (index) =>
      striped && index % 2 === 1 ? "bg-slate-100/70" : "bg-white";

    return (
      <div ref={ref} className={cn("space-y-3", className)} {...props}>
        {searchBox}
        {toolbar}

        {/* overflow-clip rather than overflow-hidden: it still rounds the
            corners but doesn't create a scroll container, which would stop
            the footer below from sticking to the viewport. */}
        <div className="overflow-clip rounded-xl border border-slate-200 bg-white">
          {/* ── Table (desktop, or every width when mobile="scroll") ── */}
          <div
            ref={scrollerRef}
            onScroll={hasFooter ? syncFooterScroll : undefined}
            className={cn(
              "overflow-x-auto",
              mobile === "cards" && MOBILE_HIDE[mobileBreakpoint],
            )}>
            <table
              ref={tableRef}
              className={cn("w-full border-collapse", minWidth)}>
              {/* Darker than the striped rows below so the header still
                  reads as the header. */}
              <thead
                className={cn(
                  "bg-slate-100",
                  stickyHeader && "sticky top-0 z-10",
                )}>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={cn(
                        "whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500",
                        ALIGN[col.align] || ALIGN.left,
                        col.width,
                        col.headerClassName,
                      )}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {leadingRow}
                {rows.map((row, index) => {
                  // Optional extra <tr> rendered directly beneath the row —
                  // the General Ledger uses it to break a compound entry out
                  // into its contra lines. The caller supplies the whole <tr>
                  // (and its colSpan), since only it knows the shape.
                  const subRow = renderSubRow?.(row, index);

                  return (
                    <Fragment key={keyFor(row, index)}>
                      <tr
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        className={cn(
                          "transition-colors",
                          rowTint(index),
                          "hover:bg-blue-50",
                          onRowClick && "cursor-pointer",
                          rowClassName?.(row, index),
                        )}>
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={cn(
                              "px-4 text-sm text-slate-700",
                              dense ? "py-2.5" : "py-3.5",
                              col.wrap ? "" : "whitespace-nowrap",
                              col.mono && "font-mono tabular-nums",
                              ALIGN[col.align] || ALIGN.left,
                              col.className,
                            )}>
                            {cellValue(col, row, index)}
                          </td>
                        ))}
                      </tr>
                      {subRow}
                    </Fragment>
                  );
                })}
              </tbody>

              {/* Collapsed: still contributes to column widths, but the
                  visible copy is the sticky one below. */}
              {footer && (
                <tfoot
                  aria-hidden="true"
                  className="collapse print:visible [&>tr]:collapse print:[&>tr]:visible">
                  {footer}
                </tfoot>
              )}
            </table>
          </div>

          {/* ── Cards (mobile) ── */}
          {mobile === "cards" && (
            <ul className={MOBILE_SHOW[mobileBreakpoint]}>
              {rows.map((row, index) => (
                <li
                  key={keyFor(row, index)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-slate-100 p-4 last:border-b-0",
                    rowTint(index),
                    onRowClick && "cursor-pointer",
                  )}>
                  {renderMobileCard ? (
                    renderMobileCard(row, index)
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 text-sm font-semibold text-slate-900">
                          {primaryColumn &&
                            cellValue(primaryColumn, row, index)}
                        </div>
                        {actionsColumn && (
                          <div className="shrink-0">
                            {cellValue(actionsColumn, row, index)}
                          </div>
                        )}
                      </div>

                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                        {detailColumns.map((col) => {
                          const node = cellValue(col, row, index);
                          if (isEmptyNode(node)) return null;
                          return (
                            <div key={col.key} className="min-w-0">
                              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                {col.label}
                              </dt>
                              <dd
                                className={cn(
                                  "mt-0.5 truncate text-sm text-slate-700",
                                  col.mono && "font-mono tabular-nums",
                                )}>
                                {node}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>

                      {/* Mobile counterpart of renderSubRow — without this a
                          sub-row would simply vanish below the breakpoint. */}
                      {renderCardExtra?.(row, index)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {(hasFooter || paginated) && (
            <div className="sticky bottom-0 z-10 bg-white shadow-[0_-6px_12px_-8px_rgba(15,23,42,0.25)] print:static print:shadow-none">
              {hasFooter && (
                <div
                  ref={footerScrollerRef}
                  // Print (window.print and the cloned print windows) reflows
                  // the table to paper width, which this copy's measured
                  // pixel widths can't follow — print the real tfoot instead.
                  className={cn(
                    "overflow-hidden print:hidden!",
                    mobile === "cards" && MOBILE_HIDE[mobileBreakpoint],
                  )}>
                  <table
                    className="border-collapse"
                    style={{
                      tableLayout: "fixed",
                      width: footerLayout?.tableWidth,
                    }}>
                    {footerLayout && (
                      <colgroup>
                        {footerLayout.colWidths.map((width, index) => (
                          <col key={index} style={{ width }} />
                        ))}
                      </colgroup>
                    )}
                    <tfoot>{footer}</tfoot>
                  </table>
                </div>
              )}

              {paginated && (
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalCount}
                  pageSize={effectivePageSize}
                  onPageChange={setPage}
                  onPageSizeChange={changePageSize}
                  itemLabel={itemLabel}
                  pageSizeOptions={pageSizeOptions}
                  disabled={paginationDisabled}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

Table.displayName = "Table";

export default Table;
