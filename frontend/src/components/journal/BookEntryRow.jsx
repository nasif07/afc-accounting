import React from "react";
import { Trash2, AlertCircle } from "lucide-react";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";

const BookEntryRow = ({
  rowIndex,
  entry,
  leafAccounts,
  onUpdate,
  onRemove,
  errors = {},
}) => {
  const handleAccountChange = (e) => {
    onUpdate(rowIndex, {
      ...entry,
      account: e.target.value,
    });
  };

  const handleDescriptionChange = (e) => {
    onUpdate(rowIndex, {
      ...entry,
      description: e.target.value,
    });
  };

  const handleDebitChange = (e) => {
    const value = e.target.value;
    const numValue = value === "" ? 0 : Number(value);

    onUpdate(rowIndex, {
      ...entry,
      debit: numValue,
      credit: numValue > 0 ? 0 : entry.credit,
    });
  };

  const handleCreditChange = (e) => {
    const value = e.target.value;
    const numValue = value === "" ? 0 : Number(value);

    onUpdate(rowIndex, {
      ...entry,
      credit: numValue,
      debit: numValue > 0 ? 0 : entry.debit,
    });
  };

  const rowError = errors[rowIndex];
  const hasError = rowError && rowError.length > 0;

  const accountOptions = (leafAccounts || []).map((account) => ({
    value: account._id,
    label: `${account.accountCode} - ${account.accountName}`,
  }));

  return (
    <div
      className={`mb-3 rounded-xl border p-3 sm:p-4 ${
        hasError ? "border-red-300 bg-red-50/60" : "border-slate-200 bg-white"
      }`}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <Select
            label="Account"
            value={entry.account ?? ""}
            onChange={handleAccountChange}
            options={accountOptions}
            placeholder="Select Account"
            required
            className={hasError && !entry.account ? "border-red-300" : ""}
          />
        </div>

        <div className="md:col-span-3">
          <Input
            label="Description"
            type="text"
            value={entry.description ?? ""}
            onChange={handleDescriptionChange}
            placeholder="Row description"
          />
        </div>

        <div className="md:col-span-2">
          <Input
            label="Debit"
            type="number"
            value={entry.debit ?? ""}
            onChange={handleDebitChange}
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>

        <div className="md:col-span-2">
          <Input
            label="Credit"
            type="number"
            value={entry.credit ?? ""}
            onChange={handleCreditChange}
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>

        <div className="md:col-span-2 flex items-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onRemove(rowIndex)}
            className="w-full border-red-200 text-red-600 hover:bg-red-50"
            icon={Trash2}
          >
            Remove
          </Button>
        </div>
      </div>

      {hasError && (
        <div className="mt-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            {rowError.map((error, idx) => (
              <p key={idx}>{error}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookEntryRow;