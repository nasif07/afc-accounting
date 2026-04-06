import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Eye,
  Power,
} from "lucide-react";

const formatBalance = (amount = 0, balanceType = "debit") => {
  const numericAmount = Number(amount) || 0;

  return `${numericAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${balanceType === "credit" ? "Cr" : "Dr"}`;
};

const COATreeNode = ({
  node,
  level = 0,
  onEdit,
  onDelete,
  onView,
  onToggleStatus, // ✅ NEW
  isLeaf = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasChildren = node.children?.length > 0;
  const isArchived = node.status === "archived";
  const isInactive = node.status === "inactive";

  const indentationStyle = { paddingLeft: `${level * 1.5}rem` };

  const displayBalance =
    node.balance ?? node.currentBalance ?? node.openingBalance ?? 0;

  const displayBalanceType =
    node.balanceType ??
    node.currentBalanceType ??
    node.openingBalanceType ??
    "debit";

  return (
    <div className={`select-none ${isArchived ? "opacity-50" : ""}`}>
      <div
        style={indentationStyle}
        className="flex items-center gap-2 rounded px-3 py-2 transition hover:bg-gray-50"
      >
        {/* Expand */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-1 hover:bg-gray-200"
          >
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Icon */}
        <div
          className={`h-4 w-4 rounded ${
            isLeaf || !hasChildren
              ? "bg-blue-200 border border-blue-400"
              : "bg-purple-200 border border-purple-400"
          }`}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-gray-700">
              {node.accountCode}
            </span>

            <span className="text-sm text-gray-900 truncate">
              {node.accountName}
            </span>

            <span className="hidden md:inline-block text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded capitalize">
              {node.accountType}
            </span>

            <span
              className={`hidden md:inline-block text-xs px-2 py-0.5 rounded ${
                isLeaf || !hasChildren
                  ? "bg-blue-100 text-blue-700"
                  : "bg-purple-100 text-purple-700"
              }`}
            >
              {isLeaf ? "Leaf" : "Parent"}
            </span>

            {/* STATUS BADGE */}
            <span
              className={`text-xs px-2 py-0.5 rounded capitalize ${
                node.status === "active"
                  ? "bg-green-100 text-green-700"
                  : node.status === "inactive"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-300 text-gray-700"
              }`}
            >
              {node.status}
            </span>
          </div>

          {node.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {node.description}
            </p>
          )}
        </div>

        {/* Balance */}
        <div className="text-right mr-4">
          <p className="text-sm font-semibold text-gray-900">
            {formatBalance(displayBalance, displayBalanceType)}
          </p>
          <p className="text-xs text-gray-500 capitalize">
            {displayBalanceType}
          </p>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-1">
          {/* View */}
          <button
            onClick={() => onView?.(node)}
            className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
          >
            <Eye size={16} />
          </button>

          {/* Edit */}
          <button
            onClick={() => !isArchived && onEdit?.(node)}
            disabled={isArchived}
            className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-40"
          >
            <Edit2 size={16} />
          </button>

          {/* Toggle Active/Inactive */}
          {!isArchived && (
            <button
              onClick={() => onToggleStatus?.(node)}
              className="p-1 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded"
              title="Toggle Active/Inactive"
            >
              <Power size={16} />
            </button>
          )}

          {/* Archive */}
          {(isLeaf || !hasChildren) && !isArchived && (
            <button
              onClick={() => onDelete?.(node._id)}
              className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
              title="Archive Account"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="border-l border-gray-200 ml-4">
          {node.children.map((child) => (
            <COATreeNode
              key={child._id}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              onToggleStatus={onToggleStatus}
              isLeaf={!child.children?.length}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default COATreeNode;