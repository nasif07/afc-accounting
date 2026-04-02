import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Trash2, Eye } from 'lucide-react';

const COATreeNode = ({
  node,
  level = 0,
  onEdit,
  onDelete,
  onView,
  isLeaf = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  // Tailwind doesn't support dynamic class names like 'ml-' + (level * 4)
  // We use inline style for indentation
  const indentationStyle = { paddingLeft: `${level * 1.5}rem` };

  return (
    <div className="select-none">
      {/* Node Row */}
      <div 
        style={indentationStyle}
        className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded transition"
      >
        {/* Expand/Collapse Toggle */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-200 rounded transition"
          >
            {isExpanded ? (
              <ChevronDown size={16} className="text-gray-600" />
            ) : (
              <ChevronRight size={16} className="text-gray-600" />
            )}
          </button>
        ) : (
          <div className="w-6" /> /* Spacer for alignment */
        )}

        {/* Account Icon */}
        <div className={`w-4 h-4 rounded ${
          isLeaf || !hasChildren
            ? 'bg-blue-200 border border-blue-400'
            : 'bg-purple-200 border border-purple-400'
        }`} />

        {/* Account Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-700 font-semibold">
              {node.accountCode}
            </span>
            <span className="text-sm text-gray-900 truncate">{node.accountName}</span>
            <span className="hidden md:inline-block text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded capitalize">
              {node.accountType}
            </span>
            {isLeaf || !hasChildren ? (
              <span className="hidden md:inline-block text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                Leaf
              </span>
            ) : (
              <span className="hidden md:inline-block text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                Parent
              </span>
            )}
          </div>
        </div>

        {/* Balance Display */}
        <div className="text-right mr-4">
          <p className="text-sm font-semibold text-gray-900">
            {node.balance !== undefined ? node.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => onView && onView(node)}
            className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => onEdit && onEdit(node)}
            className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition"
            title="Edit Account"
          >
            <Edit2 size={16} />
          </button>
          {(isLeaf || !hasChildren) && (
            <button
              onClick={() => onDelete && onDelete(node._id)}
              className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition"
              title="Delete Account"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Child Nodes */}
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
              isLeaf={!child.children || child.children.length === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default COATreeNode;
