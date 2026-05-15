import React from "react";
import { formatDisplayDate } from "../../utils/date";

const formatAmount = (amount) =>
  Number(amount || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatPeriod = (dateRange = {}) => {
  if (dateRange.from && dateRange.to) {
    return `${formatDisplayDate(dateRange.from)} to ${formatDisplayDate(dateRange.to)}`;
  }

  if (dateRange.from) return `From ${formatDisplayDate(dateRange.from)}`;
  if (dateRange.to) return `Up to ${formatDisplayDate(dateRange.to)}`;
  return "All approved transactions";
};

const PettyCashReport = React.forwardRef(({ data = {} }, ref) => {
  const {
    account = {},
    openingBalance = 0,
    transactions = [],
    summary = {},
    dateRange = {},
  } = data;

  return (
    <div ref={ref} className="bg-white p-5 text-slate-950 sm:p-8 print:p-0">
      <div className="text-center">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          Alliance Francaise de Chittagong
        </h1>
        <h2 className="mt-2 text-lg font-semibold">Petty Cash Account</h2>
        <p className="mt-1 text-sm text-slate-700">{formatPeriod(dateRange)}</p>
        <p className="mt-1 text-xs text-slate-500">
          Account: {account.accountCode || "1001"} - {account.accountName || "Petty Cash"}
        </p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse border border-slate-900 text-xs">
          <thead>
            <tr
              className="bg-[#e2f0d9] text-black"
              style={{ backgroundColor: "#e2f0d9", color: "#000000" }}>
              <th
                className="border border-slate-900 px-2 py-2 text-left font-bold text-black"
                style={{ backgroundColor: "#e2f0d9", color: "#000000" }}>
                Date
              </th>
              <th
                className="border border-slate-900 px-2 py-2 text-left font-bold text-black"
                style={{ backgroundColor: "#e2f0d9", color: "#000000" }}>
                Expenditures
              </th>
              <th
                className="border border-slate-900 px-2 py-2 text-left font-bold text-black"
                style={{ backgroundColor: "#e2f0d9", color: "#000000" }}>
                Cash Received & Paid from
              </th>
              <th
                className="border border-slate-900 px-2 py-2 text-right font-bold text-black"
                style={{ backgroundColor: "#e2f0d9", color: "#000000" }}>
                Cash Received
              </th>
              <th
                className="border border-slate-900 px-2 py-2 text-right font-bold text-black"
                style={{ backgroundColor: "#e2f0d9", color: "#000000" }}>
                Cash Payment
              </th>
              <th
                className="border border-slate-900 px-2 py-2 text-right font-bold text-black"
                style={{ backgroundColor: "#e2f0d9", color: "#000000" }}>
                Balance
              </th>
              <th
                className="border border-slate-900 px-2 py-2 text-left font-bold text-black"
                style={{ backgroundColor: "#e2f0d9", color: "#000000" }}>
                Remarks
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td className="border border-slate-900 px-2 py-2">
                {dateRange.from ? formatDisplayDate(dateRange.from) : "-"}
              </td>
              <td className="border border-slate-900 px-2 py-2 font-semibold">
                Cash in Hand
              </td>
              <td className="border border-slate-900 px-2 py-2">Accounts</td>
              <td className="border border-slate-900 px-2 py-2 text-right">-</td>
              <td className="border border-slate-900 px-2 py-2 text-right">-</td>
              <td className="border border-slate-900 bg-yellow-200 px-2 py-2 text-right font-bold">
                {formatAmount(openingBalance)}
              </td>
              <td className="border border-slate-900 px-2 py-2 font-semibold">
                Balance B/D
              </td>
            </tr>

            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="border border-slate-900 px-2 py-6 text-center text-slate-500">
                  No approved petty cash transactions found for this period.
                </td>
              </tr>
            ) : (
              transactions.map((row, index) => (
                <tr
                  key={
                    row.journalEntryId ||
                    row.id ||
                    `${row.voucherNumber || "petty-cash"}-${index}`
                  }>
                  <td className="border border-slate-900 px-2 py-2">
                    {formatDisplayDate(row.date)}
                  </td>
                  <td className="border border-slate-900 px-2 py-2">
                    {row.credit > 0 ? row.accountHead || row.counterparty : ""}
                  </td>
                  <td className="border border-slate-900 px-2 py-2">
                    {row.debit > 0 ? row.accountHead || row.counterparty : row.description}
                  </td>
                  <td className="border border-slate-900 px-2 py-2 text-right">
                    {row.debit > 0 ? formatAmount(row.debit) : "-"}
                  </td>
                  <td className="border border-slate-900 px-2 py-2 text-right">
                    {row.credit > 0 ? formatAmount(row.credit) : "-"}
                  </td>
                  <td className="border border-slate-900 px-2 py-2 text-right font-semibold">
                    {formatAmount(row.runningBalance)}
                  </td>
                  <td className="border border-slate-900 px-2 py-2">
                    {row.referenceNumber || row.voucherNumber || "-"}
                  </td>
                </tr>
              ))
            )}

            <tr className="bg-slate-100 font-bold">
              <td colSpan={3} className="border border-slate-900 px-2 py-2">
                Total
              </td>
              <td className="border border-slate-900 px-2 py-2 text-right">
                {formatAmount(summary.totalCashReceived)}
              </td>
              <td className="border border-slate-900 px-2 py-2 text-right">
                {formatAmount(summary.totalCashPayment)}
              </td>
              <td className="border border-slate-900 px-2 py-2 text-right">
                {formatAmount(summary.closingBalance)}
              </td>
              <td className="border border-slate-900 px-2 py-2">Closing Balance</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-slate-500">Total Cash Received</p>
          <p className="mt-1 font-bold text-emerald-700">
            BDT {formatAmount(summary.totalCashReceived)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Total Cash Payment</p>
          <p className="mt-1 font-bold text-red-700">
            BDT {formatAmount(summary.totalCashPayment)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Closing Balance</p>
          <p className="mt-1 font-bold text-slate-950">
            BDT {formatAmount(summary.closingBalance)}
          </p>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-10 text-center text-sm sm:grid-cols-3">
        {["Prepared By", "Checked By", "Signature Director"].map((label) => (
          <div key={label}>
            <div className="border-t border-slate-900 pt-2">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
});

PettyCashReport.displayName = "PettyCashReport";

export default PettyCashReport;
