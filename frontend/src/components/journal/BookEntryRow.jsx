import React from "react";
import { useFormContext } from "react-hook-form";
import { Trash2, AlertCircle, Landmark, FileText, Banknote } from "lucide-react";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";

const BookEntryRow = ({ index, leafAccounts, onRemove }) => {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext();

  const rowErrors = errors.bookEntries?.[index] || {};
  const rowErrorMessages = [
    rowErrors.account?.message,
    rowErrors.debit?.message,
    rowErrors.credit?.message,
  ].filter(Boolean);
  const hasError = rowErrorMessages.length > 0;

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
            icon={Landmark}
            options={accountOptions}
            placeholder="Select Account"
            required
            className={rowErrors.account ? "border-red-300" : ""}
            {...register(`bookEntries.${index}.account`)}
          />
        </div>

        <div className="md:col-span-3">
          <Input
            label="Description"
            type="text"
            icon={FileText}
            placeholder="Row description"
            {...register(`bookEntries.${index}.description`)}
          />
        </div>

        <div className="md:col-span-2">
          <Input
            label="Debit"
            type="text"
            inputMode="decimal"
            icon={Banknote}
            placeholder="0.00"
            error={rowErrors.debit?.message}
            touched={!!rowErrors.debit}
            {...register(`bookEntries.${index}.debit`, {
              onChange: (e) => {
                const parsed = parseFloat(e.target.value);
                if (!isNaN(parsed) && parsed > 0) {
                  setValue(`bookEntries.${index}.credit`, "");
                }
              },
            })}
          />
        </div>

        <div className="md:col-span-2">
          <Input
            label="Credit"
            type="text"
            inputMode="decimal"
            icon={Banknote}
            placeholder="0.00"
            error={rowErrors.credit?.message}
            touched={!!rowErrors.credit}
            {...register(`bookEntries.${index}.credit`, {
              onChange: (e) => {
                const parsed = parseFloat(e.target.value);
                if (!isNaN(parsed) && parsed > 0) {
                  setValue(`bookEntries.${index}.debit`, "");
                }
              },
            })}
          />
        </div>

        <div className="md:col-span-2 flex items-end">
          <Button
            type="button"
            variant="outline"
            onClick={onRemove}
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
            {rowErrorMessages.map((error, idx) => (
              <p key={idx}>{error}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookEntryRow;