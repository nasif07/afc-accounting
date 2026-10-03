import Table from "../common/Table";
import { formatCurrency } from "../../utils/currency";

// The debit/credit line breakdown of a single journal entry, with its totals
// row. Rendered identically wherever an entry is inspected — the approvals
// queue's expanded card and the entry details page both used to carry their
// own copy of this markup, with different header weights, paddings and
// totals styling.

const accountName = (account) =>
  typeof account === "object" && account !== null
    ? account.accountName || account.accountCode || "—"
    : account || "—";

const accountCode = (account) =>
  typeof account === "object" && account !== null ? account.accountCode : "";

export default function BookEntryLinesTable({
  lines = [],
  showNarration = true,
  totalLabel = "Total",
  footerNote = null,
  className,
}) {
  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const totalCredit = lines.reduce(
    (sum, line) => sum + Number(line.credit || 0),
    0,
  );

  const columns = [
    {
      key: "account",
      label: "Account",
      primary: true,
      wrap: true,
      render: (value, line) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">
            {accountName(value)}
          </p>
          {accountCode(value) && (
            <p className="font-mono text-[11px] text-slate-400">
              {accountCode(value)}
            </p>
          )}
          {!showNarration && line.description && (
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {line.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "debit",
      label: "Debit",
      align: "right",
      mono: true,
      className: "font-semibold text-brand-navy",
      render: (value) =>
        Number(value) > 0 ? (
          formatCurrency(value)
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: "credit",
      label: "Credit",
      align: "right",
      mono: true,
      className: "font-semibold text-slate-700",
      render: (value) =>
        Number(value) > 0 ? (
          formatCurrency(value)
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    ...(showNarration
      ? [
          {
            key: "description",
            label: "Narration",
            wrap: true,
            className: "text-slate-500",
            render: (value) => value || "—",
          },
        ]
      : []),
  ];

  return (
    <Table
      className={className}
      columns={columns}
      data={lines}
      rowKey={(_, index) => index}
      paginated={false}
      minWidth="min-w-[560px]"
      emptyMessage="No book entry lines"
      emptyDescription="This entry has no debit or credit lines recorded."
      footer={
        <tr className="border-t-2 border-slate-200 bg-slate-100">
          <td className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            {totalLabel}
          </td>
          <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-brand-navy">
            {formatCurrency(totalDebit)}
          </td>
          <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-slate-700">
            {formatCurrency(totalCredit)}
          </td>
          {showNarration && <td className="px-4 py-3">{footerNote}</td>}
        </tr>
      }
    />
  );
}
