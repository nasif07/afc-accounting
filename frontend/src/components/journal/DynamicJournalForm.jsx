import React, { useState } from "react";
import { Plus, Loader, X } from "lucide-react";
import BookEntryRow from "./BookEntryRow";
import BalanceSummary from "./BalanceSummary";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { toast } from "sonner";

import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";

const DynamicJournalForm = ({
  onSubmit,
  onCancel,
  isLoading: isSubmitting = false,
  initialData = null,
}) => {
  const [voucherDate, setVoucherDate] = useState(
    initialData?.voucherDate || new Date().toISOString().split("T")[0],
  );
  const [transactionType, setTransactionType] = useState(
    initialData?.transactionType || "journal-entry",
  );
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [bookEntries, setBookEntries] = useState(
    initialData?.bookEntries || [
      { account: "", debit: 0, credit: 0, description: "" },
      { account: "", debit: 0, credit: 0, description: "" },
    ],
  );
  const [errors, setErrors] = useState({});

  const { data: leafAccounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["leafAccounts"],
    queryFn: async () => {
      const response = await api.get("/accounts/leaf-nodes");
      return response.data.data || [];
    },
  });

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

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

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

      const d = parseFloat(entry.debit) || 0;
      const c = parseFloat(entry.credit) || 0;

      if (d > 0 && c > 0) {
        entryErrors.push("Cannot have both debit and credit");
        isValid = false;
      }

      if (d === 0 && c === 0) {
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
        toast.error("Journal entry must be balanced (Debits = Credits)");
      }
      return false;
    }

    setErrors(newErrors);
    return isValid;
  };

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
      { account: "", debit: 0, credit: 0, description: "" },
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      voucherDate,
      transactionType,
      description,
      bookEntries,
    };

    await onSubmit(payload);
  };

  if (isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader className="animate-spin text-red-600" size={20} />
        <span className="ml-2 text-sm text-slate-600">
          Loading accounts...
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 relative">
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="absolute right-2 top-2"
        >
          <X size={16} />
        </Button>
      )}

      {/* Voucher Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-sm font-bold text-slate-900 mb-3">
          Voucher Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Voucher Date"
            type="date"
            value={voucherDate}
            onChange={(e) => setVoucherDate(e.target.value)}
            required
          />

          <Select
            label="Transaction Type"
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            required
            options={[
              { value: "journal-entry", label: "Journal Entry" },
              { value: "receipt", label: "Receipt" },
              { value: "payment", label: "Payment" },
              { value: "transfer", label: "Transfer" },
            ]}
          />

          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
          />
        </div>
      </div>

      {/* Entries */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-sm font-bold text-slate-900 mb-3">
          Book Entries
        </h2>

        <div className="space-y-1">
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
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddRow}
          className="mt-3"
          icon={Plus}
        >
          Add Row
        </Button>
      </div>

      <BalanceSummary
        totalDebit={totalDebit}
        totalCredit={totalCredit}
        isBalanced={isBalanced}
      />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={!isBalanced || isSubmitting}
          loading={isSubmitting}
        >
          Create Journal Entry
        </Button>
      </div>
    </form>
  );
};

export default DynamicJournalForm;