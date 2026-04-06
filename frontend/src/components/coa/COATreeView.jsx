import React, { useMemo, useState } from "react";
import { Search, Loader, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import COATreeNode from "./COATreeNode";
import { toast } from "sonner";

const formatBalance = (amount = 0, balanceType = "debit") => {
  const numericAmount = Number(amount) || 0;

  return `${numericAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${balanceType === "credit" ? "Cr" : "Dr"}`;
};

const COATreeView = ({
  accounts,
  statusFilter = "active",
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onRestoreAccount,
  onStatusChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const {
    data: fetchedTreeData = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["accountTree", statusFilter],
    queryFn: async () => {
      const res = await api.get("/accounts/tree", {
        params: {
          includeDeleted: true,
          status: statusFilter === "all" ? "all" : statusFilter,
        },
      });
      return res.data.data || [];
    },
    enabled: !Array.isArray(accounts),
  });

  const treeData = useMemo(() => {
    if (Array.isArray(accounts)) {
      const map = {};
      const roots = [];

      accounts.forEach((acc) => {
        map[acc._id] = { ...acc, children: [] };
      });

      accounts.forEach((acc) => {
        const parentId =
          typeof acc.parentAccount === "object" && acc.parentAccount !== null
            ? acc.parentAccount._id
            : acc.parentAccount || null;

        if (parentId && map[parentId]) {
          map[parentId].children.push(map[acc._id]);
        } else {
          roots.push(map[acc._id]);
        }
      });

      return roots.sort((a, b) =>
        String(a.accountCode).localeCompare(String(b.accountCode), undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
    }

    return fetchedTreeData;
  }, [accounts, fetchedTreeData]);

  const filteredTree = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();

    const applyFilters = (node) => {
      const matchesSearch =
        !searchLower ||
        String(node.accountCode || "").toLowerCase().includes(searchLower) ||
        String(node.accountName || "").toLowerCase().includes(searchLower);

      const filteredChildren = Array.isArray(node.children)
        ? node.children.map(applyFilters).filter(Boolean)
        : [];

      const matchesStatus =
        statusFilter === "all" ? true : node.status === statusFilter;

      if ((matchesSearch && matchesStatus) || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    };

    return treeData.map(applyFilters).filter(Boolean);
  }, [treeData, searchTerm, statusFilter]);

  const handleViewAccount = (account) => {
    const amount =
      account.balance ??
      account.currentBalance ??
      account.openingBalance ??
      0;

    const type =
      account.balanceType ??
      account.currentBalanceType ??
      account.openingBalanceType ??
      "debit";

    toast.info(
      `${account.accountCode} - ${account.accountName} • ${formatBalance(
        amount,
        type
      )}`
    );
  };

  const handleEditAccount = (account) => {
    if (account.status === "archived") {
      toast.error("Archived accounts cannot be edited");
      return;
    }

    onEditAccount?.(account);
  };

  const handleArchiveAccount = async (accountId) => {
    if (!onDeleteAccount) {
      toast.error("Archive handler not provided");
      return;
    }

    await onDeleteAccount(accountId);
    await queryClient.invalidateQueries({ queryKey: ["accountTree"] });
  };

  const handleRestoreAccount = async (accountId) => {
    if (!onRestoreAccount) {
      toast.error("Restore handler not provided");
      return;
    }

    await onRestoreAccount(accountId);
    await queryClient.invalidateQueries({ queryKey: ["accountTree"] });
  };

  const handleToggleStatus = async (account) => {
    if (!onStatusChange) return;
    if (account.status === "archived") return;

    const newStatus = account.status === "active" ? "inactive" : "active";

    await onStatusChange(account._id, newStatus);
    await queryClient.invalidateQueries({ queryKey: ["accountTree"] });
  };

  if (!Array.isArray(accounts) && isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin text-blue-600" size={24} />
        <span className="ml-2 text-gray-600">Loading account tree...</span>
      </div>
    );
  }

  if (!Array.isArray(accounts) && error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Error loading account tree: {error.message}
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Chart of Accounts Hierarchy
        </h2>

        {onAddAccount && (
          <button
            onClick={onAddAccount}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            type="button"
          >
            <Plus size={18} />
            Add Account
          </button>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search by code or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        {filteredTree.length ? (
          <div className="divide-y divide-gray-200">
            {filteredTree.map((node) => (
              <COATreeNode
                key={node._id}
                node={node}
                onEdit={handleEditAccount}
                onDelete={handleArchiveAccount}
                onRestore={handleRestoreAccount}
                onView={handleViewAccount}
                onToggleStatus={handleToggleStatus}
                isLeaf={!node.children?.length}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {searchTerm
              ? "No accounts found matching your search"
              : `No ${statusFilter === "all" ? "" : statusFilter + " "}accounts available`}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-blue-400 bg-blue-200" />
          <span>Leaf Account</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-purple-400 bg-purple-200" />
          <span>Parent Account</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-green-200" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-yellow-200" />
          <span>Inactive</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-gray-300" />
          <span>Archived</span>
        </div>
      </div>
    </div>
  );
};

export default COATreeView;
