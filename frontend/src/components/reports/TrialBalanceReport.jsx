import React from "react";
import { formatCurrency } from "../../utils/currency";
import { formatDisplayDate } from "../../utils/date";

const TrialBalanceReport = ({ data, asOfDate }) => {
  if (!data || !data.balances) {
    return (
      <div className="text-center py-8 text-slate-500">
        No data available for the selected period.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b-2 border-slate-900">
        <h2 className="text-2xl font-bold text-slate-900">Trial Balance</h2>
        {asOfDate && (
          <p className="text-sm text-slate-600 mt-2">
            As of {formatDisplayDate(asOfDate)}
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="text-left py-3 px-4 font-semibold text-slate-900">
                Account Code
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-900">
                Account Name
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-900">
                Account Type
              </th>
              <th className="text-right py-3 px-4 font-semibold text-slate-900">
                Debit
              </th>
              <th className="text-right py-3 px-4 font-semibold text-slate-900">
                Credit
              </th>
            </tr>
          </thead>
          <tbody>
            {data.balances.map((balance, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-200 hover:bg-slate-50">
                <td className="py-3 px-4 text-slate-700">
                  {balance.accountCode}
                </td>
                <td className="py-3 px-4 text-slate-700">
                  {balance.accountName}
                </td>
                <td className="py-3 px-4 font-medium text-slate-900 capitalize">
                  {balance.accountType}
                </td>
                <td className="py-3 px-4 text-right font-medium text-slate-900">
                  {balance.debit > 0 ? formatCurrency(balance.debit) : "-"}
                </td>
                <td className="py-3 px-4 text-right font-medium text-slate-900">
                  {balance.credit > 0 ? formatCurrency(balance.credit) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-900">
              <td colSpan="3" className="py-3 px-4 font-bold text-slate-900">
                Total
              </td>
              <td className="py-3 px-4 text-right font-bold text-slate-900">
                {formatCurrency(data.totalDebits)}
              </td>
              <td className="py-3 px-4 text-right font-bold text-slate-900">
                {formatCurrency(data.totalCredits)}
              </td>
            </tr>
            <tr className={data.isBalanced ? "bg-emerald-50" : "bg-red-50"}>
              <td
                colSpan="5"
                className={`py-3 px-4 text-center font-semibold ${data.isBalanced ? "text-emerald-700" : "text-red-700"}`}>
                {data.isBalanced
                  ? "✓ Trial Balance is Balanced"
                  : "✗ Trial Balance is NOT Balanced"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default TrialBalanceReport;
