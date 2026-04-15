import React, { useState, useEffect } from "react";
import {
  Plus,
  Landmark,
  CreditCard,
  Wallet,
  Edit2,
  Trash2,
  CheckCircle,
  History,
  Loader,
  RefreshCw,
} from "lucide-react";
import { bankAPI } from "../services/apiMethods";
import api from "../services/api";
import { formatCurrency } from "../utils/currency";
import { toast } from "sonner";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import SectionHeader from "../components/common/SectionHeader";

const getErrorMessage = (error, fallback = "Something went wrong") => {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error?.response?.data?.message === "string") {
    return error.response.data.message;
  }
  if (typeof error?.message === "string") {
    return error.message;
  }
  return fallback;
};

const initialFormData = {
  bankName: "",
  accountNumber: "",
  accountHolderName: "",
  branchName: "",
  accountType: "savings",
  openingBalance: 0,
  coaAccount: "",
};

const BankCash = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [coaAccounts, setCoaAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [coaLoading, setCoaLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileData, setReconcileData] = useState({
    reconciledBalance: "",
    reconciledDate: new Date().toISOString().split("T")[0],
  });

  const [formData, setFormData] = useState(initialFormData);

  const resetForm = () => {
    setEditingAccount(null);
    setFormData(initialFormData);
  };

  const fetchBankData = async () => {
    setLoading(true);
    try {
      const [accountsRes, balanceRes] = await Promise.all([
        bankAPI.getAll(),
        bankAPI.getTotalBalance(),
      ]);

      setBankAccounts(accountsRes?.data?.data || []);
      setTotalBalance(balanceRes?.data?.data?.totalBalance || 0);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load bank data"));
    } finally {
      setLoading(false);
    }
  };

  const fetchCOAAccounts = async () => {
    setCoaLoading(true);
    try {
      const res = await api.get("/accounts/leaf-nodes?accountType=asset");
      const accounts = res?.data?.data || [];

      const assetAccounts = accounts.filter(
        (acc) =>
          acc &&
          acc.accountType === "asset" &&
          acc.status === "active" &&
          !acc.deletedAt,
      );

      setCoaAccounts(assetAccounts);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load chart of accounts"));
    } finally {
      setCoaLoading(false);
    }
  };

  useEffect(() => {
    fetchBankData();
    fetchCOAAccounts();
  }, []);

  const handleOpenModal = (account = null) => {
    const isRealAccount =
      account &&
      typeof account === "object" &&
      !("nativeEvent" in account) &&
      ("_id" in account || "bankName" in account);

    if (isRealAccount) {
      setEditingAccount(account);
      setFormData({
        bankName: account.bankName || "",
        accountNumber: account.accountNumber || "",
        accountHolderName: account.accountHolderName || "",
        branchName: account.branchName || "",
        accountType: account.accountType || "savings",
        openingBalance: account.openingBalance || 0,
        coaAccount:
          typeof account.coaAccount === "object"
            ? account.coaAccount?._id || ""
            : account.coaAccount || "",
      });
    } else {
      resetForm();
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.coaAccount) {
      toast.error("Please select a linked chart of account");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        openingBalance: Number(formData.openingBalance) || 0,
      };

      if (editingAccount) {
        await bankAPI.update(editingAccount._id, payload);
        toast.success("Bank account updated successfully");
      } else {
        await bankAPI.create(payload);
        toast.success("Bank account created successfully");
      }

      handleCloseModal();
      await fetchBankData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Operation failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this account?",
    );
    if (!confirmed) return;

    try {
      await bankAPI.delete(id);
      toast.success("Account deleted successfully");
      await fetchBankData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete account"));
    }
  };

  const handleReconcile = async (e) => {
    e.preventDefault();
    if (!editingAccount?._id) {
      toast.error("No account selected for reconciliation");
      return;
    }

    setSubmitting(true);

    try {
      await bankAPI.reconcile(editingAccount._id, {
        reconciledBalance: Number(reconcileData.reconciledBalance) || 0,
        reconciledDate: reconcileData.reconciledDate,
      });

      toast.success("Account reconciled successfully");
      setShowReconcileModal(false);
      await fetchBankData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Reconciliation failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const getAccountIcon = (type) => {
    switch (type) {
      case "savings":
        return <Wallet className="text-red-600" size={20} />;
      case "current":
        return <Landmark className="text-red-600" size={20} />;
      default:
        return <CreditCard className="text-slate-500" size={20} />;
    }
  };

  const coaOptions = coaAccounts.map((acc) => ({
    value: acc._id,
    label: `${acc.accountCode} - ${acc.accountName}`,
  }));

  return (
    <div className="space-y-5 pb-8">
      <SectionHeader
        icon={Wallet}
        title="Bank & Cash"
        description="Manage cash accounts, bank balances, and reconciliations"
        buttonText="Add Account"
        onButtonClick={() => handleOpenModal()}
        buttonIcon={Plus}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-600 to-red-700 p-5 text-white shadow-none">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-100">
                Total Balance
              </p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                {formatCurrency(totalBalance)}
              </h2>
            </div>
            <div className="rounded-xl bg-white/15 p-3">
              <Landmark size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-red-100">
            <RefreshCw size={14} />
            Synced from ledger
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200 p-5 shadow-none">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Active Accounts
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                {bankAccounts.length}
              </h2>
            </div>
            <div className="rounded-xl bg-red-50 p-3">
              <CreditCard size={22} className="text-red-600" />
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Across {new Set(bankAccounts.map((a) => a.bankName)).size} institutions
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200 p-5 shadow-none">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Pending Reconciliation
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                {bankAccounts.filter((a) => !a.lastReconciledDate).length}
              </h2>
            </div>
            <div className="rounded-xl bg-red-50 p-3">
              <History size={22} className="text-red-600" />
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Accounts that still need review
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-full flex justify-center py-20">
            <Loader className="animate-spin text-red-600" size={34} />
          </div>
        ) : bankAccounts.length > 0 ? (
          bankAccounts.map((account) => (
            <Card
              key={account._id}
              className="group rounded-2xl border border-slate-200 bg-white shadow-none transition-colors hover:border-red-200"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors group-hover:border-red-100 group-hover:bg-red-50">
                      {getAccountIcon(account.accountType)}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-slate-900">
                        {account.bankName}
                      </h3>
                      <p className="mt-1 font-mono text-sm text-slate-500">
                        {account.accountNumber}
                      </p>

                      {account.coaAccount && (
                        <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                          Linked COA:{" "}
                          {typeof account.coaAccount === "object"
                            ? `${account.coaAccount.accountCode || ""} ${account.coaAccount.accountName || ""}`.trim()
                            : account.coaAccount}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => handleOpenModal(account)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(account._id)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Current Balance
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {formatCurrency(account.currentBalance || 0)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Last Reconciled
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {account.lastReconciledDate
                        ? new Date(account.lastReconciledDate).toLocaleDateString()
                        : "Never"}
                    </p>
                  </div>
                </div>

                {account.balanceError && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {account.balanceError}
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={account.isActive ? "success" : "danger"}>
                      {account.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="info" className="capitalize">
                      {account.accountType}
                    </Badge>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingAccount(account);
                      setReconcileData({
                        reconciledBalance: account.currentBalance || 0,
                        reconciledDate: new Date().toISOString().split("T")[0],
                      });
                      setShowReconcileModal(true);
                    }}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <CheckCircle size={14} className="mr-1" />
                    Reconcile
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50/40 py-20">
            <Landmark size={44} className="mb-4 text-red-300" />
            <h3 className="text-lg font-semibold text-slate-900">No Bank Accounts</h3>
            <p className="mt-2 max-w-sm text-center text-sm text-slate-500">
              Add your first bank or cash account to start tracking balances and reconciliations.
            </p>
            <Button
              variant="primary"
              className="mt-6 bg-red-600 hover:bg-red-700"
              onClick={() => handleOpenModal()}
            >
              <Plus size={18} className="mr-2" />
              Add Account
            </Button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingAccount ? "Edit Bank Account" : "Add Bank Account"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Bank Name"
            required
            value={formData.bankName}
            onChange={(e) =>
              setFormData({ ...formData, bankName: e.target.value })
            }
            placeholder="e.g. Eastern Bank"
          />

          <Input
            label="Account Number"
            required
            value={formData.accountNumber}
            onChange={(e) =>
              setFormData({ ...formData, accountNumber: e.target.value })
            }
            placeholder="Account #"
          />

          <Input
            label="Account Holder Name"
            required
            value={formData.accountHolderName}
            onChange={(e) =>
              setFormData({ ...formData, accountHolderName: e.target.value })
            }
            placeholder="Name on account"
          />

          <Select
            label="Linked COA Account"
            required
            value={formData.coaAccount}
            onChange={(e) =>
              setFormData({ ...formData, coaAccount: e.target.value })
            }
            options={coaOptions}
            disabled={coaLoading}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Account Type"
              value={formData.accountType}
              onChange={(e) =>
                setFormData({ ...formData, accountType: e.target.value })
              }
              options={[
                { value: "savings", label: "Savings" },
                { value: "current", label: "Current" },
                { value: "checking", label: "Checking" },
                { value: "money-market", label: "Money Market" },
              ]}
            />

            <Input
              label="Opening Balance"
              type="number"
              value={formData.openingBalance}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  openingBalance: Number(e.target.value) || 0,
                })
              }
              disabled={!!editingAccount}
            />
          </div>

          <Input
            label="Branch Name"
            value={formData.branchName}
            onChange={(e) =>
              setFormData({ ...formData, branchName: e.target.value })
            }
            placeholder="Optional"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleCloseModal} type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || coaLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting
                ? editingAccount
                  ? "Updating..."
                  : "Saving..."
                : editingAccount
                  ? "Update Account"
                  : "Save Account"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showReconcileModal}
        onClose={() => setShowReconcileModal(false)}
        title="Reconcile Account"
      >
        <form onSubmit={handleReconcile} className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              Enter the actual balance from your bank statement to match it with the system ledger.
            </p>
          </div>

          <Input
            label="Statement Balance"
            type="number"
            required
            value={reconcileData.reconciledBalance}
            onChange={(e) =>
              setReconcileData({
                ...reconcileData,
                reconciledBalance: Number(e.target.value) || 0,
              })
            }
          />

          <Input
            label="Statement Date"
            type="date"
            required
            value={reconcileData.reconciledDate}
            onChange={(e) =>
              setReconcileData({
                ...reconcileData,
                reconciledDate: e.target.value,
              })
            }
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowReconcileModal(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? "Processing..." : "Complete Reconciliation"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BankCash;