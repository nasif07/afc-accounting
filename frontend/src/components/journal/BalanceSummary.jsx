import React from "react";
import { ArrowUpCircle, ArrowDownCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "../../utils/currency";

const BalanceSummary = ({ totalDebit, totalCredit, isBalanced }) => {
  const difference = Math.abs(totalDebit - totalCredit);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-bold text-slate-900">Balance Summary</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-navy-light text-brand-navy">
              <ArrowUpCircle size={16} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Debit
            </p>
          </div>
          <p className="font-mono text-xl font-bold text-slate-900">
            {formatCurrency(totalDebit)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-600">
              <ArrowDownCircle size={16} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Credit
            </p>
          </div>
          <p className="font-mono text-xl font-bold text-slate-900">
            {formatCurrency(totalCredit)}
          </p>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            isBalanced
              ? "border-brand-navy-light bg-brand-navy-light/40"
              : "border-red-200 bg-red-50"
          }`}>
          <div className="mb-2 flex items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                isBalanced ? "bg-brand-navy text-white" : "bg-red-100 text-red-600"
              }`}>
              {isBalanced ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            </div>
            <p
              className={`text-xs font-bold uppercase tracking-wider ${
                isBalanced ? "text-brand-navy" : "text-red-600"
              }`}>
              {isBalanced ? "Balanced" : "Unbalanced"}
            </p>
          </div>
          <p
            className={`font-mono text-xl font-bold ${
              isBalanced ? "text-brand-navy-dark" : "text-red-700"
            }`}>
            {isBalanced ? formatCurrency(0) : formatCurrency(difference)}
          </p>
        </div>
      </div>

      {!isBalanced && totalDebit > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            The journal entry must be balanced (Total Debit = Total Credit)
            before it can be submitted.
          </span>
        </div>
      )}
    </div>
  );
};

export default BalanceSummary;
