import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  fetchAccounts,
  fetchLeafAccounts,
  createAccount,
  updateAccount,
  archiveAccount,
  restoreAccount,
  updateAccountStatus,
} from "../store/slices/accountSlice";
import { Plus, FolderTree, Landmark, Filter } from "lucide-react";
import { toast } from "sonner";
import COATreeView from "../components/coa/COATreeView";
import SectionHeader from "../components/common/SectionHeader";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import DatePicker from "../components/common/DatePicker";
import Modal from "../components/common/Modal";
import { toISODate } from "../utils/date";

const getDefaultBalanceType = (accountType) => {
  return ["asset", "expense"].includes(String(accountType).toLowerCase())
    ? "debit"
    : "credit";
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Accounts" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

const INITIAL_FORM_DATA = {
  accountCode: "",
  accountName: "",
  accountType: "asset",
  description: "",
  openingBalance: "",
  openingBalanceType: "debit",
  openingDate: "",
  parentAccount: "",
  status: "active",
};

const ACCOUNT_TYPE_OPTIONS = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

const BALANCE_TYPE_OPTIONS = [
  { value: "debit", label: "Debit" },
  { value: "credit", label: "Credit" },
];

const ACCOUNT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// ── Zod validation schema ────────────────────────────────────────────────────
// Mirrors backend/src/validation/coa.validation.js. Two live bugs found and
// fixed as a natural consequence of correctly modelling "optional" here:
//   1. openingDate: the backend's z.coerce.date().optional() rejects an
//      empty string (only literal undefined counts as "not provided"). The
//      old code already worked around this manually for openingDate
//      specifically (`openingDate: formData.openingDate || undefined`) —
//      this schema now enforces the same fix declaratively.
//   2. parentAccount on CREATE: createAccountBody's parentAccount is
//      `objectId.optional()` — it accepts undefined but NOT null. The old
//      code always sent `parentAccount: formData.parentAccount || null`,
//      which means creating any top-level (no-parent) account has been
//      failing with a 400 today. updateAccountBody, by contrast, uses
//      `objectId.nullable().optional()` and the controller explicitly
//      distinguishes "omitted" (leave unchanged) from "null" (clear the
//      parent) — so update must still send null to clear a parent. Payload
//      construction below branches on create-vs-edit to match each schema.
// Not fixed here (would require a backend schema change, out of scope):
// createAccountBody has no `status` field at all, so selecting a non-default
// status while creating a new account is silently ignored server-side —
// every new account ends up "active" regardless of what's selected here.
const blankToUndefined = (v) => (v === "" || v == null ? undefined : v);
const optionalDate = z.preprocess(blankToUndefined, z.string().optional());

const accountSchema = z.object({
  accountCode: z
    .string()
    .trim()
    .min(1, "Account code is required")
    .regex(/^\d+$/, "Account code must contain numbers only"),
  accountName: z.string().trim().min(1, "Account name is required"),
  accountType: z.enum(["asset", "liability", "equity", "income", "expense"]),
  parentAccount: z.preprocess(blankToUndefined, z.string().optional()),
  openingBalance: z.coerce.number().min(0, "Opening balance must be 0 or greater").optional(),
  openingBalanceType: z.enum(["debit", "credit"]),
  openingDate: optionalDate,
  status: z.enum(["active", "inactive"]),
  description: z.string().trim().optional(),
});

export default function Accounts() {
  const dispatch = useDispatch();
  const { accounts, isLoading, error } = useSelector((state) => state.accounts);

  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    control,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(accountSchema), defaultValues: INITIAL_FORM_DATA });

  const watchedAccountType = watch("accountType");
  const watchedOpeningBalance = watch("openingBalance");

  useEffect(() => {
    dispatch(fetchAccounts({ includeDeleted: true }));
    dispatch(fetchLeafAccounts());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const resetForm = () => {
    setEditingAccount(null);
    reset(INITIAL_FORM_DATA);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const refreshAccountsUI = async () => {
    await dispatch(fetchAccounts({ includeDeleted: true }));
    await dispatch(fetchLeafAccounts());
  };

  const normalizedAccounts = useMemo(() => {
    if (!Array.isArray(accounts)) return [];

    return accounts.map((account) => ({
      ...account,
      accountType: String(account.accountType || "").toLowerCase(),
      status: String(account.status || "active").toLowerCase(),
      parentAccount:
        typeof account.parentAccount === "object" &&
        account.parentAccount !== null
          ? account.parentAccount._id
          : account.parentAccount || null,
    }));
  }, [accounts]);

  const visibleAccounts = useMemo(() => {
    if (!Array.isArray(normalizedAccounts)) return [];
    if (statusFilter === "all") return normalizedAccounts;

    return normalizedAccounts.filter(
      (acc) => String(acc.status || "").toLowerCase() === statusFilter,
    );
  }, [normalizedAccounts, statusFilter]);

  const parentOptions = useMemo(() => {
    const options = normalizedAccounts
      .filter((acc) => acc.accountType === watchedAccountType)
      .filter((acc) => acc.status === "active")
      .filter((acc) => !editingAccount || acc._id !== editingAccount._id)
      .sort((a, b) =>
        String(a.accountCode).localeCompare(String(b.accountCode), undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      )
      .map((acc) => ({
        value: acc._id,
        label: `${acc.accountCode} - ${acc.accountName}`,
      }));

    return options;
  }, [normalizedAccounts, watchedAccountType, editingAccount]);

  const onSubmit = async (data) => {
    if (editingAccount?.status === "archived") {
      toast.error("Archived accounts cannot be edited");
      return;
    }

    const openingBalance = Number(data.openingBalance) || 0;

    const payload = {
      accountCode: data.accountCode,
      accountName: data.accountName,
      accountType: data.accountType,
      description: data.description,
      openingBalance,
      openingBalanceType:
        openingBalance === 0
          ? getDefaultBalanceType(data.accountType)
          : data.openingBalanceType,
      openingDate: data.openingDate,
      // createAccountBody only accepts an ObjectId string or undefined (no
      // null); updateAccountBody explicitly supports null to clear an
      // existing parent, and the controller treats "omitted" and "null"
      // differently (omitted = leave unchanged). Branch to match each.
      parentAccount: data.parentAccount || (editingAccount ? null : undefined),
      status: data.status,
    };

    const result = editingAccount
      ? await dispatch(updateAccount({ id: editingAccount._id, data: payload }))
      : await dispatch(createAccount(payload));

    if (result?.error) {
      const fieldErrors = result.payload?.errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        fieldErrors.forEach(({ field, message }) => {
          if (field) setError(field, { type: "server", message });
        });
      }
      return;
    }

    toast.success(
      `Account ${editingAccount ? "updated" : "created"} successfully`,
    );

    closeForm();
    await refreshAccountsUI();
  };

  const handleArchive = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to archive this account?",
    );
    if (!confirmed) return;

    const result = await dispatch(archiveAccount(id));

    if (result?.error) {
      toast.error(result.payload || "Failed to archive account");
      return;
    }

    toast.success("Account archived successfully");
    await refreshAccountsUI();
  };

  const handleRestore = async (id) => {
    const result = await dispatch(restoreAccount(id));

    if (result?.error) {
      toast.error(result.payload || "Failed to restore account");
      return;
    }

    toast.success("Account restored successfully");
    await refreshAccountsUI();
  };

  const handleStatusChange = async (id, status) => {
    const result = await dispatch(updateAccountStatus({ id, status }));

    if (result?.error) {
      toast.error(result.payload || "Failed to update account status");
      return;
    }

    toast.success(`Account marked as ${status}`);
    await refreshAccountsUI();
  };

  const handleEditAccount = (account) => {
    if (account.status === "archived") {
      toast.error("Archived accounts cannot be edited");
      return;
    }

    const accountType = String(account.accountType || "asset").toLowerCase();

    setEditingAccount(account);
    reset({
      accountCode: account.accountCode || "",
      accountName: account.accountName || "",
      accountType,
      parentAccount:
        typeof account.parentAccount === "object"
          ? account.parentAccount?._id || ""
          : account.parentAccount || "",
      description: account.description || "",
      openingBalance: account.openingBalance ?? "",
      openingBalanceType:
        account.openingBalanceType || getDefaultBalanceType(accountType),
      openingDate: toISODate(account.openingDate),
      status: account.status || "active",
    });

    setShowForm(true);
  };

  return (
    <div className="space-y-3">
      <SectionHeader
        icon={Landmark}
        title="Chart of Accounts"
        description="Maintain account structure, parent-child relationships, and account status in a clear and simple way."
        iconBg="bg-brand-navy-light"
        iconColor="text-brand-navy">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openCreateForm}
          icon={Plus}
          className="w-full border-brand-navy bg-brand-navy text-white hover:bg-brand-navy-dark hover:border-brand-navy-dark focus:ring-brand-navy-light md:w-auto">
          Create Account
        </Button>
      </SectionHeader>

   <section className="rounded-xl  bg-white p-3 border border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex shrink-0 items-center gap-2 border-r pr-3 text-slate-500">
            <Filter size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Filter</span>
          </div>
          <div className="flex gap-2 pl-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === opt.value
                    ? "bg-brand-navy text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingAccount ? "Edit Account" : "Create New Account"}
        description="Enter account details in a clean and consistent format."
        size="3xl">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Account Code"
                placeholder="e.g. 1000"
                required
                error={errors.accountCode?.message}
                touched={!!errors.accountCode}
                {...register("accountCode")}
              />

              <Input
                label="Account Name"
                placeholder="e.g. Cash in Hand"
                required
                error={errors.accountName?.message}
                touched={!!errors.accountName}
                {...register("accountName")}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Account Type"
                options={ACCOUNT_TYPE_OPTIONS}
                required
                error={errors.accountType?.message}
                touched={!!errors.accountType}
                {...register("accountType", {
                  onChange: (e) => {
                    const selectedType = e.target.value.toLowerCase();
                    setValue("parentAccount", "");
                    setValue("openingBalanceType", getDefaultBalanceType(selectedType));
                  },
                })}
              />

              <Select
                label="Parent Account"
                options={parentOptions}
                placeholder="No Parent Account"
                {...register("parentAccount")}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                label="Opening Balance"
                type="number"
                placeholder="0.00"
                step="0.01"
                error={errors.openingBalance?.message}
                touched={!!errors.openingBalance}
                {...register("openingBalance")}
              />

              <Select
                label="Balance Type"
                options={BALANCE_TYPE_OPTIONS}
                disabled={Number(watchedOpeningBalance) === 0}
                {...register("openingBalanceType")}
              />

              <Controller
                name="openingDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Opening Date"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.openingDate?.message}
                  />
                )}
              />

              <Select
                label="Status"
                options={ACCOUNT_STATUS_OPTIONS}
                {...register("status")}
              />

              <Input
                label="Description"
                type="text"
                placeholder="Optional description"
                {...register("description")}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 sm:w-auto">
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                loading={isLoading}
                className="w-full bg-brand-navy text-white hover:bg-brand-navy-dark focus:ring-brand-navy-light sm:w-auto">
                {editingAccount ? "Update Account" : "Create Account"}
              </Button>
            </div>
          </form>
      </Modal>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 p-3 sm:p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-brand-navy">
            <FolderTree size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">
              Account Structure
            </h2>
            <p className="text-xs text-slate-500 sm:text-sm">
              Review and manage the account hierarchy.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto p-2 sm:p-3">
          <COATreeView
            accounts={visibleAccounts}
            onAddAccount={openCreateForm}
            onEditAccount={handleEditAccount}
            onDeleteAccount={handleArchive}
            onRestoreAccount={handleRestore}
            onStatusChange={handleStatusChange}
          />
        </div>
      </section>
    </div>
  );
}
