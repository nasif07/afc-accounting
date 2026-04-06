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
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import COATreeView from "../components/coa/COATreeView";

const getDefaultBalanceType = (accountType) => {
  return ["asset", "expense"].includes(accountType) ? "debit" : "credit";
};

export default function Accounts() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { accounts, isLoading, error } = useSelector((state) => state.accounts);

  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");

  const [formData, setFormData] = useState({
    accountCode: "",
    accountName: "",
    accountType: "asset",
    description: "",
    openingBalance: 0,
    openingBalanceType: "debit",
    parentAccount: "",
    status: "active",
  });

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
    setFormData({
      accountCode: "",
      accountName: "",
      accountType: "asset",
      description: "",
      openingBalance: 0,
      openingBalanceType: "debit",
      parentAccount: "",
      status: "active",
    });
  };

  const refreshAccountsUI = async () => {
    await dispatch(fetchAccounts({ includeDeleted: true }));
    await queryClient.invalidateQueries({ queryKey: ["accountTree"] });
    await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    await queryClient.invalidateQueries({ queryKey: ["leafAccounts"] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.accountCode || !formData.accountName) {
      toast.error("Account code and name are required");
      return;
    }

    if (!/^\d+$/.test(formData.accountCode)) {
      toast.error("Account code must be numeric");
      return;
    }

    if (!["debit", "credit"].includes(formData.openingBalanceType)) {
      toast.error("Opening balance type must be debit or credit");
      return;
    }

    if (!["active", "inactive"].includes(formData.status)) {
      toast.error("Invalid status");
      return;
    }

    const payload = {
      accountCode: formData.accountCode.trim(),
      accountName: formData.accountName.trim(),
      accountType: formData.accountType,
      description: formData.description.trim(),
      openingBalance: Number(formData.openingBalance) || 0,
      openingBalanceType:
        Number(formData.openingBalance) === 0
          ? getDefaultBalanceType(formData.accountType)
          : formData.openingBalanceType,
      parentAccount: formData.parentAccount || null,
      status: formData.status,
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
        })
      );
    } else {
      result = await dispatch(createAccount(payload));
    }

    if (result?.error) {
      toast.error(
        result.payload ||
          `Failed to ${editingAccount ? "update" : "create"} account`
      );
      return;
    }

    toast.success(
      `Account ${editingAccount ? "updated" : "created"} successfully`
    );

    resetForm();
    setShowForm(false);
    await refreshAccountsUI();
  };

  const handleReset = () => {
    resetForm();
    setShowForm(false);
  };

  const handleArchive = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to archive this account?"
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
      toast.error(result.payload || "Failed to update status");
      return;
    }

    toast.success(`Account marked as ${status}`);
    await refreshAccountsUI();
  };

  const normalizedAccounts = useMemo(() => {
    if (!Array.isArray(accounts)) return [];

    return accounts.map((account) => ({
      ...account,
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
        })
      );
  }, [normalizedAccounts, formData.accountType, editingAccount]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Chart of Accounts
          </h1>
          <p className="mt-1 text-gray-600">
            Manage your account hierarchy and create new accounts
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
        >
          <Plus size={20} />
          New Account
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "active", "inactive", "archived"].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              statusFilter === status
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="relative rounded-lg border border-gray-200 bg-white p-6 shadow">
          <button
            onClick={handleReset}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X size={20} />
          </button>

          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            {editingAccount ? "Edit Account" : "Create New Account"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Account Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g., 1000"
                  value={formData.accountCode}
                  onChange={(e) =>
                    setFormData({ ...formData, accountCode: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Account Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Cash"
                  value={formData.accountName}
                  onChange={(e) =>
                    setFormData({ ...formData, accountName: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Account Type *
                </label>
                <select
                  value={formData.accountType}
                  onChange={(e) => {
                    const selectedType = e.target.value;
                    setFormData({
                      ...formData,
                      accountType: selectedType,
                      parentAccount: "",
                      openingBalanceType: getDefaultBalanceType(selectedType),
                    });
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="asset">Asset</option>
                  <option value="liability">Liability</option>
                  <option value="equity">Equity</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Parent Account
                </label>
                <select
                  value={formData.parentAccount}
                  onChange={(e) =>
                    setFormData({ ...formData, parentAccount: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Parent</option>
                  {parentOptions.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.accountCode} - {acc.accountName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Opening Balance
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.openingBalance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      openingBalance: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Opening Balance Type
                </label>
                <select
                  value={formData.openingBalanceType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      openingBalanceType: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={Number(formData.openingBalance) === 0}
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Optional account description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:bg-gray-400"
              >
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
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <COATreeView
          accounts={visibleAccounts}
          statusFilter={statusFilter}
          onAddAccount={() => {
            resetForm();
            setShowForm(true);
          }}
          onEditAccount={(account) => {
            if (account.status === "archived") {
              toast.error("Archived accounts cannot be edited");
              return;
            }

            const accountType = account.accountType || "asset";

            setEditingAccount(account);
            setFormData({
              accountCode: account.accountCode || "",
              accountName: account.accountName || "",
              accountType,
              parentAccount:
                account.parentAccount?._id || account.parentAccount || "",
              description: account.description || "",
              openingBalance: account.openingBalance || 0,
              openingBalanceType:
                account.openingBalanceType ||
                getDefaultBalanceType(accountType),
              status: account.status || "active",
            });

            setShowForm(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onDeleteAccount={handleArchive}
          onRestoreAccount={handleRestore}
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}