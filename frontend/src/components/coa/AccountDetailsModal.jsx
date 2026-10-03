import React from "react";
import { Modal } from "../common";

const DEBIT_NATURE_TYPES = ["asset", "expense"];

const AccountDetailsModal = ({
  account,
  isOpen,
  onClose,
  allAccounts = [],
  isRefreshing = false,
}) => {
  if (!isOpen || !account?._id) return null;

  const parentAccount =
    typeof account.parentAccount === "object"
      ? account.parentAccount
      : allAccounts.find((acc) => acc._id === account.parentAccount);

  // A debit-nature account (asset/expense) sitting at a credit balance — or
  // vice versa — is an abnormal position worth flagging, since the plain
  // magnitude above reads as a normal positive number either way.
  const normalBalanceType = DEBIT_NATURE_TYPES.includes(
    String(account.accountType || "").toLowerCase(),
  )
    ? "debit"
    : "credit";
  const balanceType = account.currentBalanceType || "debit";
  const isAbnormalBalance = balanceType !== normalBalanceType;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Account Details" description="View chart of account information" size="3xl">
      <div className="grid gap-4 p-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account Code</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{account.accountCode || "—"}</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account Name</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{account.accountName || "—"}</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account Type</p>
          <p className="mt-1 text-base font-semibold capitalize text-slate-900">{account.accountType || "—"}</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Parent Account</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{parentAccount?.accountName || "No Parent"}</p>
        </div>

        <div className={`rounded-xl border p-4 ${isAbnormalBalance ? "border-rose-200 bg-rose-50" : "border-slate-200"}`}>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Current Balance
            {isRefreshing && (
              <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" aria-label="Refreshing" />
            )}
          </p>
          <p className={`mt-1 text-base font-semibold ${isAbnormalBalance ? "text-rose-700" : "text-slate-900"}`}>৳ {Number(account.currentBalance || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        <div className={`rounded-xl border p-4 ${isAbnormalBalance ? "border-rose-200 bg-rose-50" : "border-slate-200"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Balance Type</p>
          <p className={`mt-1 text-base font-semibold capitalize ${isAbnormalBalance ? "text-rose-700" : "text-slate-900"}`}>
            {balanceType}
            {isAbnormalBalance ? " (abnormal)" : ""}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
          <p className="mt-1 text-sm text-slate-700">{account.description || "No description available"}</p>
        </div>
      </div>
    </Modal>
  );
};

export default AccountDetailsModal;
