import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { formatDisplayDate } from "../../utils/date";

// Receipts & Payments Account in the traditional two-sided layout:
//   Receipts                      | Payments
//   To Opening Balance (cash/bank)| By Payments (by head)
//   To Receipts (by head)         | By Closing Balance (cash/bank)
//   Total                         | Total        ← always equal
// "Detailed" lists the vouchers under each head; "Grouped" shows heads only.

function SectionHeading({ children }) {
  return (
    <tr>
      <td
        colSpan={2}
        className="px-3 pb-1 pt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
        {children}
      </td>
    </tr>
  );
}

function AmountRow({ label, code, amount, bold = false, indent = true }) {
  return (
    <tr>
      <td
        className={`px-3 py-1.5 text-sm ${indent ? "pl-6" : ""} ${
          bold ? "font-semibold text-slate-900" : "text-slate-700"
        }`}>
        {code && (
          <span className="mr-2 font-mono text-xs text-slate-400">{code}</span>
        )}
        {label}
      </td>
      <td
        className={`whitespace-nowrap px-3 py-1.5 text-right font-mono text-sm tabular-nums ${
          bold ? "font-semibold text-slate-900" : "text-slate-800"
        } ${amount < 0 ? "text-red-700" : ""}`}>
        {formatCurrency(amount)}
      </td>
    </tr>
  );
}

function SubtotalRow({ label, amount }) {
  return (
    <tr>
      <td className="px-3 py-1.5 pl-6 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </td>
      <td className="whitespace-nowrap border-t border-slate-300 px-3 py-1.5 text-right font-mono text-sm font-semibold tabular-nums text-slate-900">
        {formatCurrency(amount)}
      </td>
    </tr>
  );
}

function HeadRows({ rows, detailed }) {
  return rows.map((row) => (
    <FragmentRows key={row.accountId} row={row} detailed={detailed} />
  ));
}

function FragmentRows({ row, detailed }) {
  return (
    <>
      <AmountRow
        label={row.accountName}
        code={row.accountCode}
        amount={row.amount}
      />
      {detailed &&
        row.transactions.map((tx, idx) => (
          <tr key={`${tx.journalEntryId}-${idx}`}>
            <td className="px-3 py-0.5 pl-12 text-xs text-slate-500">
              <span className="font-mono">{tx.voucherNumber}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              {formatDisplayDate(tx.date)}
              {tx.description && (
                <>
                  <span className="mx-1.5 text-slate-300">·</span>
                  {tx.description}
                </>
              )}
            </td>
            <td className="whitespace-nowrap px-3 py-0.5 text-right font-mono text-xs tabular-nums text-slate-500">
              {formatCurrency(tx.amount)}
            </td>
          </tr>
        ))}
    </>
  );
}

function EmptyRow({ children }) {
  return (
    <tr>
      <td colSpan={2} className="px-3 py-1.5 pl-6 text-sm italic text-slate-400">
        {children}
      </td>
    </tr>
  );
}

// One side of the account. The total sits in a <tfoot>, and both sides are
// stretched to the same height, so the two totals line up across the page.
function Side({ title, total, children }) {
  return (
    <div className="flex min-w-0 flex-col border border-slate-300">
      <div className="border-b border-slate-300 bg-slate-100 px-3 py-2 text-center text-sm font-bold uppercase tracking-wide text-slate-900">
        {title}
      </div>
      <table className="w-full flex-1 border-collapse">
        <colgroup>
          <col />
          <col className="w-36" />
        </colgroup>
        <tbody>{children}</tbody>
      </table>
      <div className="flex items-center justify-between border-t-2 border-slate-900 px-3 py-2 text-sm font-bold text-slate-900">
        <span>Total</span>
        <span className="font-mono tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

const ReceiptsPaymentsReport = ({ data, startDate, endDate, viewType }) => {
  if (!data) {
    return (
      <div className="py-8 text-center text-slate-500">
        No data available for the selected period.
      </div>
    );
  }

  const detailed = viewType !== "grouped";
  const openingBalances = data.openingBalances || [];
  const closingBalances = data.closingBalances || [];
  const receipts = data.receipts || [];
  const payments = data.payments || [];

  return (
    <div className="space-y-6">
      <div className="border-b-2 border-slate-900 pb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          Receipts &amp; Payments Account
        </h2>
        {startDate && endDate && (
          <p className="mt-2 text-sm text-slate-600">
            For the period {formatDisplayDate(startDate)} to{" "}
            {formatDisplayDate(endDate)}
          </p>
        )}
      </div>

      {!data.isBalanced && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            The two sides differ by{" "}
            <span className="font-semibold">
              {formatCurrency(Math.abs(data.difference || 0))}
            </span>
            . This happens only when a posted journal entry touching cash or
            bank is itself unbalanced — check recent entries.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-0 md:[&>*+*]:border-l-0">
        <Side title="Receipts" total={data.receiptsSideTotal}>
          <SectionHeading>To Opening Balance</SectionHeading>
          {openingBalances.length ? (
            openingBalances.map((row) => (
              <AmountRow
                key={row.accountId}
                label={row.accountName}
                code={row.accountCode}
                amount={row.amount}
              />
            ))
          ) : (
            <EmptyRow>No cash or bank balance</EmptyRow>
          )}
          <SubtotalRow label="Opening balance" amount={data.totalOpening} />

          <SectionHeading>To Receipts</SectionHeading>
          {receipts.length ? (
            <HeadRows rows={receipts} detailed={detailed} />
          ) : (
            <EmptyRow>No receipts in this period</EmptyRow>
          )}
          <SubtotalRow label="Total receipts" amount={data.totalReceipts} />
        </Side>

        <Side title="Payments" total={data.paymentsSideTotal}>
          <SectionHeading>By Payments</SectionHeading>
          {payments.length ? (
            <HeadRows rows={payments} detailed={detailed} />
          ) : (
            <EmptyRow>No payments in this period</EmptyRow>
          )}
          <SubtotalRow label="Total payments" amount={data.totalPayments} />

          <SectionHeading>By Closing Balance</SectionHeading>
          {closingBalances.length ? (
            closingBalances.map((row) => (
              <AmountRow
                key={row.accountId}
                label={row.accountName}
                code={row.accountCode}
                amount={row.amount}
              />
            ))
          ) : (
            <EmptyRow>No cash or bank balance</EmptyRow>
          )}
          <SubtotalRow label="Closing balance" amount={data.totalClosing} />
        </Side>
      </div>
    </div>
  );
};

export default ReceiptsPaymentsReport;
