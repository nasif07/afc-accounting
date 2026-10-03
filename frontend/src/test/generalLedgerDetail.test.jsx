import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import GeneralLedgerReport from "../components/reports/GeneralLedgerReport";

// One debit against three credits — the case a single ledger row cannot
// express, since the row only carries this account's own side of the posting.
const compoundLedger = {
  accountName: "Cash on Hand",
  accountCode: "1001",
  accountType: "asset",
  openingBalance: 0,
  openingBalanceType: "debit",
  totalDebit: 8000,
  totalCredit: 0,
  closingBalance: 8000,
  closingBalanceType: "debit",
  pagination: { page: 1, total: 1 },
  transactions: [
    {
      date: "2026-08-11T00:00:00.000Z",
      voucherNumber: "JV-000042",
      description: "Daily collection",
      reference: "RCP-9",
      debit: 8000,
      credit: 0,
      runningBalance: 8000,
      runningBalanceType: "debit",
      journalEntryId: "je-42",
      isCompound: true,
      contraLines: [
        { accountCode: "4301", accountName: "Course Fee - AFC", debit: 0, credit: 5000, description: "Batch 12" },
        { accountCode: "4303", accountName: "Examinations Fees", debit: 0, credit: 2000, description: "" },
        { accountCode: "4402", accountName: "Dictionary", debit: 0, credit: 1000, description: "" },
      ],
    },
  ],
};

const renderReport = (viewType) =>
  render(
    <MemoryRouter>
      <GeneralLedgerReport
        data={compoundLedger}
        page={1}
        pageSize={50}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        pageSizeOptions={[50]}
        isFetching={false}
        viewType={viewType}
      />
    </MemoryRouter>,
  );

describe("General Ledger — Detailed view", () => {
  it("breaks a 1-debit / 3-credit entry out into its contra lines", () => {
    renderReport("detailed");

    // The row itself still shows only this account's own debit.
    expect(screen.getAllByText("JV-000042").length).toBeGreaterThan(0);

    // …and every credit it was posted against is now visible.
    expect(screen.getAllByText(/Course Fee - AFC/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Examinations Fees/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dictionary/).length).toBeGreaterThan(0);

    expect(screen.getAllByText(/Cr.*5,000\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cr.*2,000\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cr.*1,000\.00/).length).toBeGreaterThan(0);
  });

  it("labels it as a compound entry and counts the lines", () => {
    renderReport("detailed");
    expect(screen.getAllByText(/Compound entry · 3 contra lines/).length).toBeGreaterThan(0);
  });

  it("shows the per-line description when there is one", () => {
    renderReport("detailed");
    expect(screen.getAllByText(/Batch 12/).length).toBeGreaterThan(0);
  });

  it("hides the breakdown in Grouped view", () => {
    renderReport("grouped");

    expect(screen.getAllByText("JV-000042").length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Course Fee - AFC/)).toHaveLength(0);
    expect(screen.queryAllByText(/Compound entry/)).toHaveLength(0);
  });

  it("uses the singular 'Contra account' label for a plain two-sided entry", () => {
    const simple = {
      ...compoundLedger,
      transactions: [
        {
          ...compoundLedger.transactions[0],
          isCompound: false,
          contraLines: [
            { accountCode: "3201", accountName: "Opening Balance Equity", debit: 0, credit: 8000, description: "" },
          ],
        },
      ],
    };

    render(
      <MemoryRouter>
        <GeneralLedgerReport
          data={simple}
          page={1}
          pageSize={50}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          pageSizeOptions={[50]}
          isFetching={false}
          viewType="detailed"
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("Contra account").length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Compound entry/)).toHaveLength(0);
  });

  it("renders nothing extra when an entry has no contra lines", () => {
    const orphan = {
      ...compoundLedger,
      transactions: [{ ...compoundLedger.transactions[0], isCompound: false, contraLines: [] }],
    };

    render(
      <MemoryRouter>
        <GeneralLedgerReport
          data={orphan}
          page={1}
          pageSize={50}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          pageSizeOptions={[50]}
          isFetching={false}
          viewType="detailed"
        />
      </MemoryRouter>,
    );

    expect(screen.queryAllByText("Contra account")).toHaveLength(0);
    expect(screen.getAllByText("JV-000042").length).toBeGreaterThan(0);
  });
});
