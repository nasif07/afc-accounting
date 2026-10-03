import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Trash2, AlertCircle, Landmark, FileText, Banknote } from "lucide-react";
import Input from "../common/Input";
import AccountCombobox from "../common/AccountCombobox";
import Button from "../common/Button";

const BookEntryRow = ({ index, leafAccounts, onRemove, readOnly = false }) => {
  const {
    control,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const rowErrors = errors.bookEntries?.[index] || {};
  const rowErrorMessages = [
    rowErrors.account?.message,
    rowErrors.debit?.message,
    rowErrors.credit?.message,
  ].filter(Boolean);
  const hasError = rowErrorMessages.length > 0;

  // Read-only mode (editing an existing entry): a line's account and its
  // debit/credit amounts are permanently immutable — corrections go through a
  // reversing entry. These are rendered as plain text rather than disabled
  // inputs on purpose: a disabled input is still a form control someone can
  // re-enable in devtools, and it reads as "temporarily unavailable" when the
  // truth is "never editable". Only the description stays a real input.
  if (readOnly) {
    const accountId = watch(`bookEntries.${index}.account`);
    const account = (leafAccounts || []).find((item) => item._id === accountId);
    const accountLabel = account
      ? `${account.accountCode} - ${account.accountName}`
      : accountId || "—";
    const debit = watch(`bookEntries.${index}.debit`);
    const credit = watch(`bookEntries.${index}.credit`);
    const amount = (value) =>
      value === "" || value == null || Number(value) === 0
        ? "—"
        : Number(value).toLocaleString("en-BD", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

    return (
      <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Account (locked)
            </p>
            <p className="text-sm font-semibold text-slate-700">{accountLabel}</p>
          </div>

          <div className="md:col-span-4">
            <Input
              label="Description"
              type="text"
              icon={FileText}
              placeholder="Row description"
              {...register(`bookEntries.${index}.description`)}
            />
          </div>

          <div className="md:col-span-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Debit (locked)
            </p>
            <p className="font-mono text-sm font-bold text-slate-700">
              {amount(debit)}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Credit (locked)
            </p>
            <p className="font-mono text-sm font-bold text-slate-700">
              {amount(credit)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    // data-book-entry-row lets the Alt+D shortcut in DynamicJournalForm work
    // out which row the focused field belongs to.
    <div
      data-book-entry-row={index}
      className={`mb-3 rounded-xl border p-3 sm:p-4 ${
        hasError ? "border-red-300 bg-red-50/60" : "border-slate-200 bg-white"
      }`}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <Controller
            name={`bookEntries.${index}.account`}
            control={control}
            render={({ field }) => (
              <AccountCombobox
                label="Account"
                icon={Landmark}
                name={field.name}
                accounts={leafAccounts || []}
                value={field.value || ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                required
                // The row already surfaces account errors in its own summary
                // banner below, so only the red border is wanted here — same
                // as the Select this replaces.
                invalid={!!rowErrors.account}
              />
            )}
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
            title="Remove this line (Alt + D)"
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