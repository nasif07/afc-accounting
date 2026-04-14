import React, { useState } from "react";
import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Eye,
  Edit2,
  Trash2,
  Power,
  RotateCcw,
  Circle,
  Loader2,
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

  const children = node.children || [];
  const hasChildren = children.length > 0;
  const isArchived = node.status === "archived";

  const type = String(node.accountType || "").toLowerCase();
  const status = String(node.status || "").toLowerCase();

  return (
    <div className="w-full">
      {/* Row Container */}
      <div
        className={`flex items-center justify-between border-b border-slate-200 transition min-w-0 ${
          isArchived
            ? "bg-slate-50 opacity-70"
            : "bg-white hover:bg-slate-100/50"
        }`}>
        <div
          className="flex flex-1 items-center gap-2 md:gap-3 py-2.5 px-3 min-w-0"
          style={{ paddingLeft: `calc(12px + ${level * 16}px)` }}>
          {/* Expand / Leaf Icon */}
          <div className="flex shrink-0 items-center justify-center w-6">
            {hasChildren ? (
              <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1 rounded hover:bg-slate-200 transition-colors">
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

          {/* Account Information */}
          <div className="flex-1 md:flex md:items-center md:gap-4 min-w-0 md:py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 rounded border border-slate-200">
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

            {/* Badges */}
            <div className="flex items-center gap-2 pt-1.5 md:pt-0 flex-wrap">
              <span
                className={`border px-1.5 py-0.5 text-[9px] md:text-[10px] font-bold uppercase rounded tracking-wider ${typeStyles[type] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                {type}
              </span>

              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                <div
                  className={`h-1.5 w-1.5 rounded-full bg-current ${statusStyles[status]}`}
                />
                <span
                  className={`text-[9px] md:text-[10px] font-bold capitalize ${statusStyles[status].split(" ")[1]}`}>
                  {status}
                </span>
              </div>

              {!hasChildren && (
                <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] md:text-[10px] font-bold text-emerald-600 border border-emerald-200">
                  <span>Leaf</span>
                </div>
              )}
              {!hasChildren && node.balance !== undefined && (
                <div className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[9px] md:text-[10px] font-bold text-slate-700 border border-slate-200">
                  <span>Balance: {formatCurrency(node.balance)}</span>
                </div>
              )}
              {hasChildren && (
                <div className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[9px] md:text-[10px] font-bold text-slate-500 border border-slate-200">
                  <span className="text-slate-400">/</span>
                  <span>
                    {children.length} {children.length === 1 ? "Sub" : "Subs"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ACTIONS - Strictly Flat UI */}
        <div className="flex items-center gap-1 md:gap-2 px-3 py-2 shrink-0">
          <button
            onClick={() => onView?.(node)}
            className="flex h-8 w-8 md:h-auto md:w-auto items-center justify-center gap-2 md:px-2.5 md:py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-all">
            <Eye size={15} />
            <span className="hidden xl:inline text-[10px] font-bold uppercase tracking-wider">
              View
            </span>
          </button>

          {!isArchived ? (
            <>
              <button
                onClick={() => onEdit?.(node)}
                className="flex h-8 w-8 md:h-auto md:w-auto items-center justify-center gap-2 md:px-2.5 md:py-1.5 rounded-lg border border-blue-100 bg-blue-50/30 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-all">
                <Edit2 size={14} />
                <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider">
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
                className={`flex h-8 w-8 md:h-auto md:w-auto items-center justify-center gap-2 md:px-2.5 md:py-1.5 rounded-lg border transition-all ${
                  status === "active"
                    ? "border-amber-100 bg-amber-50/30 text-slate-500 hover:border-amber-400 hover:text-amber-600"
                    : "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:border-emerald-500"
                }`}>
                <Power size={14} />
                <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider">
                  {status === "active" ? "Off" : "On"}
                </span>
              </button>

              {!hasChildren && (
                <button
                  onClick={() => onDelete?.(node._id)}
                  className="flex h-8 w-8 md:h-auto md:w-auto items-center justify-center gap-2 md:px-2.5 md:py-1.5 rounded-lg border border-red-100 bg-red-50/30 text-slate-400 hover:border-red-400 hover:text-red-600 transition-all">
                  <Trash2 size={14} />
                  <span className="hidden xl:inline text-[10px] font-bold uppercase tracking-wider">
                    Archive
                  </span>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => onRestore?.(node._id)}
              className="flex h-8 w-8 md:h-auto md:w-auto items-center justify-center gap-2 md:px-2.5 md:py-1.5 rounded-lg border border-violet-200 bg-violet-50/30 text-violet-600 hover:border-violet-400 transition-all">
              <RotateCcw size={14} />
              <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider">
                Restore
              </span>
            </button>
          )}
        </div>
      </div>

      {/* CHILDREN */}
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
