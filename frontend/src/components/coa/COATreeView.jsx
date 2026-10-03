import React, { useMemo, useState } from "react";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Info,
  Search,
  Tag,
} from "lucide-react";
import COATreeNode from "./COATreeNode";
import AccountDetailsModal from "./AccountDetailsModal";
import api from "../../services/api";

// Expand state is stored as a default *mode* plus the set of ids the user has
// explicitly clicked the chevron for, XORed against that mode. Keeping
// deviations rather than a literal "expanded ids" set means expand state
// survives data refreshes (create/edit/archive), and it's also what lets
// Expand/Collapse All reach every depth — including grandchildren that are
// currently collapsed out of the DOM and whose ids we'd otherwise have to
// enumerate up front.
//   "auto"      — root levels start expanded, deeper levels collapsed
//   "expanded"  — everything expanded (Expand All)
//   "collapsed" — everything collapsed (Collapse All)
const BROWSE_DEFAULT = { mode: "auto", toggled: new Set() };

// While a search is active every node starts expanded — otherwise a match on
// a deep child gets filtered *in* yet stays hidden inside a collapsed parent,
// and the user searches only to see nothing. This is tracked separately from
// the browse state and thrown away when the search clears, so searching never
// disturbs the tree the user had arranged.
const SEARCH_DEFAULT = { mode: "expanded", toggled: new Set() };

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
  const [isRefreshingDetails, setIsRefreshingDetails] = useState(false);
  const [browseState, setBrowseState] = useState(BROWSE_DEFAULT);
  const [searchState, setSearchState] = useState(SEARCH_DEFAULT);

  const isSearching = searchTerm.trim().length > 0;
  const expandState = isSearching ? searchState : browseState;
  const setExpandState = isSearching ? setSearchState : setBrowseState;

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    // Leaving search discards the search-local expand state, so the browse
    // tree comes back exactly as the user left it.
    if (!value.trim()) setSearchState(SEARCH_DEFAULT);
  };

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

  const handleViewAccount = async (account) => {
    // Show the row data we already have immediately, then replace it with a
    // fresh single-account fetch. The list this row came from can be
    // minutes old (or, for currentBalance specifically, can lag behind a
    // journal-entry change made elsewhere entirely) — GET /accounts/:id
    // recalculates currentBalance from the ledger on every call, so this is
    // the only reliably-current source for it.
    setSelectedAccount(account);
    setIsModalOpen(true);
    setIsRefreshingDetails(true);

    try {
      const res = await api.get(`/accounts/${account._id}`);
      setSelectedAccount(res.data.data);
    } catch {
      // Keep showing the already-known row data if the refresh fails.
    } finally {
      setIsRefreshingDetails(false);
    }
  };

  const isNodeExpanded = (node, level) => {
    const defaultExpanded =
      expandState.mode === "expanded"
        ? true
        : expandState.mode === "collapsed"
          ? false
          : level < 1;

    return expandState.toggled.has(node._id)
      ? !defaultExpanded
      : defaultExpanded;
  };

  const toggleExpand = (id) => {
    setExpandState((prev) => {
      const toggled = new Set(prev.toggled);
      if (toggled.has(id)) toggled.delete(id);
      else toggled.add(id);
      return { ...prev, toggled };
    });
  };

  // Moving the default mode and dropping every individual deviation is what
  // makes this apply at all depths at once; individual chevrons keep working
  // afterwards because they simply start deviating from the new default.
  const setAllExpanded = (expanded) =>
    setExpandState({
      mode: expanded ? "expanded" : "collapsed",
      toggled: new Set(),
    });

  // Walks the whole filtered tree, not just the visible rows: a collapsed
  // grandchild inside a collapsed parent still means "something is collapsed",
  // so one press of Expand All opens everything rather than one layer.
  const { hasExpandable, hasCollapsed } = useMemo(() => {
    let expandable = false;
    let collapsed = false;

    const walk = (nodes, level) => {
      (Array.isArray(nodes) ? nodes : [])
        .filter((node) => node && node._id)
        .forEach((node) => {
          const children = Array.isArray(node.children)
            ? node.children.filter(Boolean)
            : [];

          if (children.length === 0) return;

          expandable = true;
          if (!isNodeExpanded(node, level)) collapsed = true;
          walk(children, level + 1);
        });
    };

    walk(filteredTree, 0);
    return { hasExpandable: expandable, hasCollapsed: collapsed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTree, expandState]);

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
  }, [filteredTree, expandState]);

  return (
    <div className="w-full bg-white">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative group flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors"
            size={16}
          />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-slate-400 focus:ring-4 focus:ring-slate-50 focus:outline-none placeholder:text-slate-400"
          />
        </div>

        <button
          type="button"
          onClick={() => setAllExpanded(hasCollapsed)}
          disabled={!hasExpandable}
          title={
            hasExpandable
              ? undefined
              : "No accounts with sub-accounts to expand"
          }
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 focus:border-slate-400 focus:ring-4 focus:ring-slate-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-600">
          {hasCollapsed ? (
            <ChevronsUpDown size={15} aria-hidden="true" />
          ) : (
            <ChevronsDownUp size={15} aria-hidden="true" />
          )}
          {hasCollapsed ? "Expand All" : "Collapse All"}
        </button>
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
        isRefreshing={isRefreshingDetails}
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