import { formatCurrency } from "../../utils/currency";

const CARDS = [
  { key: "openingBalance", title: "Opening Balance" },
  { key: "totalDeposits", title: "Total Deposits" },
  { key: "totalPayments", title: "Total Payments" },
  { key: "closingBalance", title: "Closing Balance" },
];

export default function BankBookSummaryCards({ summary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map(({ key, title }) => (
        <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
          <p className="mt-1 truncate text-xl font-bold text-slate-900">
            {formatCurrency(summary[key] ?? 0)}
          </p>
        </div>
      ))}
    </div>
  );
}
