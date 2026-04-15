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
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Select from "../components/common/Select";

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
    const options = normalizedAccounts
      .filter((acc) => acc.accountType === formData.accountType)
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
      <SectionHeader
        icon={Landmark}
        title="Chart of Accounts"
        description="Maintain account structure, parent-child relationships, and account status in a clear and simple way."
        buttonText="Create Account"
        onButtonClick={openCreateForm}
        buttonIcon={Plus}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">
          <Filter size={14} />
          Account Filters
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={statusFilter === option.value ? "primary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(option.value)}
              className={
                statusFilter === option.value
                  ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-700"
              }>
              {option.label}
            </Button>
          ))}
        </div>
      </section>

      {showForm && (
        <section className="relative rounded-xl border border-red-100 bg-white p-3 sm:p-4">
          <Button
            onClick={closeForm}
            type="button"
            variant="outline"
            size="sm"
            className="absolute right-3 top-3 min-h-0! border-slate-200 px-2 py-2 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600">
            <X size={16} />
          </Button>

          <div className="mb-4 border-b border-slate-100 pb-3 pr-12">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              {editingAccount ? "Edit Account" : "Create New Account"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Enter account details in a clean and consistent format.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Account Code"
                name="accountCode"
                placeholder="e.g. 1000"
                value={formData.accountCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    accountCode: e.target.value,
                  }))
                }
                required
              />

              <Input
                label="Account Name"
                name="accountName"
                placeholder="e.g. Cash in Hand"
                value={formData.accountName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    accountName: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Account Type"
                name="accountType"
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
                options={ACCOUNT_TYPE_OPTIONS}
                required
              />

              <Select
                label="Parent Account"
                name="parentAccount"
                value={formData.parentAccount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    parentAccount: e.target.value,
                  }))
                }
                options={parentOptions}
                placeholder="No Parent Account"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Opening Balance"
                name="openingBalance"
                type="number"
                placeholder="0.00"
                value={formData.openingBalance}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    openingBalance: parseFloat(e.target.value) || 0,
                  }))
                }
                step="0.01"
              />

              <Select
                label="Balance Type"
                name="openingBalanceType"
                value={formData.openingBalanceType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    openingBalanceType: e.target.value,
                  }))
                }
                options={BALANCE_TYPE_OPTIONS}
                disabled={Number(formData.openingBalance) === 0}
              />

              <Select
                label="Status"
                name="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                options={ACCOUNT_STATUS_OPTIONS}
              />

              <Input
                label="Description"
                name="description"
                type="text"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
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
                className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto">
                {editingAccount ? "Update Account" : "Create Account"}
              </Button>
            </div>
          </form>
        </section>
      )}

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
