import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Landmark,
  CreditCard,
  Building2,
  Wallet,
  GripVertical,
  RefreshCw,
  FileText,
} from "lucide-react";
import { Link } from "react-router";
import { useSelector } from "react-redux";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { bankAPI } from "../services/apiMethods";
import api from "../services/api";
import { toast } from "sonner";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import AccountCombobox from "../components/common/AccountCombobox";
import SectionHeader from "../components/common/SectionHeader";
import { SectionSkeleton } from "../components/common/Loaders";
import KPICard from "../components/reports/KPICard";
import SortableBankAccountCard, {
  BankAccountCard,
} from "../components/bank/BankAccountCard";
import FdrSection from "../components/bank/FdrSection";
import { getErrorMessage } from "../utils/errors";

const initialFormData = {
  bankName: "",
  accountNumber: "",
  accountHolderName: "",
  branchName: "",
  accountType: "savings",
  coaAccount: "",
};

const BankCash = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [coaAccounts, setCoaAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [fdrSummary, setFdrSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coaLoading, setCoaLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeDragId, setActiveDragId] = useState(null);

  const [formData, setFormData] = useState(initialFormData);

  const { user } = useSelector((state) => state.auth);

  // Mirrors the accountantOrDirector guard on POST/PUT/DELETE /bank and
  // PATCH /bank/reorder — a sub-accountant gets the same cards, read only.
  const canManage = user?.role === "director" || user?.role === "accountant";

  const accountIds = useMemo(
    () => bankAccounts.map((account) => account._id),
    [bankAccounts],
  );

  const activeDragAccount = activeDragId
    ? bankAccounts.find((account) => account._id === activeDragId)
    : null;

  const institutionCount = useMemo(
    () => new Set(bankAccounts.map((account) => account.bankName)).size,
    [bankAccounts],
  );

  const sensors = useSensors(
    // A small activation distance keeps the grip's own click/focus behaviour
    // intact and stops an accidental 2px twitch from firing a reorder.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const resetForm = () => {
    setEditingAccount(null);
    setFormData(initialFormData);
  };

  const fetchBankData = async () => {
    setLoading(true);
    try {
      const [accountsRes, balanceRes, fdrRes] = await Promise.all([
        bankAPI.getAll(),
        bankAPI.getTotalBalance(),
        bankAPI.getFdrSummary(),
      ]);

      setBankAccounts(accountsRes?.data?.data || []);
      setTotalBalance(balanceRes?.data?.data?.totalBalance || 0);
      setFdrSummary(fdrRes?.data?.data || null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load bank data"));
    } finally {
      setLoading(false);
    }
  };

  const fetchCOAAccounts = async () => {
    setCoaLoading(true);
    try {
      // parentAccountCode=1002 scopes this to children of the "Bank Accounts"
      // head — the same rule createBankAccount enforces at submit, so every
      // option offered here is now actually selectable. The remaining local
      // filter is belt-and-braces; the endpoint already applies it.
      const res = await api.get(
        "/accounts/leaf-nodes?accountType=asset&parentAccountCode=1002",
      );
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
      if (editingAccount) {
        // accountNumber and coaAccount are immutable server-side, and the
        // controller rejects the entire request if either key is merely
        // present in the body — not just when its value changed. Send only
        // the fields an edit is actually allowed to change.
        await bankAPI.update(editingAccount._id, {
          bankName: formData.bankName,
          accountHolderName: formData.accountHolderName,
          branchName: formData.branchName,
          accountType: formData.accountType,
        });
        toast.success("Bank account updated successfully");
      } else {
        await bankAPI.create(formData);
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

  const handleDragEnd = async ({ active, over }) => {
    setActiveDragId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = bankAccounts.findIndex((a) => a._id === active.id);
    const newIndex = bankAccounts.findIndex((a) => a._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic: the card stays where it was dropped while the write is in
    // flight, and snaps back only if the server rejects it.
    const previous = bankAccounts;
    const reordered = arrayMove(bankAccounts, oldIndex, newIndex);
    setBankAccounts(reordered);

    try {
      await bankAPI.reorder(reordered.map((account) => account._id));
    } catch (error) {
      setBankAccounts(previous);
      toast.error(getErrorMessage(error, "Failed to save the new order"));
    }
  };

  return (
    <div className="space-y-4 pb-10">
      <SectionHeader
        icon={Wallet}
        title="Bank & Cash"
        description="Manage cash accounts and bank balances"
        iconBg="bg-brand-navy-light"
        iconColor="text-brand-navy"
        // No buttonText, so SectionHeader renders no button of its own — this
        // only binds the Alt+N shortcut to the custom button below.
        onButtonClick={canManage ? () => handleOpenModal() : undefined}>
        <Link
          to="/dashboard/bank-cash/report"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:w-auto">
          <FileText size={16} />
          Report
        </Link>

        {canManage && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenModal()}
            icon={Plus}
            className="w-full border-brand-navy bg-brand-navy text-white hover:bg-brand-navy-dark hover:border-brand-navy-dark focus:ring-brand-navy-light md:w-auto">
            Add Account
          </Button>
        )}
      </SectionHeader>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <div className="col-span-2 lg:col-span-1">
          <KPICard
            title="Total Balance"
            value={totalBalance}
            icon={Landmark}
            color="navy"
            footer={
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <RefreshCw size={12} />
                Synced from ledger
              </p>
            }
          />
        </div>

        <KPICard
          title="Active Accounts"
          value={bankAccounts.length}
          format="text"
          icon={CreditCard}
          color="blue"
        />

        <KPICard
          title="Institutions"
          value={institutionCount}
          format="text"
          icon={Building2}
          color="slate"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionSkeleton rows={5} />
          <SectionSkeleton rows={5} />
        </div>
      ) : bankAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-4 py-16">
          <Landmark size={40} className="mb-4 text-slate-300" />
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            No bank accounts
          </h3>
          <p className="mt-2 max-w-sm text-center text-sm text-slate-500">
            Add your first bank or cash account to start tracking balances.
          </p>
          {canManage && (
            <Button
              variant="primary"
              icon={Plus}
              className="mt-6 bg-brand-navy hover:bg-brand-navy-dark focus:ring-brand-navy-light"
              onClick={() => handleOpenModal()}>
              Add Account
            </Button>
          )}
        </div>
      ) : canManage ? (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <GripVertical size={14} className="text-slate-400" />
            Drag a card by its handle to change the order accounts appear in.
            The order is saved for everyone.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => setActiveDragId(active.id)}
            onDragCancel={() => setActiveDragId(null)}
            onDragEnd={handleDragEnd}>
            <SortableContext items={accountIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {bankAccounts.map((account) => (
                  <SortableBankAccountCard
                    key={account._id}
                    account={account}
                    canManage={canManage}
                    onEdit={handleOpenModal}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>

            {/* The dragged card is rendered once more here so it can follow
                the pointer above the grid instead of being clipped by it. */}
            <DragOverlay>
              {activeDragAccount ? (
                <BankAccountCard
                  account={activeDragAccount}
                  canManage={canManage}
                  dragHandleProps={{}}
                  isOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {bankAccounts.map((account) => (
            <BankAccountCard key={account._id} account={account} />
          ))}
        </div>
      )}

      {/* Fixed deposits sit in the Chart of Accounts under the FDR head
          (1100), not in the Bank collection, so they render as their own
          block rather than alongside the draggable bank cards. */}
      <FdrSection summary={fdrSummary} loading={loading} />

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingAccount ? "Edit Bank Account" : "Add Bank Account"}
        description="Every bank account maps to one leaf asset account under Bank Accounts (1002); balances are read from that account's ledger."
        size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Bank Name"
              required
              value={formData.bankName}
              onChange={(e) =>
                setFormData({ ...formData, bankName: e.target.value })
              }
              placeholder="e.g. Eastern Bank"
            />

            {/* Immutable once created — the backend rejects any update that
                even mentions accountNumber, so the edit payload omits it.
                Disabled here so an edit can't silently discard a change. */}
            <Input
              label="Account Number"
              required
              value={formData.accountNumber}
              onChange={(e) =>
                setFormData({ ...formData, accountNumber: e.target.value })
              }
              placeholder="Account #"
              disabled={!!editingAccount}
              helperText={
                editingAccount ? "Account number can't be changed." : ""
              }
            />
          </div>

          <Input
            label="Account Holder Name"
            required
            value={formData.accountHolderName}
            onChange={(e) =>
              setFormData({ ...formData, accountHolderName: e.target.value })
            }
            placeholder="Name on account"
          />

          {/* Also immutable once created — relinking a bank to a different
              COA account would strand its ledger history. */}
          <AccountCombobox
            label="Linked COA Account"
            required
            value={formData.coaAccount}
            onChange={(coaAccount) =>
              setFormData({ ...formData, coaAccount })
            }
            accounts={coaAccounts}
            disabled={coaLoading || !!editingAccount}
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
              label="Branch Name"
              value={formData.branchName}
              onChange={(e) =>
                setFormData({ ...formData, branchName: e.target.value })
              }
              placeholder="Optional"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={handleCloseModal}
              type="button"
              className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || coaLoading}
              loading={submitting}
              className="bg-brand-navy hover:bg-brand-navy-dark focus:ring-brand-navy-light">
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
    </div>
  );
};

export default BankCash;
