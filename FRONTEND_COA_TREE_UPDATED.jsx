// ✅ UPDATED: Chart of Accounts Tree Component
// Includes: Parent-child hierarchy visualization, leaf node filtering, status indicators

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAccounts } from '../store/slices/accountSlice';
import { ChevronDown, ChevronRight, Leaf, FolderOpen } from 'lucide-react';

export default function COATree({ onSelectAccount, leafNodesOnly = false }) {
  const dispatch = useDispatch();
  const { accounts, loading } = useSelector((state) => state.accounts);
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  // ✅ Fetch accounts on mount
  useEffect(() => {
    dispatch(fetchAccounts({ leafNodesOnly }));
  }, [dispatch, leafNodesOnly]);
  
  /**
   * ✅ Toggle account expansion
   */
  const toggleExpand = (accountId) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };
  
  /**
   * ✅ Handle account selection
   */
  const handleSelectAccount = (account) => {
    // ✅ NEW: Only allow selecting leaf nodes
    if (account.isLeaf || !leafNodesOnly) {
      setSelectedAccount(account._id);
      if (onSelectAccount) {
        onSelectAccount(account);
      }
    }
  };
  
  /**
   * ✅ Build tree structure from flat accounts
   */
  const buildTree = (accounts) => {
    const accountMap = {};
    const roots = [];
    
    // Create map of accounts
    accounts.forEach((account) => {
      accountMap[account._id] = { ...account, children: [] };
    });
    
    // Build tree relationships
    accounts.forEach((account) => {
      if (account.parentAccount) {
        const parent = accountMap[account.parentAccount];
        if (parent) {
          parent.children.push(accountMap[account._id]);
        }
      } else {
        roots.push(accountMap[account._id]);
      }
    });
    
    return roots;
  };
  
  /**
   * ✅ Render tree node recursively
   */
  const renderNode = (account, level = 0) => {
    const isExpanded = expandedAccounts.has(account._id);
    const hasChildren = account.children && account.children.length > 0;
    const isSelected = selectedAccount === account._id;
    const isLeaf = !hasChildren;
    
    // ✅ NEW: Determine if account can be selected
    const canSelect = isLeaf || !leafNodesOnly;
    
    return (
      <div key={account._id}>
        <div
          className={`flex items-center gap-2 px-4 py-2 ml-${level * 4} cursor-pointer rounded-lg transition ${
            isSelected
              ? 'bg-blue-100 border-l-4 border-blue-600'
              : canSelect
              ? 'hover:bg-gray-100'
              : 'opacity-60'
          } ${!canSelect ? 'cursor-not-allowed' : ''}`}
          onClick={() => handleSelectAccount(account)}
        >
          {/* ✅ NEW: Expand/collapse icon */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(account._id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          
          {/* ✅ NEW: Icon to show leaf vs parent */}
          {isLeaf ? (
            <Leaf size={16} className="text-green-600" />
          ) : (
            <FolderOpen size={16} className="text-blue-600" />
          )}
          
          {/* Account details */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold">
                {account.accountCode}
              </span>
              <span className="text-sm text-gray-700">
                {account.accountName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-1 bg-gray-100 rounded">
                {account.accountType}
              </span>
              {/* ✅ NEW: Status indicator */}
              <span className={`px-2 py-1 rounded ${
                account.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : account.status === 'inactive'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {account.status}
              </span>
              {/* ✅ NEW: Show if account has transactions */}
              {account.hasTransactions && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  Has Transactions
                </span>
              )}
            </div>
          </div>
          
          {/* ✅ NEW: Disable indicator for parent accounts */}
          {!canSelect && (
            <span className="text-xs text-gray-500 font-medium">
              (Parent Account)
            </span>
          )}
        </div>
        
        {/* ✅ Render children if expanded */}
        {isExpanded && hasChildren && (
          <div className="ml-4">
            {account.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading Chart of Accounts...
      </div>
    );
  }
  
  const tree = buildTree(accounts);
  
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Chart of Accounts</h3>
      
      {/* ✅ NEW: Legend */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
        <p className="font-medium mb-2">Legend:</p>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Leaf size={16} className="text-green-600" />
            <span>Leaf Node (Can be used in transactions)</span>
          </div>
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-blue-600" />
            <span>Parent Account (Cannot be used in transactions)</span>
          </div>
        </div>
      </div>
      
      {/* Tree */}
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {tree.length > 0 ? (
          tree.map((account) => renderNode(account))
        ) : (
          <p className="text-gray-500 text-center py-4">
            No accounts found
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * ✅ NEW: Account Selector Component (for forms)
 * Only shows leaf nodes and prevents parent account selection
 */
export function AccountSelector({ value, onChange, accountType = null }) {
  const dispatch = useDispatch();
  const { accounts } = useSelector((state) => state.accounts);
  const [leafNodes, setLeafNodes] = useState([]);
  
  useEffect(() => {
    dispatch(fetchAccounts({ leafNodesOnly: true, accountType }));
  }, [dispatch, accountType]);
  
  useEffect(() => {
    // ✅ Filter to show only leaf nodes
    const filtered = accounts.filter((acc) => acc.isLeaf && acc.status === 'active');
    setLeafNodes(filtered);
  }, [accounts]);
  
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    >
      <option value="">Select Account</option>
      {leafNodes.map((account) => (
        <option key={account._id} value={account._id}>
          {account.accountCode} - {account.accountName}
        </option>
      ))}
    </select>
  );
}
