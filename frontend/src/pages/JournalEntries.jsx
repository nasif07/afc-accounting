import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import {
  fetchJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  clearError,
} from "../store/slices/journalSlice";
import { fetchAccounts } from "../store/slices/accountSlice";
import { fetchSettings } from "../store/slices/settingsSlice";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Eye,
  BookOpen,
  CalendarRange,
  X,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
} from "lucide-react";
import { toast } from "sonner";
import DynamicJournalForm from "../components/journal/DynamicJournalForm";
import SectionHeader from "../components/common/SectionHeader";
import Modal from "../components/common/Modal";
import Badge from "../components/common/Badge";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import DatePicker from "../components/common/DatePicker";
import AccountCombobox from "../components/common/AccountCombobox";
import Table from "../components/common/Table";
import Button from "../components/common/Button";
import { usePaginationParams } from "../hooks/usePaginationParams";
import {
  buildMonthOptions,
  firstDayOfCurrentMonth,
  formatDisplayDate,
  monthFromRange,
  monthRange,
  todayISO,
} from "../utils/date";
import { formatCurrency } from "../utils/currency";
import {
  canEditEntry,
  editBlockedReason,
  isEntryApproved,
} from "../utils/journalPermissions";


// Mirrors what GET /accounting/journal-entries already accepts (see
// getAllEntriesQuery in backend/src/validation/accounting.validation.js) —
// these keys are passed straight through as query params, so the names must
// match the backend's exactly. The `status` filter the endpoint also supports
// is deliberately not surfaced: posting requires approval, so it would
// duplicate Approval Status with subtly different results.
const INITIAL_FILTERS = {
  approvalStatus: "",
  transactionType: "",
  sourceModule: "",
  account: "",
  dateFrom: "",
  dateTo: "",
};

// The ledger opens on the current month — 1st of the month through today —
// instead of every entry ever posted. "Clear all filters" returns here rather
// than to a blank range, so a reset and a fresh page load agree. Widening to
// an earlier date is one edit in the filter panel.
const defaultFilters = () => ({
  ...INITIAL_FILTERS,
  dateFrom: firstDayOfCurrentMonth(),
  dateTo: todayISO(),
});

// Month dropdown value for "no date range"; "" is its "Custom range" state.
const ALL_DATES = "all";

// Mirrors SOURCE_MODULES in backend/src/config/constants.js.
const SOURCE_MODULE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "bank_book", label: "Bank Book" },
  { value: "student_collection", label: "Student Collection" },
  { value: "petty_cash", label: "Petty Cash" },
  { value: "payroll", label: "Payroll" },
  { value: "receipt", label: "Receipt" },
  { value: "expense", label: "Expense" },
  { value: "OPENING_BALANCE", label: "Opening Balance" },
];

// Must stay a subset of SORTABLE_FIELDS in accounting.validation.js — the
// endpoint rejects anything else.
const SORT_OPTIONS = [
  { value: "voucherDate", label: "Date" },
  { value: "voucherNumber", label: "Voucher #" },
  { value: "totalDebit", label: "Debit Amount" },
  { value: "totalCredit", label: "Credit Amount" },
  { value: "createdAt", label: "Date Created" },
];

// Matches the backend's own defaults, so the initial render asks for exactly
// what it would have returned unsorted-by-request anyway.
const DEFAULT_SORT = { sortBy: "voucherDate", sortOrder: "desc" };

const APPROVAL_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const TRANSACTION_TYPE_OPTIONS = [
  { value: "receipt", label: "Receipt" },
  { value: "payment", label: "Payment" },
  { value: "journal-entry", label: "Journal Entry" },
  { value: "transfer", label: "Transfer" },
];

export default function JournalEntries() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { entries, pagination, isLoading, error } = useSelector(
    (state) => state.journals,
  );
  const { data: settings } = useSelector((state) => state.settings);
  // Already fetched below for the entry form; reused here for the account filter.
  const { accounts = [] } = useSelector((state) => state.accounts);

  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [sort, setSort] = useState(DEFAULT_SORT);

  // Frozen for the session so the "is this filter customised?" comparison
  // below can't shift under a page left open across midnight.
  const [initialDefaults] = useState(defaultFilters);

  const {
    page: currentPage,
    pageSize: limit,
    setPage,
    setPageSize,
    resetPage,
  } = usePaginationParams(20);

  // Counts only what the user changed inside the collapsible panel. The date
  // range lives in the always-visible bar above the table, so it isn't
  // badged here — it is visible on its own.
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) =>
      key !== "dateFrom" &&
      key !== "dateTo" &&
      value &&
      value !== initialDefaults[key],
  ).length;
  const selectedMonth = monthFromRange(filters.dateFrom, filters.dateTo);
  // Picking the current month from the dropdown (1st → last day) shows the
  // same entries as the default (1st → today), so it isn't a customisation.
  const isRangeCustomised =
    selectedMonth !== initialDefaults.dateFrom.slice(0, 7) &&
    (filters.dateFrom !== initialDefaults.dateFrom ||
      filters.dateTo !== initialDefaults.dateTo);
  const hasCustomFilters = activeFilterCount > 0 || isRangeCustomised;

  const monthOptions = buildMonthOptions(selectedMonth);

  const handleMonthChange = (monthValue) => {
    // "" is the "Custom range" placeholder — nothing to apply.
    if (!monthValue) return;
    resetPage();
    if (monthValue === ALL_DATES) {
      // "All dates" — drop the range entirely.
      setFilters((prev) => ({ ...prev, dateFrom: "", dateTo: "" }));
      return;
    }
    const range = monthRange(monthValue);
    setFilters((prev) => ({
      ...prev,
      dateFrom: range.startDate,
      dateTo: range.endDate,
    }));
  };

  // A reversed range is accepted by the backend and simply returns nothing,
  // which reads as "no data" rather than "you asked for an impossible range".
  // ISO yyyy-mm-dd strings compare correctly with <, so no Date parsing here.
  const hasInvalidRange = Boolean(
    filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo,
  );

  // Every fetch on this page goes through here so the list, the post-save
  // refresh and the post-delete refresh can't drift apart — before this, the
  // two refresh call sites rebuilt the params by hand and would have silently
  // dropped any active filter.
  const buildQuery = useCallback(
    (page) => {
      const query = { page, limit, search: searchTerm, ...sort };
      // Omit empty values entirely: the backend only applies a filter when the
      // key is present, and z.coerce.date() rejects an empty string outright.
      Object.entries(filters).forEach(([key, value]) => {
        if (value) query[key] = value;
      });
      return query;
    },
    [limit, searchTerm, filters, sort],
  );

  const updateFilter = (key, value) => {
    resetPage();
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    resetPage();
    setFilters(initialDefaults);
  };

  // The panel's reset leaves the date range (set in the bar above the table)
  // alone, and the bar's reset leaves the panel's filters alone.
  const clearPanelFilters = () => {
    resetPage();
    setFilters((prev) => ({
      ...initialDefaults,
      dateFrom: prev.dateFrom,
      dateTo: prev.dateTo,
    }));
  };

  const resetDateRange = () => {
    resetPage();
    setFilters((prev) => ({
      ...prev,
      dateFrom: initialDefaults.dateFrom,
      dateTo: initialDefaults.dateTo,
    }));
  };

  useEffect(() => {
    dispatch(fetchAccounts());
    // The director's allowJournalEdit switch gates the edit button.
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      resetPage();
      setSearchTerm(searchInput.trim());
    }, 400);

    return () => clearTimeout(timer);
    // `resetPage` is identity-stable (see usePaginationParams), so listing it
    // here does not re-arm the debounce on every page change.
  }, [searchInput, resetPage]);

  useEffect(() => {
    dispatch(fetchJournalEntries(buildQuery(currentPage)));
  }, [dispatch, currentPage, buildQuery]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Deliberately not wrapped in try/catch here — DynamicJournalForm awaits
  // this call and needs the rejection (the full backend error payload) to
  // reach its own catch block so it can map field-level errors via setError,
  // same pattern as Students.jsx's onSubmit prop.
  const handleFormSubmit = async (payload) => {
    // ==============================
    // UPDATE ENTRY
    // ==============================
    if (editingEntry) {
      const result = await dispatch(
        updateJournalEntry({
          id: editingEntry._id,
          data: payload,
        }),
      );

      if (result?.error) {
        throw result.payload;
      }

      // An edit never changes approval routing — amounts and approvalStatus
      // are immutable on this path, so there is no auto-approve variant.
      toast.success("Journal entry updated successfully");
    }

    // ==============================
    // CREATE ENTRY
    // ==============================
    else {
      const result = await dispatch(createJournalEntry(payload));

      if (result?.error) {
        throw result.payload;
      }

      // Auto approval success message
      if (payload.requiresApproval === false) {
        toast.success("Journal entry created and auto approved successfully");
      } else {
        toast.success("Journal entry created and sent for approval");
      }
    }

    // ==============================
    // CLOSE FORM
    // ==============================
    handleCloseForm();

    // ==============================
    // REFRESH LIST
    // ==============================
    dispatch(fetchJournalEntries(buildQuery(currentPage)));
  };

  const handleEdit = (entry) => {
    if (!canEditEntry(entry, settings)) {
      toast.error(editBlockedReason(settings));
      return;
    }

    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleDelete = async (entry) => {
    if (isEntryApproved(entry)) {
      toast.error("Approved entries cannot be deleted");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    const result = await dispatch(deleteJournalEntry(entry._id));

    if (result?.error) {
      toast.error(result.payload || "Failed to delete entry");
      return;
    }

    toast.success("Entry deleted");

    const isLastItemOnPage = entries.length === 1;
    const shouldGoPrevPage = isLastItemOnPage && currentPage > 1;

    const nextPage = shouldGoPrevPage ? currentPage - 1 : currentPage;
    if (shouldGoPrevPage) {
      setPage(nextPage);
    } else {
      dispatch(fetchJournalEntries(buildQuery(nextPage)));
    }
  };

  // One Badge for all three states — the previous mix of plain text for
  // approved/rejected and a bordered pill for pending made the column read
  // as three different kinds of thing.
  const getStatusDisplay = (entry) => {
    if (isEntryApproved(entry)) {
      return (
        <Badge variant="navy" size="sm">
          Approved
        </Badge>
      );
    }

    if (entry.approvalStatus === "rejected") {
      return (
        <Badge variant="rose" size="sm">
          Rejected
        </Badge>
      );
    }

    return (
      <Badge variant="warning" size="sm">
        Pending
      </Badge>
    );
  };

  // Column definitions drive both the desktop table and the mobile cards —
  // Table derives the cards from `primary` / `type: "actions"` / the rest.
  const columns = [
    {
      key: "voucherDate",
      label: "Date",
      render: (_, entry) => formatDisplayDate(entry.voucherDate || entry.date),
    },
    {
      key: "voucherNumber",
      label: "Voucher #",
      primary: true,
      mono: true,
      className: "font-bold text-blue-600",
      render: (value) => value || "---",
    },
    {
      key: "description",
      label: "Description",
      wrap: false,
      className: "max-w-xs truncate",
      render: (value) => value || "---",
    },
    {
      key: "totalDebit",
      label: "Debit",
      align: "right",
      mono: true,
      className: "font-semibold text-slate-900",
      render: (value) => formatCurrency(value || 0),
    },
    {
      key: "totalCredit",
      label: "Credit",
      align: "right",
      mono: true,
      className: "font-semibold text-slate-900",
      render: (value) => formatCurrency(value || 0),
    },
    {
      key: "status",
      label: "Status",
      render: (_, entry) => getStatusDisplay(entry),
    },
    {
      key: "actions",
      label: "Actions",
      type: "actions",
      align: "center",
      render: (_, entry) => {
        const isApproved = isEntryApproved(entry);
        const isEditable = canEditEntry(entry, settings);

        return (
          <div className="flex justify-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                navigate(`/dashboard/journal-entries/${entry._id}`)
              }
              title="View entry"
              aria-label="View entry"
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-400 transition-all hover:border-slate-300 hover:text-slate-700">
              <Eye size={14} />
            </button>

            <button
              type="button"
              onClick={() => handleEdit(entry)}
              disabled={!isEditable}
              title={isEditable ? "Edit entry" : editBlockedReason(settings)}
              aria-label={isEditable ? "Edit entry" : editBlockedReason(settings)}
              className={`rounded-lg border bg-white p-2 transition-all ${
                !isEditable
                  ? "cursor-not-allowed border-slate-200 text-slate-300"
                  : "border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-600"
              }`}>
              <Edit2 size={14} />
            </button>

            <button
              type="button"
              onClick={() => handleDelete(entry)}
              disabled={isApproved}
              title={isApproved ? "Approved entries cannot be deleted" : "Delete entry"}
              aria-label="Delete entry"
              className={`rounded-lg border bg-white p-2 transition-all ${
                isApproved
                  ? "cursor-not-allowed border-slate-200 text-slate-300"
                  : "border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-600"
              }`}>
              <Trash2 size={14} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4 pb-10">
      <SectionHeader
        icon={BookOpen}
        title="Journal Entries"
        description="Financial transaction ledger"
        buttonText="New Entry"
        onButtonClick={() => setShowForm(true)}
        buttonIcon={Plus}
      />

      <Modal
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editingEntry ? "Edit Entry" : "New Entry"}
        description="Record a balanced journal entry with two or more book entry lines."
        size="4xl">
        <DynamicJournalForm
          initialData={editingEntry}
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
        />
      </Modal>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <Input
            type="text"
            placeholder="Search description or voucher..."
            className="pl-10"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          aria-expanded={showFilters}
          aria-controls="journal-filters"
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-medium transition-all ${
            showFilters || activeFilterCount > 0
              ? "border-slate-400 bg-slate-50 text-slate-900"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}>
          <Filter size={16} /> Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-navy px-1.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div
          id="journal-filters"
          className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Approval Status"
              placeholder="All Statuses"
              options={APPROVAL_STATUS_OPTIONS}
              value={filters.approvalStatus}
              onChange={(e) => updateFilter("approvalStatus", e.target.value)}
            />

            <Select
              label="Transaction Type"
              placeholder="All Types"
              options={TRANSACTION_TYPE_OPTIONS}
              value={filters.transactionType}
              onChange={(e) => updateFilter("transactionType", e.target.value)}
            />

            <Select
              label="Source"
              placeholder="All Sources"
              options={SOURCE_MODULE_OPTIONS}
              value={filters.sourceModule}
              onChange={(e) => updateFilter("sourceModule", e.target.value)}
            />

            {/* Matches entries with a book-entry line against this account.
                The full COA is used rather than leaf-only: historic entries
                may reference an account that has since gained children. */}
            <AccountCombobox
              label="Account"
              accounts={accounts}
              value={filters.account}
              onChange={(value) => updateFilter("account", value)}
              placeholder="All Accounts"
              panelTitle="Filter by Account"
              clearLabel="All Accounts"
            />

          </div>

          {activeFilterCount > 0 && (
            <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={clearPanelFilters}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
                <X size={14} /> Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      <Table
        columns={columns}
        data={entries}
        loading={isLoading}
        rowKey={(entry) => entry._id}
        page={pagination.page || currentPage}
        pageSize={limit}
        totalItems={pagination.total || 0}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        paginationDisabled={isLoading}
        itemLabel="entries"
        minWidth="min-w-[900px]"
        emptyIcon={BookOpen}
        emptyMessage="No journal entries"
        emptyDescription={
          hasCustomFilters || searchTerm
            ? "No entries match the current filters. Try widening the date range or clearing the search."
            : `Nothing was posted between ${formatDisplayDate(
                filters.dateFrom,
              )} and ${formatDisplayDate(filters.dateTo)}.`
        }
        emptyAction={
          (hasCustomFilters || searchTerm) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchInput("");
                clearFilters();
              }}
              className="border-slate-300 text-slate-700 hover:bg-slate-50">
              Reset to this month
            </Button>
          )
        }
        // Date range and sort are the controls people reach for on nearly
        // every visit, so they sit on the table itself rather than inside
        // the collapsible filter panel. The default month range also hides
        // older entries, which this keeps in plain sight.
        toolbar={
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 xl:flex-row xl:items-end">
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Picks a whole month in one go; reads "Custom range" once
                  either date is edited by hand. */}
              <Select
                label="Month"
                placeholder="Custom range"
                options={[{ value: ALL_DATES, label: "All dates" }, ...monthOptions]}
                value={
                  selectedMonth ||
                  (!filters.dateFrom && !filters.dateTo ? ALL_DATES : "")
                }
                onChange={(e) => handleMonthChange(e.target.value)}
                icon={CalendarRange}
              />

              <DatePicker
                label="From Date"
                value={filters.dateFrom}
                onChange={(value) => updateFilter("dateFrom", value)}
                error={hasInvalidRange ? "Must be before To Date" : ""}
              />

              <DatePicker
                label="To Date"
                value={filters.dateTo}
                onChange={(value) => updateFilter("dateTo", value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Select
                label="Sort By"
                options={SORT_OPTIONS}
                value={sort.sortBy}
                onChange={(e) => {
                  resetPage();
                  setSort((prev) => ({ ...prev, sortBy: e.target.value }));
                }}
                className="min-w-44"
              />

              <button
                type="button"
                onClick={() => {
                  resetPage();
                  setSort((prev) => ({
                    ...prev,
                    sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
                  }));
                }}
                title={
                  sort.sortOrder === "asc"
                    ? "Sorted ascending — click for descending"
                    : "Sorted descending — click for ascending"
                }
                aria-label={
                  sort.sortOrder === "asc"
                    ? "Sorted ascending, click to sort descending"
                    : "Sorted descending, click to sort ascending"
                }
                className="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50">
                {sort.sortOrder === "asc" ? (
                  <ArrowUpNarrowWide size={16} />
                ) : (
                  <ArrowDownWideNarrow size={16} />
                )}
                {sort.sortOrder === "asc" ? "Asc" : "Desc"}
              </button>

              {isRangeCustomised && (
                <button
                  type="button"
                  onClick={resetDateRange}
                  title="Reset to this month"
                  aria-label="Reset date range to this month"
                  className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
                  <X size={14} /> This month
                </button>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}
