import React from "react";
import {
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  Power,
  RotateCcw,
  Circle,
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";

// Small colored dot per account type — keyed to the same categorical
// colors as the legend at the bottom of COATreeView (asset/liability/
// equity/income/expense), replacing the old full type badge on every row.
const typeDotColors = {
  asset: "bg-blue-600",
  liability: "bg-orange-600",
  equity: "bg-violet-600",
  income: "bg-emerald-600",
  expense: "bg-rose-600",
};

// Only rendered when status !== "active" — active is the default state
// and doesn't need announcing on every row (matches the Status Guide legend).
const statusBadgeStyles = {
  inactive: "border-amber-200 bg-amber-50 text-amber-700",
  archived: "border-slate-200 bg-slate-100 text-slate-500",
};

function RowIconButton({ title, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 ${className}`}>
      {children}
    </button>
  );
}

// Renders a single <tr> — the tree is flattened (respecting expand/collapse
// state) and recursed by COATreeView, which owns expandedIds so it can build
// a flat row list for a real <table>/<tbody>.
const COATreeNode = ({
  node,
  level = 0,
  hasChildren = false,
  childCount = 0,
  isExpanded = false,
  onToggleExpand,
  onEdit,
  onDelete,
  onRestore,
  onView,
  onToggleStatus,
}) => {
  if (!node) return null;

  const isArchived = node.status === "archived";
  const type = String(node.accountType || "").toLowerCase();
  const status = String(node.status || "").toLowerCase();

  const balance = Number(node.balance ?? node.currentBalance ?? 0);
  const balanceType = String(
    node.balanceType || node.currentBalanceType || "debit",
  ).toLowerCase();

  return (
    <tr
      onClick={() => onView?.(node)}
      className={`cursor-pointer border-b border-slate-100 transition-colors ${
        isArchived ? "bg-slate-50/70 opacity-70" : "bg-white hover:bg-slate-50"
      }`}>
      <td className="p-0">
        <div className="flex items-stretch">
          {Array.from({ length: level }).map((_, i) => (
            <span
              key={i}
              className="w-6 shrink-0 border-r border-slate-200"
              aria-hidden="true"
            />
          ))}

          <div className="flex min-w-0 flex-1 items-center gap-2 py-2.5 pl-3 pr-2">
            <div className="flex w-5 shrink-0 items-center justify-center">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand?.();
                  }}
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900">
                  {isExpanded ? (
                    <ChevronDown size={15} />
                  ) : (
                    <ChevronRight size={15} />
                  )}
                </button>
              ) : (
                <Circle size={5} className="text-slate-300" fill="currentColor" />
              )}
            </div>

            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${typeDotColors[type] || "bg-slate-400"}`}
              title={type}
              aria-hidden="true"
            />

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="shrink-0 font-mono text-[11px] text-slate-400">
                {node.accountCode}
              </span>
              <span
                className={`truncate text-sm tracking-tight ${
                  hasChildren
                    ? "font-bold text-slate-900"
                    : "font-medium text-slate-700"
                }`}>
                {node.accountName}
              </span>

              {status !== "active" && (
                <span
                  className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    statusBadgeStyles[status] ||
                    "border-slate-200 bg-slate-100 text-slate-500"
                  }`}>
                  {status}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-3 py-2.5 text-right align-middle">
        {hasChildren ? (
          <span className="text-[11px] font-semibold text-slate-400">
            {childCount} {childCount === 1 ? "sub" : "subs"}
          </span>
        ) : (
          <>
            <div className="truncate font-mono text-sm font-semibold text-slate-900">
              {formatCurrency(balance)}
            </div>
            <div className="text-[10px] font-medium text-slate-400">
              ({balanceType})
            </div>
          </>
        )}
      </td>

      <td className="px-3 py-2.5 align-middle">
        <div className="flex items-center justify-end gap-0.5">
          {!isArchived && (
            <RowIconButton
              title="Edit account"
              onClick={() => onEdit?.(node)}
              className="hover:bg-brand-navy-light hover:text-brand-navy">
              <Edit2 size={14} />
            </RowIconButton>
          )}

          {!isArchived && (
            <>
              <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden="true" />

              <RowIconButton
                title={status === "active" ? "Deactivate account" : "Activate account"}
                onClick={() =>
                  onToggleStatus?.(
                    node._id,
                    status === "active" ? "inactive" : "active",
                  )
                }
                className={
                  status === "active"
                    ? "hover:bg-amber-50 hover:text-amber-600"
                    : "hover:bg-emerald-50 hover:text-emerald-600"
                }>
                <Power size={14} />
              </RowIconButton>

              {!hasChildren && (
                <RowIconButton
                  title="Archive account"
                  onClick={() => onDelete?.(node._id)}
                  className="hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={14} />
                </RowIconButton>
              )}
            </>
          )}

          {isArchived && (
            <RowIconButton
              title="Restore account"
              onClick={() => onRestore?.(node._id)}
              className="hover:bg-violet-50 hover:text-violet-600">
              <RotateCcw size={14} />
            </RowIconButton>
          )}
        </div>
      </td>
    </tr>
  );
};

export default COATreeNode;
