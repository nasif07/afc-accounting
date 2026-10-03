import {
  AlertCircle,
  Coins,
  FileText,
  Plus,
  ReceiptText,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { createPettyCash, clearError } from "../store/slices/pettyCashSlice";
import { fetchCoa } from "../store/slices/coaSlice";
import {
  usePettyCashHistory,
  PETTY_CASH_HISTORY_KEY,
  EMPTY_PETTY_CASH_SUMMARY,
  emptyPettyCashPagination,
} from "../hooks/usePettyCashHistory";
import SectionHeader from "../components/common/SectionHeader";
import { Modal, Badge } from "../components/common";
import Input from "../components/common/Input";
import AccountCombobox from "../components/common/AccountCombobox";
import Button from "../components/common/Button";
import DatePicker from "../components/common/DatePicker";
import Table from "../components/common/Table";
import { usePaginationParams } from "../hooks/usePaginationParams";
import KPICard from "../components/reports/KPICard";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { formatCurrency } from "../utils/currency";
import { todayISO, firstDayOfCurrentMonth, formatDisplayDate } from "../utils/date";
import { getErrorMessage } from "../utils/errors";

const PETTY_CASH_ACCOUNT_CODE = "1001";
const DEFAULT_PAGE_SIZE = 20;

const initialFormData = {
  date: todayISO(),
  description: "",
  amount: "",
  paidTo: "",
  expenseAccount: "",
  referenceNumber: "",
};

// ── Zod validation schema ────────────────────────────────────────────────────
// Mirrors backend/src/validation/pettycash.validation.js's createPettyCashBody.
// Messages preserve the exact wording of the manual validateForm() this
// replaces (which already matched the backend's rules) rather than the
// backend's own slightly different message text, since these are the
// client-blocking messages users already see today.
const pettyCashSchema = z.object({
  date: z.string().min(1, "Date is required."),
  description: z.string().trim().min(1, "Description is required."),
  amount: z.coerce.number().positive("Amount must be greater than 0."),
  paidTo: z.string().trim().optional(),
  expenseAccount: z.string().min(1, "Please select an expense account."),
  referenceNumber: z.string().trim().optional(),
});

// The list opens on the current calendar month to date — the 1st through
// today — rather than a rolling 30-day window or the whole ledger. Petty cash
// is reconciled and reported per month, so the figures on screen line up with
// the month being closed and with the report page, Bank Book and Bank
// Reconciliation, which all default to the same window.
const defaultDateRange = () => ({ from: firstDayOfCurrentMonth(), to: todayISO() });

const formatDate = (date) => {
  if (!date) return "---";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "---";
  return parsed.toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function PettyCash() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { loading: pettyCashSaving, error } = useSelector(
    (state) => state.pettyCash,
  );
  const { items: accounts = [] } = useSelector((state) => state.coa);
  const { user } = useSelector((state) => state.auth);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState(() => defaultDateRange().from);
  const [dateTo, setDateTo] = useState(() => defaultDateRange().to);
  const [showModal, setShowModal] = useState(false);

  const {
    page: currentPage,
    pageSize,
    setPage,
    setPageSize,
    resetPage,
  } = usePaginationParams(DEFAULT_PAGE_SIZE);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(pettyCashSchema), defaultValues: initialFormData });

  // Filters live in the query key (see usePettyCashHistory) — React Query
  // cancels the in-flight request automatically when they change, so a fast
  // typer or rapid date-filter toggle can no longer have a stale response
  // land after a fresher one and overwrite the screen.
  const historyQuery = usePettyCashHistory({
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    dateFrom,
    dateTo,
  });
  const transactions = historyQuery.data?.transactions || [];
  const summary = historyQuery.data?.summary || EMPTY_PETTY_CASH_SUMMARY;
  const pagination = historyQuery.data?.pagination || emptyPettyCashPagination(pageSize);
  const pettyCashAccount = historyQuery.data?.account || null;
  const historyLoading = historyQuery.isLoading && !historyQuery.data;
  const historyError = historyQuery.isError
    ? getErrorMessage(historyQuery.error, "Failed to load petty cash history")
    : "";

  // The list defaults to the current month to date, but the backend derives
  // summary.balance purely from the rows it returns (no opening balance is
  // carried into the range), so the filtered summary is period movement, not
  // the account's standing balance. This second, deliberately unfiltered
  // request keeps the "Current Balance" KPI equal to the COA figure for
  // account 1001 regardless of which range is selected; limit 1 keeps the
  // payload small since only its summary is used.
  const balanceQuery = usePettyCashHistory({
    page: 1,
    limit: 1,
    search: "",
    dateFrom: "",
    dateTo: "",
  });
  const overallSummary = balanceQuery.data?.summary || EMPTY_PETTY_CASH_SUMMARY;

  // Every figure on this page except "Current Balance" is scoped to the date
  // filter, so the active window is spelled out next to each of them rather
  // than left to be inferred from the two date inputs.
  const periodLabel = useMemo(() => {
    const from = dateFrom ? formatDisplayDate(dateFrom) : "the beginning";
    const to = dateTo ? formatDisplayDate(dateTo) : "today";
    return `${from} — ${to}`;
  }, [dateFrom, dateTo]);

  // Same footer treatment the "Current Balance" card uses for its "all time"
  // note, so the period-scoped cards read as a set against it.
  const periodFooter = (
    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
      {periodLabel}
    </p>
  );

  const canCreatePettyCash =
    user?.role === "director" ||
    user?.role === "accountant" ||
    user?.role === "sub-accountant";

  const expenseAccounts = useMemo(() => {
    return accounts.filter((account) => account.accountType === "expense");
  }, [accounts]);

  useEffect(() => {
    dispatch(fetchCoa());
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      resetPage();
      setSearchTerm(searchInput.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, resetPage]);

  useEffect(() => {
    resetPage();
  }, [dateFrom, dateTo, resetPage]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const resetForm = () => {
    reset(initialFormData);
  };

  const handleOpenModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const onSubmit = async (data) => {
    try {
      await dispatch(createPettyCash(data)).unwrap();
      toast.success("Petty cash expense posted to journal successfully.");

      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: PETTY_CASH_HISTORY_KEY });
    } catch (err) {
      const fieldErrors = err?.errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        fieldErrors.forEach(({ field, message }) => {
          if (field) setError(field, { type: "server", message });
        });
        return;
      }
      toast.error(getErrorMessage(err));
    }
  };

  // Reset returns to the default current-month-to-date window, not an empty
  // range, so "Reset" and a fresh page load always show the same thing.
  const handleResetFilters = () => {
    const { from, to } = defaultDateRange();
    setSearchInput("");
    setSearchTerm("");
    setDateFrom(from);
    setDateTo(to);
    resetPage();
  };

  const isLoading = historyLoading;
  const isFetchingHistory = historyQuery.isFetching;

  // Column definitions drive both the desktop table and the mobile cards.
  // The truncating text columns keep their hover tooltips; on mobile the
  // card shows the full value, where there is no hover to reveal it.
  const truncatedWithTooltip = (value) =>
    value ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block w-full cursor-default truncate text-left">
            {value}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="start">
          {value}
        </TooltipContent>
      </Tooltip>
    ) : (
      "---"
    );

  const transactionColumns = [
    {
      key: "date",
      label: "Date",
      render: (value) => formatDate(value),
    },
    {
      key: "voucherNumber",
      label: "Voucher",
      primary: true,
      mono: true,
      className: "font-bold text-blue-600",
    },
    {
      key: "type",
      label: "Type",
      render: (_, item) => (
        <Badge variant={item.debit > 0 ? "success" : "rose"} size="sm">
          {item.type === "deposit" ? "Deposit" : "Expense"}
        </Badge>
      ),
    },
    {
      key: "description",
      label: "Description",
      className: "max-w-xs",
      render: (value, item) => (
        <>
          {truncatedWithTooltip(value)}
          {item.referenceNumber && (
            <span className="mt-1 block text-xs text-slate-400">
              Ref: {item.referenceNumber}
            </span>
          )}
        </>
      ),
    },
    {
      key: "counterparty",
      label: "Account",
      className: "max-w-xs",
      render: (value) => truncatedWithTooltip(value),
    },
    {
      key: "debit",
      label: "Money In",
      align: "right",
      mono: true,
      className: "font-semibold text-emerald-700",
      render: (value) => (value > 0 ? formatCurrency(value) : "---"),
    },
    {
      key: "credit",
      label: "Money Out",
      align: "right",
      mono: true,
      className: "font-semibold text-rose-700",
      render: (value) => (value > 0 ? formatCurrency(value) : "---"),
    },
    {
      key: "runningBalance",
      label: "Balance",
      align: "right",
      mono: true,
      className: "font-bold text-slate-900",
      render: (value) => formatCurrency(value),
    },
    {
      key: "sourceModule",
      label: "Source",
      className: "capitalize text-slate-500",
      render: (value) => String(value).replace(/_/g, " "),
    },
  ];

  return (
    <div className="space-y-4 pb-10">
      <SectionHeader
        icon={Coins}
        title="Petty Cash Management"
        description={`Journal-based petty cash account (${PETTY_CASH_ACCOUNT_CODE}) · Showing ${periodLabel}`}
        buttonText={canCreatePettyCash ? "Create Transaction" : ""}
        onButtonClick={handleOpenModal}
        buttonIcon={Plus}
      />

      {!isLoading && !historyError && !pettyCashAccount && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Petty Cash account code {PETTY_CASH_ACCOUNT_CODE} was not found in
          Chart of Accounts.
        </div>
      )}

      {historyError && (
        <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{historyError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Current Balance"
          value={overallSummary.balance}
          icon={Coins}
          color={overallSummary.balanceType === "credit" ? "rose" : "slate"}
          footer={
            <p
              className={`mt-2 text-[11px] font-semibold uppercase tracking-wide sm:text-xs ${
                overallSummary.balanceType === "credit" ? "text-rose-600" : "text-slate-400"
              }`}
            >
              {overallSummary.balanceType === "credit"
                ? "Credit — overdrawn"
                : "Debit"}{" "}
              · all time
            </p>
          }
        />
        <KPICard
          title="Money In"
          value={summary.totalDebit}
          icon={TrendingUp}
          color="green"
          footer={periodFooter}
        />
        <KPICard
          title="Money Out"
          value={summary.totalCredit}
          icon={TrendingDown}
          color="rose"
          footer={periodFooter}
        />
        <KPICard
          title="Transactions"
          value={summary.count}
          format="text"
          icon={ReceiptText}
          color="blue"
          footer={periodFooter}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_170px_170px_auto]">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <Input
              type="text"
              placeholder="Search voucher, reference, description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:contents">
            <DatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="From date"
              aria-label="Filter from date"
            />

            <DatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="To date"
              aria-label="Filter to date"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 lg:w-auto">
            Reset
          </Button>
        </div>
      </div>

      <Table
        columns={transactionColumns}
        data={transactions}
        loading={isLoading}
        rowKey={(item) => `${item.id}-${item.debit}-${item.credit}`}
        page={pagination.page || currentPage}
        pageSize={pageSize}
        totalItems={pagination.total || 0}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        paginationDisabled={isLoading || isFetchingHistory}
        itemLabel="approved transactions"
        minWidth="min-w-[980px]"
        emptyIcon={Coins}
        emptyMessage="No petty cash transactions"
        emptyDescription={
          searchTerm || dateFrom || dateTo
            ? "No approved journal lines match the current filters. Widen the date range or clear the search."
            : `Manual deposits and auto-posted expenses will appear here after journal entries touch account ${PETTY_CASH_ACCOUNT_CODE}.`
        }
        emptyAction={
          (searchTerm || dateFrom || dateTo) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="border-slate-300 text-slate-700 hover:bg-slate-50">
              Reset filters
            </Button>
          )
        }
        toolbar={
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Transaction History
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Deposits and expenses are read only from approved journal lines.
              </p>
              <p className="mt-1 text-xs text-slate-400">Showing {periodLabel}</p>
            </div>

            <Link
              to="/dashboard/petty-cash/report"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <FileText size={16} />
              Report
            </Link>
          </div>
        }
      />

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title="New Petty Cash Expense"
          description={`This creates an auto-approved journal entry that credits petty cash account ${PETTY_CASH_ACCOUNT_CODE}.`}
          size="2xl">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Date"
                    value={field.value}
                    onChange={field.onChange}
                    required
                    disabled={isSubmitting || pettyCashSaving}
                    error={errors.date?.message}
                  />
                )}
              />

              <Input
                label="Amount"
                type="number"
                placeholder="0.00"
                required
                min="0.01"
                step="0.01"
                disabled={isSubmitting || pettyCashSaving}
                error={errors.amount?.message}
                touched={!!errors.amount}
                {...register("amount")}
              />
            </div>

            <Input
              label="Description"
              placeholder="Describe the petty cash expense"
              required
              textarea
              rows={3}
              disabled={isSubmitting || pettyCashSaving}
              error={errors.description?.message}
              touched={!!errors.description}
              {...register("description")}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Controller
                name="expenseAccount"
                control={control}
                render={({ field }) => (
                  <AccountCombobox
                    label="Expense Account"
                    required
                    disabled={isSubmitting || pettyCashSaving}
                    name={field.name}
                    accounts={expenseAccounts}
                    value={field.value || ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.expenseAccount?.message}
                    touched={!!errors.expenseAccount}
                  />
                )}
              />
              <Input
                label="Paid To"
                placeholder="Person who received cash"
                disabled={isSubmitting || pettyCashSaving}
                {...register("paidTo")}
              />
            </div>

            <Input
              label="Reference Number"
              placeholder="Optional reference number"
              disabled={isSubmitting || pettyCashSaving}
              {...register("referenceNumber")}
            />

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 sm:w-auto">
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || pettyCashSaving}
                loading={isSubmitting || pettyCashSaving}>
                {isSubmitting || pettyCashSaving
                  ? "Posting..."
                  : "Post Expense"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
