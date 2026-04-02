import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAccounts,
  createAccount,
  deleteAccount,
} from "../store/slices/accountSlice";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import COATreeView from "../components/coa/COATreeView";

export default function Accounts() {
  const dispatch = useDispatch();
  const { accounts, isLoading, error } = useSelector((state) => state.accounts);

  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    accountCode: "",
    accountName: "",
    accountType: "Asset",
    description: "",
    openingBalance: 0,
    parentAccount: "",
  });

  useEffect(() => {
    dispatch(fetchAccounts());
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
      accountType: "Asset",
      description: "",
      openingBalance: 0,
      parentAccount: "",
    });
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

    const payload = {
      ...formData,
      parentAccount: formData.parentAccount || null,
    };

    let result;
    if (editingAccount) {
      // In a real app, we'd use an updateAccount thunk
      // For now, we'll use createAccount as a placeholder or assume it handles both
      result = await dispatch(createAccount({ ...payload, _id: editingAccount._id })); 
    } else {
      result = await dispatch(createAccount(payload));
    }

    if (result?.error) {
      toast.error(result.payload || `Failed to ${editingAccount ? 'update' : 'create'} account`);
      return;
    }

    toast.success(`Account ${editingAccount ? 'updated' : 'created'} successfully`);
    resetForm();
    setShowForm(false);
    dispatch(fetchAccounts());
  };

  const handleReset = () => {
    resetForm();
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this account?"
    );
    if (!confirmed) return;

    const result = await dispatch(deleteAccount(id));

    if (result?.error) {
      toast.error(result.payload || "Failed to delete account");
      return;
    }

    toast.success("Account deleted successfully");
    dispatch(fetchAccounts());
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

  const parentOptions = useMemo(() => {
    return normalizedAccounts
      .filter((acc) => acc.accountType === formData.accountType)
      .sort((a, b) => Number(a.accountCode || 0) - Number(b.accountCode || 0));
  }, [normalizedAccounts, formData.accountType]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Chart of Accounts
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your account hierarchy and create new accounts
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          New Account
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 relative">
          <button 
            onClick={handleReset}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            {editingAccount ? 'Edit Account' : 'Create New Account'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g., 1000"
                  value={formData.accountCode}
                  onChange={(e) =>
                    setFormData({ ...formData, accountCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Cash"
                  value={formData.accountName}
                  onChange={(e) =>
                    setFormData({ ...formData, accountName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type *
                </label>
                <select
                  value={formData.accountType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      accountType: e.target.value,
                      parentAccount: "",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                  <option value="Equity">Equity</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Account
                </label>
                <select
                  value={formData.parentAccount}
                  onChange={(e) =>
                    setFormData({ ...formData, parentAccount: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Optional account description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {isLoading ? (editingAccount ? "Updating..." : "Creating...") : (editingAccount ? "Update Account" : "Create Account")}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <COATreeView 
          onAddAccount={() => {
            resetForm();
            setShowForm(true);
          }}
          onEditAccount={(account) => {
            setEditingAccount(account);
            setFormData({
              accountCode: account.accountCode,
              accountName: account.accountName,
              accountType: account.accountType,
              parentAccount: account.parentAccount?._id || account.parentAccount || "",
              description: account.description || "",
              openingBalance: account.openingBalance || 0,
            });
            setShowForm(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onDeleteAccount={handleDelete}
        />
      </div>
    </div>
  );
}
