import { Banknote } from "lucide-react";
import Table from "../common/Table";
import { formatCurrency } from "../../utils/currency";
import { formatDisplayDate } from "../../utils/date";

const columns = [
  {
    key: "transactionDate",
    label: "Date",
    render: (value) => formatDisplayDate(value),
  },
  {
    key: "transactionDetails",
    label: "Transaction Details",
    primary: true,
    wrap: true,
    className: "max-w-md",
    render: (value, row) => (
      <div className="min-w-0">
        <div className="font-medium">{value}</div>
        <div className="mt-1 font-mono text-xs text-blue-600">
          {row.voucherNo}
        </div>
      </div>
    ),
  },
  {
    key: "chequeNumber",
    label: "Cheque Number",
    mono: true,
    render: (value) => value || "---",
  },
  {
    key: "deposit",
    label: "Deposit",
    align: "right",
    mono: true,
    className: "font-semibold text-emerald-700",
    render: (value) => (value ? formatCurrency(value) : "---"),
  },
  {
    key: "payment",
    label: "Payment / Withdrawal",
    align: "right",
    mono: true,
    className: "font-semibold text-rose-700",
    render: (value) => (value ? formatCurrency(value) : "---"),
  },
  {
    key: "balance",
    label: "Balance",
    align: "right",
    mono: true,
    className: "font-bold text-slate-900",
    render: (value, row) =>
      formatCurrency(value || row.runningBalance || 0),
  },
  {
    key: "referenceNo",
    label: "Remarks",
    className: "max-w-xs truncate",
    render: (value, row) => value || row.remarks || "---",
  },
  {
    key: "note",
    label: "Note",
    className: "max-w-xs truncate",
    render: (value) => value || "---",
  },
];

export default function BankBookStatement({ collections, loading, summary }) {
  return (
    <Table
      columns={columns}
      data={collections}
      loading={loading}
      rowKey={(row) => row.journalEntryId}
      paginated={false}
      minWidth="min-w-[1080px]"
      emptyIcon={Banknote}
      emptyMessage="No bank statement rows found"
      emptyDescription="Select a Bank Head or adjust filters to see journal-backed bank transactions."
      toolbar={
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            Bank Statement
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Shows only journal lines related to the selected Bank Head.
          </p>
        </div>
      }
      // Three figures rather than a single totals row, so they stay readable
      // on mobile where the table itself becomes cards.
      footer={
        <tr className="border-t-2 border-slate-200 bg-slate-100">
          <td
            colSpan={3}
            className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Period totals
          </td>
          <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-emerald-700">
            {formatCurrency(summary?.totalDeposits || 0)}
          </td>
          <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-rose-700">
            {formatCurrency(summary?.totalPayments || 0)}
          </td>
          <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
            {formatCurrency(summary?.closingBalance || 0)}
          </td>
          <td colSpan={2} />
        </tr>
      }
    />
  );
}
