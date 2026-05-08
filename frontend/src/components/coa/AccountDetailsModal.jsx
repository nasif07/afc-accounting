import React from "react";
import { X } from "lucide-react";

const AccountDetailsModal = ({
  account,
  isOpen,
  onClose,
  allAccounts = [],
}) => {
  if (!isOpen || !account?._id) return null;

  const parentAccount =
    typeof account.parentAccount === "object"
      ? account.parentAccount
      : allAccounts.find((acc) => acc._id === account.parentAccount);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-[10000] w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Account Details
            </h2>
            <p className="text-sm text-slate-500">
              View chart of account information
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Account Code
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {account.accountCode || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Account Name
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {account.accountName || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Account Type
            </p>
            <p className="mt-1 text-base font-semibold capitalize text-slate-900">
              {account.accountType || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Parent Account
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {parentAccount?.accountName || "No Parent"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Current Balance
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              ৳{" "}
              {Number(account.currentBalance || 0).toLocaleString("en-BD", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Balance Type
            </p>
            <p className="mt-1 text-base font-semibold capitalize text-slate-900">
              {account.currentBalanceType || "debit"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Description
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {account.description || "No description available"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDetailsModal;
