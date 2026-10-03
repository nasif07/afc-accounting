import KPICard from "../reports/KPICard";

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
        <KPICard key={key} title={title} value={summary[key] ?? 0} icon={null} />
      ))}
    </div>
  );
}
