import React from "react";
import CashbookReport from "./CashbookReport";
import { formatPeriodLabel } from "../../utils/date";

// Petty cash flavour of the shared cash-book layout (see CashbookReport).
const PettyCashReport = React.forwardRef(({ data = {} }, ref) => {
  const {
    account = {},
    openingBalance = 0,
    transactions = [],
    summary = {},
    dateRange = {},
  } = data;

  return (
    <CashbookReport
      ref={ref}
      title="Petty Cash Account"
      subtitle={formatPeriodLabel(dateRange)}
      meta={`Account: ${account.accountCode || "1001"} - ${
        account.accountName || "Petty Cash"
      }`}
      columns={{
        expenditures: "Expenditures",
        receivedPaidFrom: "Cash Received & Paid From",
        inflow: "Cash Received (BDT)",
        outflow: "Cash Payment (BDT)",
      }}
      openingLabel="Cash in Hand"
      openingDate={dateRange.from}
      openingBalance={openingBalance}
      transactions={transactions}
      summary={{
        totalInflow: summary.totalCashReceived,
        totalOutflow: summary.totalCashPayment,
        closingBalance: summary.closingBalance,
      }}
      emptyMessage="No approved petty cash transactions found for this period."
    />
  );
});

PettyCashReport.displayName = "PettyCashReport";

export default PettyCashReport;
