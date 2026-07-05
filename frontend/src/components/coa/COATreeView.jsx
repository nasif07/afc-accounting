import React, { useMemo, useState } from "react";
import { Info, Search, Tag } from "lucide-react";
import COATreeNode from "./COATreeNode";
import AccountDetailsModal from "./AccountDetailsModal";

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
  // Ids the user has explicitly clicked the chevron for — XORed against the
  // "root levels start expanded, deeper levels start collapsed" default so
  // expand state survives data refreshes (create/edit/archive) without
  // needing to remember every node's state up front.
  const [toggledIds, setToggledIds] = useState(() => new Set());

  const treeData = useMemo(() => {
    const safeAccounts = Array.isArray(accounts)
      ? accounts.filter((acc) => acc && acc._id)
      : [];

    const map = {};
    const roots = [];

    safeAccounts.forEach((acc) => {
      map[acc._id] = {
        ...acc,
        children: [],
        balance: Number(acc.currentBalance || 0),
        balanceType: acc.currentBalanceType || "debit",
      };
    });

    safeAccounts.forEach((acc) => {
      const parentId =
        typeof acc.parentAccount === "object" && acc.parentAccount !== null
          ? acc.parentAccount._id
          : acc.parentAccount || null;

      if (parentId && map[parentId] && map[acc._id]) {
        map[parentId].children.push(map[acc._id]);
      } else if (map[acc._id]) {
        roots.push(map[acc._id]);
      }
    });

    const sortTree = (nodes) =>
      (Array.isArray(nodes) ? nodes : [])
        .filter((node) => node && node._id)
        .sort((a, b) =>
          String(a.accountCode || "").localeCompare(
            String(b.accountCode || ""),
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
      if (!node || !node._id) return null;

      const matches =
        !search ||
        String(node.accountCode || "")
          .toLowerCase()
          .includes(search) ||
        String(node.accountName || "")
          .toLowerCase()
          .includes(search);

      const filteredChildren = (
        Array.isArray(node.children) ? node.children : []
      )
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

    return (Array.isArray(treeData) ? treeData : [])
      .map(filterNode)
      .filter(Boolean);
  }, [treeData, searchTerm]);

  const handleViewAccount = (account) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  const isNodeExpanded = (node, level) => {
    const defaultExpanded = level < 1;
    return toggledIds.has(node._id) ? !defaultExpanded : defaultExpanded;
  };

  const toggleExpand = (id) => {
    setToggledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Flatten the (already search-filtered) tree into a row list respecting
  // expand/collapse state, so it can render as a single flat <tbody> — a
  // real HTML table can't nest a child <tr> inside a parent <tr>.
  const visibleRows = useMemo(() => {
    const rows = [];

    const walk = (nodes, level) => {
      (Array.isArray(nodes) ? nodes : [])
        .filter((node) => node && node._id)
        .forEach((node) => {
          const children = Array.isArray(node.children)
            ? node.children.filter(Boolean)
            : [];
          const expanded = isNodeExpanded(node, level);

          rows.push({ node, level, hasChildren: children.length > 0, childCount: children.length, expanded });

          if (children.length > 0 && expanded) {
            walk(children, level + 1);
          }
        });
    };

    walk(filteredTree, 0);
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTree, toggledIds]);

  return (
    <div className="w-full bg-white">
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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {visibleRows.length ? (
          <table className="w-full min-w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5">Account</th>
                <th className="w-28 px-3 py-2.5 text-right">Balance</th>
                <th className="w-32 px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ node, level, hasChildren, childCount, expanded }) => (
                <COATreeNode
                  key={node._id}
                  node={node}
                  level={level}
                  hasChildren={hasChildren}
                  childCount={childCount}
                  isExpanded={expanded}
                  onToggleExpand={() => toggleExpand(node._id)}
                  onEdit={onEditAccount}
                  onDelete={onDeleteAccount}
                  onRestore={onRestoreAccount}
                  onView={handleViewAccount}
                  onToggleStatus={onStatusChange}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-16 text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <Search size={20} />
            </div>
            <p className="text-sm font-medium text-slate-500">
              No matching accounts found
            </p>
          </div>
        )}
      </div>

      <AccountDetailsModal
        account={selectedAccount}
        isOpen={isModalOpen}
        allAccounts={accounts}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAccount(null);
        }}
      />

      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-center gap-2">
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

        <div className="hidden h-5 w-px bg-slate-200 lg:block" />

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-center gap-2">
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