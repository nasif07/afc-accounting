import React, { useState, useEffect } from "react";
import { Plus, X, ShieldCheck } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchLeafAccounts } from "../../store/slices/accountSlice";
import BookEntryRow from "./BookEntryRow";
import BalanceSummary from "./BalanceSummary";
import { toast } from "sonner";

import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";
import DatePicker from "../common/DatePicker";
import Modal from "../common/Modal";
import { SectionSkeleton } from "../common/Loaders";
import { todayISO, toISODate, formatDisplayDate } from "../../utils/date";

const DynamicJournalForm = ({
  onSubmit,
  onCancel,
  isLoading: isSubmitting = false,
  initialData = null,
}) => {
  const dispatch = useDispatch();

  const { leafAccounts, isLoading: isLoadingAccounts } = useSelector(
    (state) => state.accounts,
  );

  // Fetch leaf accounts
  useEffect(() => {
    dispatch(fetchLeafAccounts());
  }, [dispatch]);

  // ==============================
  // FORM STATES
  // ==============================

  const [voucherDate, setVoucherDate] = useState(
    toISODate(initialData?.voucherDate) || todayISO(),
  );

  const [transactionType, setTransactionType] = useState(
    initialData?.transactionType || "journal-entry",
  );

  const [description, setDescription] = useState(
    initialData?.description || "",
  );

  const [requiresApproval, setRequiresApproval] = useState(
    initialData ? initialData.approvalStatus === "pending" : false,
  );

  const [bookEntries, setBookEntries] = useState(() => {
    const normalize = (e) => ({
      ...e,
      debit: e.debit || "",
      credit: e.credit || "",
    });
    return initialData?.bookEntries
      ? initialData.bookEntries.map(normalize)
      : [
          { account: "", debit: "", credit: "", description: "" },
          { account: "", debit: "", credit: "", description: "" },
        ];
  });

  const [errors, setErrors] = useState({});
  const [confirmPayload, setConfirmPayload] = useState(null);

  // ==============================
  // BALANCE CALCULATION
  // ==============================

  const totalDebit = bookEntries.reduce(
    (sum, entry) => sum + (parseFloat(entry.debit) || 0),
    0,
  );

  const totalCredit = bookEntries.reduce(
    (sum, entry) => sum + (parseFloat(entry.credit) || 0),
    0,
  );

  const isBalanced =
    Math.abs(totalDebit - totalCredit) < 0.01 &&
    totalDebit > 0 &&
    totalCredit > 0;

  // ==============================
  // VALIDATION
  // ==============================

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!voucherDate) {
      toast.error("Voucher date is required");
      isValid = false;
    }

    if (bookEntries.length < 2) {
      toast.error("Journal entry must have at least 2 line items");
      return false;
    }

    bookEntries.forEach((entry, idx) => {
      const entryErrors = [];

      if (!entry.account) {
        entryErrors.push("Account is required");
        isValid = false;
      }

      const debit = parseFloat(entry.debit) || 0;
      const credit = parseFloat(entry.credit) || 0;

      if (debit > 0 && credit > 0) {
        entryErrors.push("Cannot have both debit and credit");
        isValid = false;
      }

      if (debit === 0 && credit === 0) {
        entryErrors.push("Must have either debit or credit");
        isValid = false;
      }

      if (entryErrors.length > 0) {
        newErrors[idx] = entryErrors;
      }
    });

    if (!isBalanced) {
      if (totalDebit === 0) {
        toast.error("Journal entry cannot be empty");
      } else {
        toast.error("Journal entry must be balanced");
      }

      return false;
    }

    setErrors(newErrors);

    return isValid;
  };

  // ==============================
  // ROW HANDLERS
  // ==============================

  const handleRowUpdate = (rowIndex, updatedEntry) => {
    const newEntries = [...bookEntries];
    newEntries[rowIndex] = updatedEntry;
    setBookEntries(newEntries);
  };

  const handleRowRemove = (rowIndex) => {
    if (bookEntries.length <= 2) {
      toast.error("Journal entry must have at least 2 line items");
      return;
    }

    setBookEntries(bookEntries.filter((_, idx) => idx !== rowIndex));
  };

  const handleAddRow = () => {
    setBookEntries([
      ...bookEntries,
      { account: "", debit: "", credit: "", description: "" },
    ]);
  };

  // ==============================
  // SUBMIT
  // ==============================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const payload = {
      voucherDate,
      transactionType,
      description,
      requiresApproval,
      bookEntries,
    };

    if (!initialData) {
      setConfirmPayload(payload);
      return;
    }

    await onSubmit(payload);
  };

  const handleConfirm = async () => {
    await onSubmit(confirmPayload);
    setConfirmPayload(null);
  };

  const getAccountName = (accountId) => {
    const acc = leafAccounts.find((a) => a._id === accountId);
    if (!acc) return accountId;
    return acc.accountCode ? `${acc.accountCode} - ${acc.accountName}` : acc.accountName;
  };

  // ==============================
  // LOADING
  // ==============================

  if (isLoadingAccounts) {
    return <SectionSkeleton rows={6} />;
  }

  // ==============================
  // UI
  // ==============================

  return (
    <>
    <form onSubmit={handleSubmit} className="relative space-y-4">
      {/* Close Button */}
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="absolute right-2 top-2">
          <X size={16} />
        </Button>
      )}

      {/* Voucher Details */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold">Voucher Details</h2>

        <div className="grid gap-3 md:grid-cols-3">
          <DatePicker
            label="Voucher Date"
            value={voucherDate}
            onChange={setVoucherDate}
            required
            disabled={isSubmitting}
          />

          <Select
            label="Transaction Type"
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            options={[
              {
                value: "journal-entry",
                label: "Journal Entry",
              },
              {
                value: "receipt",
                label: "Receipt",
              },
              {
                value: "payment",
                label: "Payment",
              },
              {
                value: "transfer",
                label: "Transfer",
              },
            ]}
          />

          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {/* Book Entries */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold">Book Entries</h2>

        {bookEntries.map((entry, idx) => (
          <BookEntryRow
            key={idx}
            rowIndex={idx}
            entry={entry}
            leafAccounts={leafAccounts}
            onUpdate={handleRowUpdate}
            onRemove={handleRowRemove}
            errors={errors}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={handleAddRow}
          className="mt-3"
          icon={Plus}>
          Add Row
        </Button>
      </div>

      {/* Approval Settings */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-600" />

          <h2 className="text-sm font-bold">Approval Settings</h2>
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={requiresApproval}
            onChange={(e) => setRequiresApproval(e.target.checked)}
            className="mt-1 h-4 w-4"
          />

          <div>
            <p className="text-sm font-medium text-slate-700">
              Require Director Approval
            </p>

            <p className="mt-1 text-xs text-slate-500">
              If enabled, this journal entry will be sent for director approval
              before posting. Otherwise it will be automatically approved and
              posted instantly.
            </p>
          </div>
        </label>
      </div>

      {/* Balance Summary */}
      <BalanceSummary
        totalDebit={totalDebit}
        totalCredit={totalCredit}
        isBalanced={isBalanced}
      />

      {/* Submit */}
      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={!isBalanced || isSubmitting}
          loading={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Entry"}
        </Button>
      </div>
    </form>

    {/* ── Confirmation Modal (new entries only) ── */}
    <Modal
      isOpen={!!confirmPayload}
      onClose={() => setConfirmPayload(null)}
      title="Confirm Journal Entry"
      description="Review all details carefully before creating this entry."
      size="lg"
    >
      {confirmPayload && (
        <div className="space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDisplayDate(confirmPayload.voucherDate)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transaction Type</p>
              <p className="mt-1 text-sm font-semibold capitalize text-slate-800">
                {confirmPayload.transactionType?.replace(/-/g, " ")}
              </p>
            </div>
            {confirmPayload.description && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</p>
                <p className="mt-1 text-sm text-slate-700">{confirmPayload.description}</p>
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Debit entries */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Debit Accounts
            </p>
            <div className="overflow-hidden rounded-xl border border-slate-100">
              {confirmPayload.bookEntries
                .filter((e) => parseFloat(e.debit) > 0)
                .map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-slate-50 px-4 py-2.5 last:border-0">
                    <span className="text-sm text-slate-700">{getAccountName(e.account)}</span>
                    <span className="font-mono text-sm font-semibold text-slate-900">
                      ৳{Number(e.debit).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Credit entries */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-rose-500">
              Credit Accounts
            </p>
            <div className="overflow-hidden rounded-xl border border-slate-100">
              {confirmPayload.bookEntries
                .filter((e) => parseFloat(e.credit) > 0)
                .map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-slate-50 px-4 py-2.5 last:border-0">
                    <span className="text-sm text-slate-700">{getAccountName(e.account)}</span>
                    <span className="font-mono text-sm font-semibold text-slate-900">
                      ৳{Number(e.credit).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Totals */}
          <div className="flex justify-between rounded-xl bg-slate-50 px-5 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Debit</p>
              <p className="mt-0.5 font-mono text-base font-bold text-slate-900">
                ৳{totalDebit.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Credit</p>
              <p className="mt-0.5 font-mono text-base font-bold text-slate-900">
                ৳{totalCredit.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => setConfirmPayload(null)}
              disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              loading={isSubmitting}>
              Confirm &amp; Create
            </Button>
          </div>
        </div>
      )}
    </Modal>
    </>
  );
};

export default DynamicJournalForm;
