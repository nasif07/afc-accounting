import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  archiveAccount,
  restoreAccount,
  updateAccountStatus,
} from "../store/slices/accountSlice";
import { Plus, X, FolderTree, Landmark, Filter } from "lucide-react";
import { toast } from "sonner";
import COATreeView from "../components/coa/COATreeView";
import SectionHeader from "../components/common/SectionHeader";

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
  openingBalance: 0,
  openingBalanceType: "debit",
  parentAccount: "",
  status: "active",
};

export default function Accounts() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { accounts, isLoading, error } = useSelector((state) => state.accounts);

  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  useEffect(() => {
    dispatch(fetchAccounts({ includeDeleted: true }));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const resetForm = () => {
    setEditingAccount(null);
    setFormData(INITIAL_FORM_DATA);
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
    await queryClient.invalidateQueries({ queryKey: ["accountTree"] });
    await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    await queryClient.invalidateQueries({ queryKey: ["leafAccounts"] });
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
    return normalizedAccounts.filter((acc) => acc.status === statusFilter);
  }, [normalizedAccounts, statusFilter]);

  const parentOptions = useMemo(() => {
    return normalizedAccounts
      .filter((acc) => acc.accountType === formData.accountType)
      .filter((acc) => acc.status === "active")
      .filter((acc) => !editingAccount || acc._id !== editingAccount._id)
      .sort((a, b) =>
        String(a.accountCode).localeCompare(String(b.accountCode), undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
  }, [normalizedAccounts, formData.accountType, editingAccount]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const accountCode = formData.accountCode.trim();
    const accountName = formData.accountName.trim();
    const accountType = String(formData.accountType || "").toLowerCase();
    const description = formData.description.trim();
    const openingBalance = Number(formData.openingBalance) || 0;
    const status = String(formData.status || "").toLowerCase();

    if (!accountCode || !accountName) {
      toast.error("Account code and account name are required");
      return;
    }

    if (!/^\d+$/.test(accountCode)) {
      toast.error("Account code must contain numbers only");
      return;
    }

    if (!["debit", "credit"].includes(formData.openingBalanceType)) {
      toast.error("Opening balance type must be either debit or credit");
      return;
    }

    if (!["active", "inactive"].includes(status)) {
      toast.error("Invalid account status");
      return;
    }

    const payload = {
      accountCode,
      accountName,
      accountType,
      description,
      openingBalance,
      openingBalanceType:
        openingBalance === 0
          ? getDefaultBalanceType(accountType)
          : formData.openingBalanceType,
      parentAccount: formData.parentAccount || null,
      status,
    };

    let result;

    if (editingAccount) {
      if (editingAccount.status === "archived") {
        toast.error("Archived accounts cannot be edited");
        return;
      }

      result = await dispatch(
        updateAccount({
          id: editingAccount._id,
          data: payload,
        }),
      );
    } else {
      result = await dispatch(createAccount(payload));
    }

    if (result?.error) {
      toast.error(
        result.payload ||
          `Failed to ${editingAccount ? "update" : "create"} account`,
      );
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
    setFormData({
      accountCode: account.accountCode || "",
      accountName: account.accountName || "",
      accountType,
      parentAccount:
        typeof account.parentAccount === "object"
          ? account.parentAccount?._id || ""
          : account.parentAccount || "",
      description: account.description || "",
      openingBalance: Number(account.openingBalance) || 0,
      openingBalanceType:
        account.openingBalanceType || getDefaultBalanceType(accountType),
      status: account.status || "active",
    });

    setShowForm(true);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <SectionHeader
        icon={Landmark}
        title="Chart of Accounts"
        description="Maintain account structure, parent-child relationships, and account status in a clear and simple way."
        buttonText="Create Account"
        onButtonClick={openCreateForm}
        buttonIcon={Plus}
      />

      {/* Filters */}
      <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">
          <Filter size={14} />
          Account Filters
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition sm:text-sm ${
                statusFilter === option.value
                  ? "border-red-600 bg-red-100 text-red-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}>
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Form */}
      {showForm && (
        <section className="relative rounded-xl border border-red-100 bg-white p-3 sm:p-4">
          <button
            onClick={closeForm}
            className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
            type="button">
            <X size={18} />
          </button>

          <div className="mb-4 border-b border-slate-100 pb-3 pr-8">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              {editingAccount ? "Edit Account" : "Create New Account"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Enter account details in a clean and consistent format.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Account Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1000"
                  value={formData.accountCode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      accountCode: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cash in Hand"
                  value={formData.accountName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      accountName: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Account Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.accountType}
                  onChange={(e) => {
                    const selectedType = e.target.value.toLowerCase();
                    setFormData((prev) => ({
                      ...prev,
                      accountType: selectedType,
                      parentAccount: "",
                      openingBalanceType: getDefaultBalanceType(selectedType),
                    }));
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none">
                  <option value="asset">Asset</option>
                  <option value="liability">Liability</option>
                  <option value="equity">Equity</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Parent Account
                </label>
                <select
                  value={formData.parentAccount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      parentAccount: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none">
                  <option value="">No Parent Account</option>
                  {parentOptions.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.accountCode} - {acc.accountName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Opening Balance
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.openingBalance}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      openingBalance: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  step="0.01"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Balance Type
                </label>
                <select
                  value={formData.openingBalanceType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      openingBalanceType: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                  disabled={Number(formData.openingBalance) === 0}>
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto">
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto">
                {isLoading
                  ? editingAccount
                    ? "Updating..."
                    : "Creating..."
                  : editingAccount
                    ? "Update Account"
                    : "Create Account"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Tree Section */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 p-3 sm:p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-red-600">
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
