import React, { useEffect, useState } from "react";
import { Plus, X, ShieldCheck } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useForm, useFieldArray, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { formatCurrency } from "../../utils/currency";

// ── Rounding helper ──────────────────────────────────────────────────────────
// Flagged in docs/frontendreport.md: debit/credit inputs were raw, unrounded
// strings, and the overall balance check used a blunt <0.01 tolerance — so a
// genuine 1-cent mismatch (e.g. totals of 100.00 vs 100.005, which is really
// 100.01 once rounded) could be silently accepted as "balanced". Fixed by
// rounding every line to exactly 2 decimals before any comparison or
// submission, and tightening the balance tolerance to <0.001 — once every
// line is pre-rounded, only floating-point representation noise should
// remain, never real currency amounts. The `+ Number.EPSILON` guards against
// a separate, well-known Math.round quirk (Math.round(1.005 * 100) naively
// yields 100 instead of 101 due to binary float representation).
const roundToCents = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const toAmount = (v) => (v === "" || v == null ? 0 : roundToCents(v));
const BALANCE_EPSILON = 0.001;

const bookEntrySchema = z
  .object({
    account: z.string().min(1, "Account is required"),
    description: z.string().trim().optional(),
    debit: z.preprocess(toAmount, z.number().min(0, "Debit cannot be negative")),
    credit: z.preprocess(toAmount, z.number().min(0, "Credit cannot be negative")),
  })
  .refine((entry) => !(entry.debit > 0 && entry.credit > 0), {
    message: "Cannot have both debit and credit",
    path: ["credit"],
  })
  .refine((entry) => entry.debit > 0 || entry.credit > 0, {
    message: "Must have either debit or credit",
    path: ["debit"],
  });

const journalSchema = z
  .object({
    voucherDate: z.string().min(1, "Voucher date is required"),
    transactionType: z.enum(["journal-entry", "receipt", "payment", "transfer"]),
    description: z.string().trim().optional(),
    requiresApproval: z.boolean().optional(),
    bookEntries: z
      .array(bookEntrySchema)
      .min(2, "Journal entry must have at least 2 line items"),
  })
  .superRefine((data, ctx) => {
    const totalDebit = roundToCents(
      data.bookEntries.reduce((sum, e) => sum + e.debit, 0),
    );
    const totalCredit = roundToCents(
      data.bookEntries.reduce((sum, e) => sum + e.credit, 0),
    );
    const balanced =
      Math.abs(totalDebit - totalCredit) < BALANCE_EPSILON &&
      totalDebit > 0 &&
      totalCredit > 0;

    if (!balanced) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bookEntries"],
        message:
          totalDebit === 0
            ? "Journal entry cannot be empty"
            : "Journal entry must be balanced",
      });
    }
  });

const blankRow = { account: "", debit: "", credit: "", description: "" };

// initialData's bookEntries.account is a populated object ({_id, accountCode,
// accountName, accountType} — see accounting.service.js's .populate() calls),
// not a plain id string. The old code spread it through unchanged, so
// editing an existing entry silently left every Account <select> unmatched
// (comparing a string option value against an object), and re-submitting
// without touching those dropdowns would have sent the raw populated object
// back as `account`, which the backend's objectId schema rejects outright.
// Normalizing to a plain id string here — matching the same populated-ref
// pattern already handled in Accounts.jsx's parentAccount — fixes this.
const buildDefaultValues = (initialData) => ({
  voucherDate: toISODate(initialData?.voucherDate) || todayISO(),
  transactionType: initialData?.transactionType || "journal-entry",
  description: initialData?.description || "",
  requiresApproval: initialData ? initialData.approvalStatus === "pending" : false,
  bookEntries: initialData?.bookEntries?.length
    ? initialData.bookEntries.map((e) => ({
        account:
          typeof e.account === "object" && e.account !== null
            ? e.account?._id || ""
            : e.account || "",
        description: e.description || "",
        debit: e.debit || "",
        credit: e.credit || "",
      }))
    : [blankRow, blankRow],
});

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
  // FORM STATE (react-hook-form)
  // ==============================

  const methods = useForm({
    resolver: zodResolver(journalSchema),
    defaultValues: buildDefaultValues(initialData),
  });
  const {
    register,
    handleSubmit: handleFormSubmit,
    control,
    watch,
    setError,
    formState: { errors },
  } = methods;

  const { fields, append, remove } = useFieldArray({ control, name: "bookEntries" });

  const [confirmPayload, setConfirmPayload] = useState(null);

  // ==============================
  // BALANCE CALCULATION (live, mirrors the schema's superRefine exactly so
  // the UI hint never disagrees with what submission will actually enforce)
  // ==============================

  const watchedBookEntries = watch("bookEntries");

  const totalDebit = roundToCents(
    (watchedBookEntries || []).reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0),
  );
  const totalCredit = roundToCents(
    (watchedBookEntries || []).reduce((sum, e) => sum + (parseFloat(e.credit) || 0), 0),
  );

  const isBalanced =
    Math.abs(totalDebit - totalCredit) < BALANCE_EPSILON &&
    totalDebit > 0 &&
    totalCredit > 0;

  // ==============================
  // ROW HANDLERS
  // ==============================

  const handleRowRemove = (rowIndex) => {
    if (fields.length <= 2) {
      toast.error("Journal entry must have at least 2 line items");
      return;
    }

    remove(rowIndex);
  };

  const handleAddRow = () => {
    append(blankRow);
  };

  // ==============================
  // SUBMIT
  // ==============================

  const applyServerErrors = (err) => {
    const fieldErrors = err?.errors;
    if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
      fieldErrors.forEach(({ field, message }) => {
        if (field) setError(field, { type: "server", message });
      });
    } else {
      toast.error(err?.message || "Failed to save journal entry");
    }
  };

  const onInvalid = (formErrors) => {
    // The array-level balance/empty/min-length message lives either at
    // bookEntries.message (no per-line errors) or bookEntries.root.message
    // (per-line errors also present) — confirmed empirically against
    // zodResolver's actual output shape. Per-line errors are already shown
    // inline via BookEntryRow, matching the pre-conversion UX exactly.
    const arrayError = formErrors.bookEntries;
    const message =
      arrayError?.root?.message ||
      (typeof arrayError?.message === "string" ? arrayError.message : undefined);
    if (message) toast.error(message);
    if (formErrors.voucherDate) toast.error(formErrors.voucherDate.message);
  };

  const onValid = async (data) => {
    if (!initialData) {
      setConfirmPayload(data);
      return;
    }

    try {
      await onSubmit(data);
    } catch (err) {
      applyServerErrors(err);
    }
  };

  const handleConfirm = async () => {
    try {
      await onSubmit(confirmPayload);
      setConfirmPayload(null);
    } catch (err) {
      setConfirmPayload(null);
      applyServerErrors(err);
    }
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
    <FormProvider {...methods}>
    <form onSubmit={handleFormSubmit(onValid, onInvalid)} noValidate className="relative space-y-4">
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
          <Controller
            name="voucherDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Voucher Date"
                value={field.value}
                onChange={field.onChange}
                required
                disabled={isSubmitting}
                error={errors.voucherDate?.message}
              />
            )}
          />

          <Select
            label="Transaction Type"
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
            {...register("transactionType")}
          />

          <Input label="Description" {...register("description")} />
        </div>
      </div>

      {/* Book Entries */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold">Book Entries</h2>

        {fields.map((field, idx) => (
          <BookEntryRow
            key={field.id}
            index={idx}
            leafAccounts={leafAccounts}
            onRemove={() => handleRowRemove(idx)}
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
            className="mt-1 h-4 w-4"
            {...register("requiresApproval")}
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
                      {formatCurrency(e.debit)}
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
                      {formatCurrency(e.credit)}
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
                {formatCurrency(totalDebit)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Credit</p>
              <p className="mt-0.5 font-mono text-base font-bold text-slate-900">
                {formatCurrency(totalCredit)}
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
    </FormProvider>
  );
};

export default DynamicJournalForm;
