import React, { useMemo, useState, useEffect } from "react";
import { Info, Search, Tag } from "lucide-react";
import COATreeNode from "./COATreeNode";
import AccountDetailsModal from "./AccountDetailsModal";
import { toast } from "sonner";
import { coaAPI } from "../../services/apiMethods";

const COATreeView = ({
  accounts = [],
  onEditAccount,
  onDeleteAccount,
  onRestoreAccount,
  onStatusChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [balances, setBalances] = useState({});

  // Fetch balances for leaf accounts
  useEffect(() => {
    const fetchBalances = async () => {
      if (!Array.isArray(accounts) || accounts.length === 0) return;
      
      const leafAccounts = accounts.filter((acc) => {
        const parentId = typeof acc.parentAccount === "object" && acc.parentAccount !== null
          ? acc.parentAccount._id
          : acc.parentAccount || null;
        return !parentId || !accounts.some((a) => a._id === parentId);
      });

      const newBalances = {};
      for (const account of leafAccounts) {
        try {
          const response = await coaAPI.getBalance(account._id);
          newBalances[account._id] = response.data.data?.balance || 0;
        } catch (error) {
          console.error(`Failed to fetch balance for ${account._id}:`, error);
        }
      }
      setBalances(newBalances);
    };

    fetchBalances();
  }, [accounts]);

  const treeData = useMemo(() => {
    const map = {};
    const roots = [];

    accounts.forEach((acc) => {
      map[acc._id] = { ...acc, children: [], balance: balances[acc._id] };
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

    const sortTree = (nodes) =>
      nodes
        .sort((a, b) =>
          String(a.accountCode).localeCompare(
            String(b.accountCode),
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            },
          ),
        )
        .map((node) => ({
          ...node,
          children: sortTree(node.children || []),
        }));

    return sortTree(roots);
  }, [accounts]);

  const filteredTree = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const filterNode = (node) => {
      const matches =
        !search ||
        String(node.accountCode || "")
          .toLowerCase()
          .includes(search) ||
        String(node.accountName || "")
          .toLowerCase()
          .includes(search);

      const filteredChildren = (node.children || [])
        .map(filterNode)
        .filter(Boolean);

      if (matches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    };

    return treeData.map(filterNode).filter(Boolean);
  }, [treeData, searchTerm]);

  const handleViewAccount = (account) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full bg-white">
      {/* Search Header - Responsive Padding */}
      <div className="relative mb-4 group">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors"
          size={16}
        />
        <input
          type="text"
          placeholder="Search by code or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-slate-400 focus:ring-4 focus:ring-slate-50 focus:outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Tree Container - Horizontal scroll on tiny screens if needed */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="min-w-full inline-block align-middle">
          {filteredTree.length ? (
            filteredTree.map((node) => (
              <COATreeNode
                key={node._id}
                node={node}
                onEdit={onEditAccount}
                onDelete={onDeleteAccount}
                onRestore={onRestoreAccount}
                onView={handleViewAccount}
                onToggleStatus={onStatusChange}
              />
            ))
          ) : (
            <div className="px-4 py-16 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-3">
                <Search size={20} />
              </div>
              <p className="text-sm font-medium text-slate-500">
                No matching accounts found
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Account Details Modal */}
      <AccountDetailsModal
        account={selectedAccount}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAccount(null);
        }}
      />

      {/* Legend / Info Section - Responsive Grid/Flex */}
      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        {/* Types Legend */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 shrink-0">
            <Tag size={13} className="text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Account Types
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Asset
            </span>
            <span className="flex items-center gap-1.5 text-orange-600">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-600" />{" "}
              Liability
            </span>
            <span className="flex items-center gap-1.5 text-violet-600">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-600" /> Equity
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />{" "}
              Income
            </span>
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-600" /> Expense
            </span>
          </div>
        </div>

        {/* Separator - Visible only on Desktop */}
        <div className="hidden h-5 w-px bg-slate-200 lg:block" />

        {/* Status Legend */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 shrink-0">
            <Info size={13} className="text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Status Guide
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-tight">
            <span className="rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-emerald-700">
              Active
            </span>
            <span className="rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-amber-700">
              Inactive
            </span>
            <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-500 tracking-normal">
              Archived
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default COATreeView;
