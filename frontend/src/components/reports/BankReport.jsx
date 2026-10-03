import React from "react";
import CashbookReport from "./CashbookReport";
import { formatPeriodLabel } from "../../utils/date";

// Bank flavour of the shared cash-book layout (see CashbookReport). Same
// ledger shape as the petty cash report, with money-in/money-out read as
// deposit/withdrawal and the bank's own identifying details in the header.
const BankReport = React.forwardRef(({ data = {} }, ref) => {
  const {
    bank = {},
    account = {},
    openingBalance = 0,
    transactions = [],
    summary = {},
    dateRange = {},
  } = data;

  const bankLine = [
    bank.bankName,
    bank.branchName,
    bank.accountNumber ? `A/C ${bank.accountNumber}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const coaLine = account.accountCode
    ? `Account: ${account.accountCode} - ${account.accountName || ""}`.trim()
    : "";

  return (
    <CashbookReport
      ref={ref}
      title={bankLine || "Bank Account"}
      subtitle={formatPeriodLabel(dateRange)}
      meta={[bank.accountHolderName, coaLine].filter(Boolean).join(" | ")}
      columns={{
        expenditures: "Payments",
        receivedPaidFrom: "Deposit Received & Paid From",
        inflow: "Deposit (BDT)",
        outflow: "Withdrawal (BDT)",
        note: "Note",
      }}
      openingLabel="Balance at Bank"
      openingDate={dateRange.from}
      openingBalance={openingBalance}
      transactions={transactions}
      summary={{
        totalInflow: summary.totalDeposit,
        totalOutflow: summary.totalWithdrawal,
        closingBalance: summary.closingBalance,
      }}
      emptyMessage="No approved bank transactions found for this period."
    />
  );
});

BankReport.displayName = "BankReport";

export default BankReport;
