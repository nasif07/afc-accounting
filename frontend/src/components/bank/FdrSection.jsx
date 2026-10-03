import { Link } from "react-router";
import { Landmark, PiggyBank, ReceiptText } from "lucide-react";

import MaskedAmount from "../common/MaskedAmount";
import { SectionSkeleton } from "../common/Loaders";
import { formatCurrency } from "../../utils/currency";

// Fixed Deposit Receipts. Each FDR is a plain Chart-of-Accounts child under
// the FDR head (1100) — there is no separate FDR record — so everything shown
// here comes from the journal ledger, the same source the bank cards use.
export default function FdrSection({ summary, loading }) {
  if (loading) return <SectionSkeleton rows={3} />;

  // The head is an ordinary COA account someone has to create. Say so plainly
  // rather than rendering an empty section that looks broken.
  if (!summary?.configured) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
        <PiggyBank size={32} className="mx-auto mb-3 text-slate-300" />
        <h3 className="text-base font-semibold text-slate-900">FDR head not set up</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Create an asset account with code <strong>1100</strong> (name it
          &ldquo;FDR&rdquo;) in Chart of Accounts. Every fixed deposit is then
          added as a child account under it.
        </p>
        <Link
          to="/dashboard/accounts"
          className="mt-4 inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Go to Chart of Accounts
        </Link>
      </div>
    );
  }

  const { parent, accounts = [], totalBalance, accountCount, transactionCount } = summary;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">
            FDR &mdash; Fixed Deposits
          </h3>
          <p className="mt-1 truncate text-xs text-slate-500">
            {parent?.accountCode} - {parent?.accountName} ·{" "}
            {accountCount} {accountCount === 1 ? "account" : "accounts"} ·{" "}
            {transactionCount} {transactionCount === 1 ? "transaction" : "transactions"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Total
          </span>
          <MaskedAmount
            className="text-lg font-bold tabular-nums text-slate-900"
            label="total FDR balance">
            {formatCurrency(totalBalance || 0)}
          </MaskedAmount>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-900">No FDR accounts yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Add a child account under {parent?.accountCode} - {parent?.accountName} in
            Chart of Accounts and it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {accounts.map((account) => (
            <div
              key={account._id}
              className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white transition-colors hover:border-brand-navy-light">
              <div className="flex items-start gap-3 p-4 sm:p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 transition-colors group-hover:border-brand-navy-light group-hover:bg-brand-navy-light">
                  <Landmark size={18} className="text-brand-navy" />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-base font-semibold leading-6 text-slate-900">
                    {account.accountName}
                  </h4>
                  <p className="mt-0.5 truncate font-mono text-xs text-slate-500">
                    {account.accountCode}
                  </p>
                </div>
              </div>

              <div className="mx-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:mx-5">
                <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Balance
                </p>
                <MaskedAmount
                  className="truncate text-lg font-bold tabular-nums text-slate-900"
                  label={`${account.accountName} balance`}>
                  {formatCurrency(account.currentBalance || 0)}
                </MaskedAmount>
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <ReceiptText size={14} className="text-slate-400" />
                  {account.transactionCount}{" "}
                  {account.transactionCount === 1 ? "transaction" : "transactions"}
                </p>

                {/* The ledger page is the existing per-account transaction
                    view; it reads an account id off the query string. */}
                <Link
                  to={`/dashboard/ledger?accountId=${account._id}`}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-navy hover:text-brand-navy-dark">
                  View transactions
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
