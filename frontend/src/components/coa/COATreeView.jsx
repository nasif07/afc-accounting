import React, { useState, useMemo } from 'react';
import { Search, Loader, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import COATreeNode from './COATreeNode';
import { toast } from 'sonner';

const COATreeView = ({ onAddAccount, onEditAccount, onDeleteAccount }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch account tree
  const { data: treeData = [], isLoading, error, refetch } = useQuery({
    queryKey: ['accountTree'],
    queryFn: async () => {
      const response = await api.get('/accounts/tree');
      return response.data.data || [];
    },
  });

  // Filter tree based on search
  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) return treeData;

    const searchLower = searchTerm.toLowerCase();

    const filterNode = (node) => {
      const matches =
        node.accountCode.toLowerCase().includes(searchLower) ||
        node.accountName.toLowerCase().includes(searchLower);

      const filteredChildren = node.children
        ? node.children
            .map(filterNode)
            .filter((child) => child !== null)
        : [];

      if (matches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    };

    return treeData
      .map(filterNode)
      .filter((node) => node !== null);
  }, [treeData, searchTerm]);

  // Handle view account
  const handleViewAccount = (account) => {
    console.log('View account:', account);
    toast.info(`Viewing details for ${account.accountName}`);
  };

  // Handle edit account
  const handleEditAccount = (account) => {
    if (onEditAccount) {
      onEditAccount(account);
    } else {
      toast.info('Edit account callback not provided');
    }
  };

  // Handle delete account
  const handleDeleteAccount = async (accountId) => {
    if (onDeleteAccount) {
      onDeleteAccount(accountId);
    } else {
      if (window.confirm('Are you sure you want to delete this account?')) {
        try {
          await api.delete(`/accounts/${accountId}`);
          toast.success('Account deleted successfully');
          refetch();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete account');
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin text-blue-600" size={24} />
        <span className="ml-2 text-gray-600">Loading account tree...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error loading account tree: {error.message}
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Chart of Accounts Hierarchy</h2>
        {onAddAccount && (
          <button
            onClick={onAddAccount}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
          >
            <Plus size={18} />
            Add Account
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search by code or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Tree View */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {filteredTree.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredTree.map((node) => (
              <div key={node._id}>
                <COATreeNode
                  node={node}
                  onEdit={handleEditAccount}
                  onDelete={handleDeleteAccount}
                  onView={handleViewAccount}
                  isLeaf={!node.children || node.children.length === 0}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No accounts found matching your search' : 'No accounts available'}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-200 border border-blue-400 rounded" />
          <span>Leaf Account</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-200 border border-purple-400 rounded" />
          <span>Parent Account</span>
        </div>
      </div>
    </div>
  );
};

export default COATreeView;
