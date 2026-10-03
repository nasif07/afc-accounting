import React from "react";
import Table from "../common/Table";
import { formatCurrency } from "../../utils/currency";
import { formatDisplayDate } from "../../utils/date";

const columns = [
  { key: "accountCode", label: "Account Code", mono: true },
  { key: "accountName", label: "Account Name", primary: true, wrap: true },
  {
    key: "accountType",
    label: "Account Type",
    className: "font-medium capitalize text-slate-900",
  },
  {
    key: "debit",
    label: "Debit",
    align: "right",
    mono: true,
    className: "font-medium text-slate-900",
    render: (value) => (value > 0 ? formatCurrency(value) : "-"),
  },
  {
    key: "credit",
    label: "Credit",
    align: "right",
    mono: true,
    className: "font-medium text-slate-900",
    render: (value) => (value > 0 ? formatCurrency(value) : "-"),
  },
];

const TrialBalanceReport = ({ data, asOfDate }) => {
  const balances = data?.balances || [];
  const isBalanced = Boolean(data?.isBalanced);

  return (
    <div className="space-y-4">
      <div className="border-b-2 border-slate-900 pb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Trial Balance</h2>
        {asOfDate && (
          <p className="mt-2 text-sm text-slate-600">
            As of {formatDisplayDate(asOfDate)}
          </p>
        )}
      </div>

      <Table
        columns={columns}
        data={balances}
        rowKey={(row, index) => row.accountCode || index}
        paginated={false}
        minWidth="min-w-[720px]"
        emptyMessage="No data available"
        emptyDescription="Nothing was posted in the selected period."
        footer={
          <>
            <tr className="border-t-2 border-slate-900 bg-slate-100">
              <td colSpan={3} className="px-4 py-3 font-bold text-slate-900">
                Total
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-900">
                {formatCurrency(data?.totalDebits || 0)}
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-900">
                {formatCurrency(data?.totalCredits || 0)}
              </td>
            </tr>
            <tr className={isBalanced ? "bg-emerald-50" : "bg-red-50"}>
              <td
                colSpan={5}
                className={`px-4 py-3 text-center font-semibold ${
                  isBalanced ? "text-emerald-700" : "text-red-700"
                }`}>
                {isBalanced
                  ? "✓ Trial Balance is Balanced"
                  : "✗ Trial Balance is NOT Balanced"}
              </td>
            </tr>
          </>
        }
      />
    </div>
  );
};

export default TrialBalanceReport;
