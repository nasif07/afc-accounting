import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Landmark,
  Printer,
  RefreshCcw,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import Button from "../components/common/Button";
import DatePicker from "../components/common/DatePicker";
import Select from "../components/common/Select";
import SectionHeader from "../components/common/SectionHeader";
import {
  EmptyState,
  ErrorState,
  SectionSkeleton,
} from "../components/common/Loaders";
import BankReport from "../components/reports/BankReport";
import { bankAPI } from "../services/apiMethods";
import { getErrorMessage } from "../utils/errors";
import {
  formatDisplayDate,
  formatPeriodLabel,
  firstDayOfCurrentMonth,
  todayISO,
} from "../utils/date";
import { openPrintWindow } from "../utils/printWindow";
import {
  buildCashbookWorkbook,
  downloadWorkbook,
} from "../utils/cashbookWorkbook";

const bankLabel = (bank) =>
  [bank.bankName, bank.accountNumber ? `(${bank.accountNumber})` : null]
    .filter(Boolean)
    .join(" ");

const buildBankWorkbook = (report) => {
  const dateRange = report.dateRange || {};
  const period = formatPeriodLabel(dateRange);

  const bank = report.bank || {};
  const account = report.account || {};

  return buildCashbookWorkbook({
    sheetName: "Bank Report",
    organization: "Alliance Francaise de Chittagong",
    subtitle: `${bank.bankName || "Bank Account"}${
      bank.accountNumber ? ` - A/C ${bank.accountNumber}` : ""
    } / ${period}${
      account.accountCode
        ? ` / ${account.accountCode} - ${account.accountName || ""}`
        : ""
    }`,
    includeNote: true,
    columns: [
      "Date",
      "Payments",
      "Deposit Received & Paid From",
      "Deposit (BDT)",
      "Withdrawal (BDT)",
      "Balance (BDT)",
      "Note",
      "Remarks",
    ],
    openingDate: dateRange.from ? formatDisplayDate(dateRange.from) : "-",
    openingLabel: "Balance at Bank",
    openingBalance: report.openingBalance,
    rows: (report.transactions || []).map((row) => ({
      date: formatDisplayDate(row.date),
      inHead: row.credit > 0 ? row.accountHead || row.counterparty || "" : "",
      outHead:
        row.debit > 0
          ? row.accountHead || row.counterparty || ""
          : row.description || "",
      in: Number(row.debit || 0),
      out: Number(row.credit || 0),
      balance: Number(row.runningBalance || 0),
      note: row.note || "-",
      remark: row.referenceNumber || row.voucherNumber || "-",
    })),
    totals: {
      in: report.summary?.totalDeposit,
      out: report.summary?.totalWithdrawal,
      closing: report.summary?.closingBalance,
    },
    summaryLabels: ["Total Deposit", "Total Withdrawal", "Closing Balance"],
  });
};

export default function BankReportPage() {
  const navigate = useNavigate();
  const reportRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(true);
  // Seeded from ?bankId= so a card on the Bank & Cash screen can deep-link
  // straight to its own report.
  const [bankId, setBankId] = useState(searchParams.get("bankId") || "");
  const [fromDate, setFromDate] = useState(firstDayOfCurrentMonth());
  const [toDate, setToDate] = useState(todayISO());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    if (!bankId) {
      setError("Select a bank account first.");
      return;
    }

    if (!fromDate || !toDate) {
      setError("From Date and To Date are required.");
      return;
    }

    if (fromDate > toDate) {
      setError("From Date cannot be after To Date.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await bankAPI.getReport(bankId, {
        startDate: fromDate,
        endDate: toDate,
      });

      setReport(response?.data?.data || null);
    } catch (err) {
      setReport(null);
      setError(getErrorMessage(err, "Failed to load bank report."));
    } finally {
      setLoading(false);
    }
  }, [bankId, fromDate, toDate]);

  useEffect(() => {
    let cancelled = false;

    const loadBanks = async () => {
      try {
        const response = await bankAPI.getAll();
        if (cancelled) return;

        const accounts = response?.data?.data || [];
        setBanks(accounts);

        // Fall back to the first account when no valid ?bankId= was supplied,
        // so the page always lands on something to look at.
        setBankId((current) =>
          accounts.some((account) => account._id === current)
            ? current
            : accounts[0]?._id || "",
        );
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Failed to load bank accounts."));
        }
      } finally {
        if (!cancelled) setBanksLoading(false);
      }
    };

    loadBanks();

    return () => {
      cancelled = true;
    };
  }, []);

  // Generate on first landing and whenever the account changes; date edits
  // wait for the Generate button, matching the petty cash report.
  useEffect(() => {
    if (!bankId) return;
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankId]);

  const handleBankChange = (event) => {
    const nextId = event.target.value;
    setBankId(nextId);

    // Keep the URL shareable/reloadable at the account being viewed.
    const next = new URLSearchParams(searchParams);
    if (nextId) next.set("bankId", nextId);
    else next.delete("bankId");
    setSearchParams(next, { replace: true });
  };

  const handlePrint = () => {
    if (!reportRef.current) return;

    const printWindow = openPrintWindow(reportRef.current, {
      title: "Bank Report",
      windowFeatures: "height=720,width=1080",
      pageOrientation: "landscape",
    });

    if (!printWindow) {
      toast.error("Unable to open print window");
    }
  };

  const handleDownloadExcel = () => {
    if (!report) {
      toast.error("No report content found to export");
      return;
    }

    try {
      const accountNumber = report.bank?.accountNumber || "account";
      downloadWorkbook(
        buildBankWorkbook(report),
        `bank-report-${accountNumber}-${fromDate}-to-${toDate}.xlsx`,
      );

      toast.success("Bank Excel exported");
    } catch (err) {
      console.error("Bank Excel export error:", err);
      toast.error(err?.message || "Failed to export Excel");
    }
  };

  const hasReport = Boolean(report);
  const hasTransactions = Boolean(report?.transactions?.length);
  const busy = loading || banksLoading;

  return (
    <div className="space-y-4 pb-10">
      <SectionHeader
        icon={FileText}
        title="Bank Report"
        description="Approved journal-backed cash book for a single bank account."
        buttonText="Back to Bank & Cash"
        hotkey={false}
        onButtonClick={() => navigate("/dashboard/bank-cash")}
        buttonIcon={Landmark}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr_1fr_auto_auto_auto] xl:items-center">
          <Select
            label="Bank Account"
            name="bankId"
            value={bankId}
            onChange={handleBankChange}
            disabled={busy || banks.length === 0}
            placeholder={
              banksLoading ? "Loading accounts..." : "Select a bank account"
            }
            options={banks.map((bank) => ({
              value: bank._id,
              label: bankLabel(bank),
            }))}
          />
          <DatePicker
            label="From Date"
            name="fromDate"
            value={fromDate}
            onChange={setFromDate}
            required
            disabled={busy}
          />
          <DatePicker
            label="To Date"
            name="toDate"
            value={toDate}
            onChange={setToDate}
            required
            disabled={busy}
          />
          <Button
            type="button"
            onClick={loadReport}
            loading={loading}
            disabled={!bankId || !fromDate || !toDate || busy}>
            <RefreshCcw size={16} />
            Generate
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            disabled={!hasReport || busy}>
            <Printer size={16} />
            Print / Save as PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadExcel}
            disabled={!hasReport || busy}>
            <FileSpreadsheet size={16} />
            Excel
          </Button>
        </div>
      </div>

      {error && (
        <ErrorState message={error} onRetry={bankId ? loadReport : undefined} />
      )}

      {busy ? (
        <SectionSkeleton rows={8} />
      ) : hasReport ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {!hasTransactions && (
            <div className="border-b border-slate-200 p-4">
              <EmptyState
                title="No period transactions"
                description="The report still shows the opening bank balance for the selected dates."
              />
            </div>
          )}
          <BankReport ref={reportRef} data={report} />
        </div>
      ) : !error ? (
        <EmptyState
          title={banks.length === 0 ? "No bank accounts" : "No report generated"}
          description={
            banks.length === 0
              ? "Add a bank account on the Bank & Cash screen first."
              : "Select an account and date range, then generate the report."
          }
          action={
            <Link
              to="/dashboard/bank-cash"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Back to Bank & Cash
            </Link>
          }
        />
      ) : null}
    </div>
  );
}
