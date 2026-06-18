import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Eye,
  Edit2,
  Trash2,
  Power,
  RotateCcw,
  Circle,
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";

const typeStyles = {
  asset: "bg-blue-50 text-blue-700 border-blue-100",
  liability: "bg-orange-50 text-orange-700 border-orange-100",
  equity: "bg-violet-50 text-violet-700 border-violet-100",
  income: "bg-emerald-50 text-emerald-700 border-emerald-100",
  expense: "bg-rose-50 text-rose-700 border-rose-100",
};

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-100",
  inactive: "bg-amber-50 text-amber-700 border-amber-100",
  archived: "bg-slate-100 text-slate-600 border-slate-200",
};

const COATreeNode = ({
  node,
  level = 0,
  onEdit,
  onDelete,
  onRestore,
  onView,
  onToggleStatus,
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 1);

  if (!node) return null;

  const children = Array.isArray(node.children)
    ? node.children.filter(Boolean)
    : [];
  const hasChildren = children.length > 0;
  const isArchived = node.status === "archived";

  const type = String(node.accountType || "").toLowerCase();
  const status = String(node.status || "").toLowerCase();

  const balance = Number(node.balance ?? node.currentBalance ?? 0);
  const balanceType = String(
    node.balanceType || node.currentBalanceType || "debit",
  ).toLowerCase();

  return (
    <div className="w-full">
      <div
        className={`flex min-w-0 items-center justify-between border-b border-slate-200 transition ${
          isArchived
            ? "bg-slate-50 opacity-70"
            : "bg-white hover:bg-slate-100/50"
        }`}>
        <div
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 md:gap-3"
          style={{ paddingLeft: `calc(12px + ${level * 16}px)` }}>
          <div className="flex w-6 shrink-0 items-center justify-center">
            {hasChildren ? (
              <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="rounded p-1 transition-colors hover:bg-slate-200">
                {isExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
            ) : (
              <Circle size={6} className="text-slate-300" fill="currentColor" />
            )}
          </div>

          <div className="min-w-0 flex-1 md:flex md:items-center md:gap-4 md:py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
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
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1.5 md:pt-0">
              <span
                className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider md:text-[10px] ${
                  typeStyles[type] ||
                  "border-slate-200 bg-slate-50 text-slate-600"
                }`}>
                {type}
              </span>

              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                <div
                  className={`h-1.5 w-1.5 rounded-full bg-current ${statusStyles[status]}`}
                />
                <span
                  className={`text-[9px] font-bold capitalize md:text-[10px] ${
                    statusStyles[status]?.split(" ")[1] || "text-slate-600"
                  }`}>
                  {status}
                </span>
              </div>

              {!hasChildren && (
                <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600 md:text-[10px]">
                  <span>Leaf</span>
                </div>
              )}

              {!hasChildren && (
                <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-700 md:text-[12px]">
                  <span>
                    Balance:{" "}
                    <span className="font-bold">
                      {formatCurrency(balance)}{" "}
                    </span>
                    <span className="text-slate-400">({balanceType})</span>
                  </span>
                </div>
              )}

              {hasChildren && (
                <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-500 md:text-[10px]">
                  <span className="text-slate-400">/</span>
                  <span>
                    {children.length} {children.length === 1 ? "Sub" : "Subs"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 px-3 py-2 md:gap-2">
          <button
            onClick={() => onView?.(node)}
            className="flex h-8 w-8 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-400 hover:text-slate-700 md:h-auto md:w-auto md:px-2.5 md:py-1.5">
            <Eye size={15} />
            <span className="hidden text-[10px] font-bold uppercase tracking-wider xl:inline">
              View
            </span>
          </button>

          {!isArchived ? (
            <>
              <button
                onClick={() => onEdit?.(node)}
                className="flex h-8 w-8 items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50/30 text-slate-500 transition-all hover:border-blue-400 hover:text-blue-600 md:h-auto md:w-auto md:px-2.5 md:py-1.5">
                <Edit2 size={14} />
                <span className="hidden text-[10px] font-bold uppercase tracking-wider lg:inline">
                  Edit
                </span>
              </button>

              <button
                onClick={() =>
                  onToggleStatus?.(
                    node._id,
                    status === "active" ? "inactive" : "active",
                  )
                }
                className={`flex h-8 w-8 items-center justify-center gap-2 rounded-lg border transition-all md:h-auto md:w-auto md:px-2.5 md:py-1.5 ${
                  status === "active"
                    ? "border-amber-100 bg-amber-50/30 text-slate-500 hover:border-amber-400 hover:text-amber-600"
                    : "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:border-emerald-500"
                }`}>
                <Power size={14} />
                <span className="hidden text-[10px] font-bold uppercase tracking-wider lg:inline">
                  {status === "active" ? "Deactivate" : "Activate"}
                </span>
              </button>

              {!hasChildren && (
                <button
                  onClick={() => onDelete?.(node._id)}
                  className="flex h-8 w-8 items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50/30 text-slate-400 transition-all hover:border-red-400 hover:text-red-600 md:h-auto md:w-auto md:px-2.5 md:py-1.5">
                  <Trash2 size={14} />
                  <span className="hidden text-[10px] font-bold uppercase tracking-wider xl:inline">
                    Archive
                  </span>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => onRestore?.(node._id)}
              className="flex h-8 w-8 items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50/30 text-violet-600 transition-all hover:border-violet-400 md:h-auto md:w-auto md:px-2.5 md:py-1.5">
              <RotateCcw size={14} />
              <span className="hidden text-[10px] font-bold uppercase tracking-wider lg:inline">
                Restore
              </span>
            </button>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="w-full">
          {children.map((child) => (
            <COATreeNode
              key={child._id}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onRestore={onRestore}
              onView={onView}
              onToggleStatus={onToggleStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default COATreeNode;
