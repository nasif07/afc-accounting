import { Banknote } from "lucide-react";
import { TableSkeleton } from "../common/Loaders";
import { formatCurrency } from "../../utils/currency";
import { formatDisplayDate } from "../../utils/date";

const HEADINGS = [
  { label: "Date", numeric: false },
  { label: "Transaction Details", numeric: false },
  { label: "Cheque Number", numeric: false },
  { label: "Deposit", numeric: true },
  { label: "Payment / Withdrawal", numeric: true },
  { label: "Balance", numeric: true },
  { label: "Remarks", numeric: false },
  { label: "Note", numeric: false },
];

export default function BankBookStatement({ collections, loading, summary }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Bank Statement
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Shows only journal lines related to the selected Bank Head.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <TableSkeleton rows={8} columns={8} />
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <Banknote className="h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              No bank statement rows found
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Select a Bank Head or adjust filters to see journal-backed bank
              transactions.
            </p>
          </div>
        ) : (
          <table className="min-w-[1080px] w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {HEADINGS.map(({ label, numeric }) => (
                  <th
                    key={label}
                    className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                      numeric ? "text-right" : "text-left"
                    }`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {collections.map((row) => (
                <tr key={row.journalEntryId}>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                    {formatDisplayDate(row.transactionDate)}
                  </td>
                  <td className="max-w-md px-4 py-4 text-sm text-slate-700">
                    <div className="font-medium">{row.transactionDetails}</div>
                    <div className="mt-1 font-mono text-xs text-blue-600">
                      {row.voucherNo}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                    {row.chequeNumber || "---"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-semibold text-emerald-700">
                    {row.deposit ? formatCurrency(row.deposit) : "---"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-semibold text-rose-700">
                    {row.payment ? formatCurrency(row.payment) : "---"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-bold text-slate-900">
                    {formatCurrency(row.balance || row.runningBalance || 0)}
                  </td>
                  <td className="max-w-xs px-4 py-4 text-sm text-slate-600">
                    {row.referenceNo || row.remarks || "---"}
                  </td>
                  <td className="max-w-xs px-4 py-4 text-sm text-slate-600">
                    {row.note || "---"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {collections.length > 0 && (
        <div className="grid grid-cols-1 gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-4 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs font-bold uppercase text-slate-400">
              Total Deposits
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-700">
              {formatCurrency(summary.totalDeposits)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs font-bold uppercase text-slate-400">
              Total Payments / Withdrawals
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-rose-700">
              {formatCurrency(summary.totalPayments)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs font-bold uppercase text-slate-400">
              Closing Balance
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900">
              {formatCurrency(summary.closingBalance)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
