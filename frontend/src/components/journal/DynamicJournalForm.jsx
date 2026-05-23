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
import { SectionSkeleton } from "../common/Loaders";
import { todayISO, toISODate } from "../../utils/date";

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

  const [bookEntries, setBookEntries] = useState(
    initialData?.bookEntries || [
      {
        account: "",
        debit: 0,
        credit: 0,
        description: "",
      },
      {
        account: "",
        debit: 0,
        credit: 0,
        description: "",
      },
    ],
  );

  const [errors, setErrors] = useState({});

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
      {
        account: "",
        debit: 0,
        credit: 0,
        description: "",
      },
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

    await onSubmit(payload);
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
  );
};

export default DynamicJournalForm;
