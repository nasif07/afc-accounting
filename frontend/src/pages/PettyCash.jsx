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
import Select from "../components/common/Select";
import Button from "../components/common/Button";
import DatePicker from "../components/common/DatePicker";
import { TableSkeleton } from "../components/common/Loaders";
import KPICard from "../components/reports/KPICard";
import { formatCurrency } from "../utils/currency";
import { todayISO } from "../utils/date";
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

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
    limit: DEFAULT_PAGE_SIZE,
    search: searchTerm,
    dateFrom,
    dateTo,
  });
  const transactions = historyQuery.data?.transactions || [];
  const summary = historyQuery.data?.summary || EMPTY_PETTY_CASH_SUMMARY;
  const pagination = historyQuery.data?.pagination || emptyPettyCashPagination(DEFAULT_PAGE_SIZE);
  const pettyCashAccount = historyQuery.data?.account || null;
  const historyLoading = historyQuery.isLoading && !historyQuery.data;
  const historyError = historyQuery.isError
    ? getErrorMessage(historyQuery.error, "Failed to load petty cash history")
    : "";

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
      setCurrentPage(1);
      setSearchTerm(searchInput.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo]);

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

  const handleResetFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const isLoading = historyLoading;
  const isFetchingHistory = historyQuery.isFetching;

  return (
    <div className="space-y-4 pb-10">
      <SectionHeader
        icon={Coins}
        title="Petty Cash Management"
        description={`Journal-based petty cash account (${PETTY_CASH_ACCOUNT_CODE})`}
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
        <KPICard title="Current Balance" value={summary.balance} icon={Coins} color="slate" />
        <KPICard title="Money In" value={summary.totalDebit} icon={TrendingUp} color="green" />
        <KPICard title="Money Out" value={summary.totalCredit} icon={TrendingDown} color="rose" />
        <KPICard title="Transactions" value={summary.count} format="text" icon={ReceiptText} color="blue" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <Input
              type="text"
              placeholder="Search voucher, reference, description, or account..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>

          <DatePicker value={dateFrom} onChange={setDateFrom} />

          <DatePicker value={dateTo} onChange={setDateTo} />

          <Button
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            className="border-slate-300 text-slate-700 hover:bg-slate-50">
            Reset
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Transaction History
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Deposits and expenses are read only from approved journal lines.
            </p>
          </div>

          <Link
            to="/dashboard/petty-cash/report"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <FileText size={16} />
            Report
          </Link>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <TableSkeleton rows={8} columns={7} />
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
              <Coins className="h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                No petty cash transactions
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Manual deposits and auto-posted expenses will appear here after
                journal entries touch account {PETTY_CASH_ACCOUNT_CODE}.
              </p>
            </div>
          ) : (
            <table className="min-w-[980px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Date",
                    "Voucher",
                    "Type",
                    "Description",
                    "Account",
                    "Money In",
                    "Money Out",
                    "Balance",
                    "Source",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                        ["Money In", "Money Out", "Balance"].includes(heading)
                          ? "text-right"
                          : ""
                      }`}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {transactions.map((item) => (
                  <tr key={`${item.id}-${item.debit}-${item.credit}`}>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {formatDate(item.date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-sm font-bold text-blue-600">
                      {item.voucherNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Badge variant={item.debit > 0 ? "success" : "rose"} size="sm">
                        {item.type === "deposit" ? "Deposit" : "Expense"}
                      </Badge>
                    </td>
                    <td className="max-w-xs px-4 py-4 text-sm text-slate-700">
                      <div className="truncate">
                        {item.description || "---"}
                      </div>
                      {item.referenceNumber && (
                        <div className="mt-1 text-xs text-slate-400">
                          Ref: {item.referenceNumber}
                        </div>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-4 text-sm text-slate-600">
                      {item.counterparty}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-semibold text-emerald-700">
                      {item.debit > 0 ? formatCurrency(item.debit) : "---"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-semibold text-rose-700">
                      {item.credit > 0 ? formatCurrency(item.credit) : "---"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-bold text-slate-900">
                      {formatCurrency(item.runningBalance)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm capitalize text-slate-500">
                      {String(item.sourceModule).replace(/_/g, " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:flex-row">
            <p className="text-sm text-slate-500">
              Showing page{" "}
              <span className="font-semibold text-slate-700">
                {pagination.page}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {pagination.totalPages}
              </span>{" "}
              for{" "}
              <span className="font-semibold text-slate-700">
                {pagination.total}
              </span>{" "}
              approved transactions
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={pagination.page <= 1 || isLoading || isFetchingHistory}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                Prev
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(pagination.totalPages, page + 1),
                  )
                }
                disabled={pagination.page >= pagination.totalPages || isLoading || isFetchingHistory}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

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
              <Select
                label="Expense Account"
                required
                disabled={isSubmitting || pettyCashSaving}
                placeholder="Select expense account"
                options={expenseAccounts.map((account) => ({
                  label: `${account.accountCode} - ${account.accountName}`,
                  value: account._id,
                }))}
                error={errors.expenseAccount?.message}
                touched={!!errors.expenseAccount}
                {...register("expenseAccount")}
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
