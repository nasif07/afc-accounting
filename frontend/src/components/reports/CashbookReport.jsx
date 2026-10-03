import React from "react";
import { formatDisplayDate } from "../../utils/date";
import { REPORT_LOGO } from "../../constants/branding";

// The printable cash-book layout shared by the Petty Cash Report and the Bank
// Report: an opening "Balance B/D" row, one row per approved journal line,
// a totals row and a signature block. Only the labels differ between the two
// (cash received/payment vs. deposit/withdrawal), so they're props.
//
// Inline background/colour styles sit alongside the Tailwind classes on
// purpose — the print popup clones the app's stylesheets, but browsers drop
// background colours in print unless they're set on the element itself.

const HEADER_BG = "#e2f0d9";

const formatAmount = (amount) =>
  Number(amount || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Both class strings are written out in full — Tailwind scans source for
// literal class names, so a template like `text-${align}` would never be
// generated.
const HeaderCell = ({ align = "left", children }) => (
  <th
    className={
      align === "right"
        ? "border border-slate-900 px-2 py-2 text-right font-bold text-black"
        : "border border-slate-900 px-2 py-2 text-left font-bold text-black"
    }
    style={{ backgroundColor: HEADER_BG, color: "#000000" }}>
    {children}
  </th>
);

const CashbookReport = React.forwardRef(
  (
    {
      organization = "Alliance Francaise de Chittagong",
      title,
      subtitle,
      meta,
      columns = {},
      openingLabel = "Opening Balance",
      openingBalance = 0,
      openingDate,
      transactions = [],
      summary = {},
      emptyMessage = "No approved transactions found for this period.",
    },
    ref,
  ) => {
    // `expenditures` (col 2) carries the account head on money-out rows;
    // `receivedPaidFrom` (col 3) carries the head on money-in rows and falls
    // back to the line description otherwise — that asymmetry is the layout
    // the finance team already signed off on for petty cash.
    //
    // `note` is opt-in: passing it adds a column before Remarks. Petty cash
    // omits it and keeps its original seven columns.
    const {
      expenditures = "Expenditures",
      receivedPaidFrom = "Received & Paid From",
      inflow = "Received (BDT)",
      outflow = "Payment (BDT)",
      note = null,
    } = columns;

    const columnCount = note ? 8 : 7;

    return (
      <div ref={ref} className="bg-white p-5 text-slate-950 sm:p-8 print:p-0">
        <div className="text-center">
          {/* h-auto width keeps the landscape full logo undistorted;
              printWindow waits for it before printing. */}
          <img
            src={REPORT_LOGO}
            alt={organization}
            className="mx-auto mb-3 h-14 w-auto"
          />
          <h1 className="text-xl font-bold uppercase tracking-wide">
            {organization}
          </h1>
          <h2 className="mt-2 text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-slate-700">{subtitle}</p>
          {meta && <p className="mt-1 text-xs text-slate-500">{meta}</p>}
        </div>

        <div className="mt-6 overflow-x-auto">
          {/* Both widths written out in full — Tailwind only picks up literal
              class names. The note column needs the extra room. */}
          <table
            className={
              note
                ? "w-full min-w-[1040px] border-collapse border border-slate-900 text-xs"
                : "w-full min-w-[900px] border-collapse border border-slate-900 text-xs"
            }>
            <thead>
              <tr
                className="bg-[#e2f0d9] text-black"
                style={{ backgroundColor: HEADER_BG, color: "#000000" }}>
                <HeaderCell>Date</HeaderCell>
                <HeaderCell>{expenditures}</HeaderCell>
                <HeaderCell>{receivedPaidFrom}</HeaderCell>
                <HeaderCell align="right">{inflow}</HeaderCell>
                <HeaderCell align="right">{outflow}</HeaderCell>
                <HeaderCell align="right">Balance (BDT)</HeaderCell>
                {note && <HeaderCell>{note}</HeaderCell>}
                <HeaderCell>Remarks</HeaderCell>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="border border-slate-900 px-2 py-2">
                  {openingDate ? formatDisplayDate(openingDate) : "-"}
                </td>
                <td className="border border-slate-900 px-2 py-2 font-semibold">
                  {openingLabel}
                </td>
                <td className="border border-slate-900 px-2 py-2">Accounts</td>
                <td className="border border-slate-900 px-2 py-2 text-right">-</td>
                <td className="border border-slate-900 px-2 py-2 text-right">-</td>
                <td className="border border-slate-900 bg-yellow-200 px-2 py-2 text-right font-bold">
                  {formatAmount(openingBalance)}
                </td>
                {note && (
                  <td className="border border-slate-900 px-2 py-2">-</td>
                )}
                <td className="border border-slate-900 px-2 py-2 font-semibold">
                  Balance B/D
                </td>
              </tr>

              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="border border-slate-900 px-2 py-6 text-center text-slate-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                transactions.map((row, index) => (
                  <tr
                    key={
                      row.journalEntryId ||
                      row.id ||
                      `${row.voucherNumber || "row"}-${index}`
                    }>
                    <td className="border border-slate-900 px-2 py-2">
                      {formatDisplayDate(row.date)}
                    </td>
                    <td className="border border-slate-900 px-2 py-2">
                      {row.credit > 0 ? row.accountHead || row.counterparty : ""}
                    </td>
                    <td className="border border-slate-900 px-2 py-2">
                      {row.debit > 0
                        ? row.accountHead || row.counterparty
                        : row.description}
                    </td>
                    <td className="border border-slate-900 px-2 py-2 text-right">
                      {row.debit > 0 ? formatAmount(row.debit) : "-"}
                    </td>
                    <td className="border border-slate-900 px-2 py-2 text-right">
                      {row.credit > 0 ? formatAmount(row.credit) : "-"}
                    </td>
                    <td className="border border-slate-900 px-2 py-2 text-right font-semibold">
                      {formatAmount(row.runningBalance)}
                    </td>
                    {note && (
                      <td className="border border-slate-900 px-2 py-2">
                        {row.note || "-"}
                      </td>
                    )}
                    <td className="border border-slate-900 px-2 py-2">
                      {row.referenceNumber || row.voucherNumber || "-"}
                    </td>
                  </tr>
                ))
              )}

              <tr className="bg-slate-100 font-bold">
                <td colSpan={3} className="border border-slate-900 px-2 py-2">
                  Total
                </td>
                <td className="border border-slate-900 px-2 py-2 text-right">
                  {formatAmount(summary.totalInflow)}
                </td>
                <td className="border border-slate-900 px-2 py-2 text-right">
                  {formatAmount(summary.totalOutflow)}
                </td>
                <td className="border border-slate-900 px-2 py-2 text-right">
                  {formatAmount(summary.closingBalance)}
                </td>
                {note && <td className="border border-slate-900 px-2 py-2" />}
                <td className="border border-slate-900 px-2 py-2">
                  Closing Balance
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Kept together as one unit on print so a page break can't land
            between the totals and the signature lines. */}
        <div className="print:break-inside-avoid">
          <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-slate-500">Total {inflow.replace(" (BDT)", "")}</p>
              <p className="mt-1 font-bold text-emerald-700">
                BDT {formatAmount(summary.totalInflow)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Total {outflow.replace(" (BDT)", "")}</p>
              <p className="mt-1 font-bold text-red-700">
                BDT {formatAmount(summary.totalOutflow)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Closing Balance</p>
              <p className="mt-1 font-bold text-slate-950">
                BDT {formatAmount(summary.closingBalance)}
              </p>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-10 text-center text-sm sm:grid-cols-3">
            {["Prepared By", "Checked By", "Authorized Signature"].map((label) => (
              <div key={label}>
                <div className="border-t border-slate-900 pt-2">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
);

CashbookReport.displayName = "CashbookReport";

export default CashbookReport;
