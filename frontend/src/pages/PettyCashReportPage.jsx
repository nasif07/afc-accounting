import { useEffect, useRef, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCcw,
  Wallet,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import Button from "../components/common/Button";
import DatePicker from "../components/common/DatePicker";
import SectionHeader from "../components/common/SectionHeader";
import {
  EmptyState,
  ErrorState,
  SectionSkeleton,
} from "../components/common/Loaders";
import PettyCashReport from "../components/reports/PettyCashReport";
import { pettyCashAPI } from "../services/apiMethods";
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

const buildPettyCashWorkbook = (report) => {
  const dateRange = report.dateRange || {};
  const period = formatPeriodLabel(dateRange);

  return buildCashbookWorkbook({
    sheetName: "Petty Cash Report",
    organization: "Alliance Francaise de Chittagong",
    subtitle: `Petty Cash Account / ${period} / ${
      report.account?.accountCode || "1001"
    } - ${report.account?.accountName || "Petty Cash"}`,
    columns: [
      "Date",
      "Expenditures",
      "Cash Received & Paid From",
      "Cash Received (BDT)",
      "Cash Payment (BDT)",
      "Balance (BDT)",
      "Remarks",
    ],
    openingDate: dateRange.from ? formatDisplayDate(dateRange.from) : "-",
    openingLabel: "Cash in Hand",
    openingBalance: report.openingBalance,
    rows: (report.transactions || []).map((row) => ({
      date: formatDisplayDate(row.date),
      // Mirrors the on-screen table: the expenditure column is filled on
      // money-out rows, the "received & paid from" column on money-in rows
      // (falling back to the line description).
      inHead: row.credit > 0 ? row.accountHead || row.counterparty || "" : "",
      outHead:
        row.debit > 0
          ? row.accountHead || row.counterparty || ""
          : row.description || "",
      in: Number(row.debit || 0),
      out: Number(row.credit || 0),
      balance: Number(row.runningBalance || 0),
      remark: row.referenceNumber || row.voucherNumber || "-",
    })),
    totals: {
      in: report.summary?.totalCashReceived,
      out: report.summary?.totalCashPayment,
      closing: report.summary?.closingBalance,
    },
    summaryLabels: [
      "Total Cash Received",
      "Total Cash Payment",
      "Closing Balance",
    ],
  });
};

export default function PettyCashReportPage() {
  const navigate = useNavigate();
  const reportRef = useRef(null);
  const [fromDate, setFromDate] = useState(firstDayOfCurrentMonth());
  const [toDate, setToDate] = useState(todayISO());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = async () => {
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

      const response = await pettyCashAPI.getReport({
        startDate: fromDate,
        endDate: toDate,
      });

      setReport(response?.data?.data || null);
    } catch (err) {
      setReport(null);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load petty cash report.",
      );
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadReport(); }, []);

  const handlePrint = () => {
    if (!reportRef.current) return;

    const printWindow = openPrintWindow(reportRef.current, {
      title: "Petty Cash Report",
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
      downloadWorkbook(
        buildPettyCashWorkbook(report),
        `petty-cash-report-${fromDate}-to-${toDate}.xlsx`,
      );

      toast.success("Petty cash Excel exported");
    } catch (err) {
      console.error("Petty cash Excel export error:", err);
      toast.error(err?.message || "Failed to export Excel");
    }
  };

  const hasReport = Boolean(report);
  const hasTransactions = Boolean(report?.transactions?.length);

  return (
    <div className="space-y-4 pb-10">
      <SectionHeader
        icon={FileText}
        title="Petty Cash Report"
        description="Approved journal-backed petty cash report for account code 1001."
        buttonText="Back to Petty Cash"
        hotkey={false}
        onButtonClick={() => navigate("/dashboard/petty-cash")}
        buttonIcon={Wallet}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_auto_auto_auto_auto] xl:items-center">
          <DatePicker
            label="From Date"
            name="fromDate"
            value={fromDate}
            onChange={setFromDate}
            required
            disabled={loading}
          />
          <DatePicker
            label="To Date"
            name="toDate"
            value={toDate}
            onChange={setToDate}
            required
            disabled={loading}
          />
          <Button
            type="button"
            onClick={loadReport}
            loading={loading}
            disabled={!fromDate || !toDate || loading}>
            <RefreshCcw size={16} />
            Generate
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            disabled={!hasReport || loading}>
            <Printer size={16} />
            Print / Save as PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadExcel}
            disabled={!hasReport || loading}>
            <FileSpreadsheet size={16} />
            Excel
          </Button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadReport} />}

      {loading ? (
        <SectionSkeleton rows={8} />
      ) : hasReport ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {!hasTransactions && (
            <div className="border-b border-slate-200 p-4">
              <EmptyState
                title="No period transactions"
                description="The report still shows the opening Cash in Hand balance for the selected dates."
              />
            </div>
          )}
          <PettyCashReport ref={reportRef} data={report} />
        </div>
      ) : !error ? (
        <EmptyState
          title="No report generated"
          description="Select a date range and generate the petty cash report."
          action={
            <Link
              to="/dashboard/petty-cash"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Back to Petty Cash
            </Link>
          }
        />
      ) : null}
    </div>
  );
}
