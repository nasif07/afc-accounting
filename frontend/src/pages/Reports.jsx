import React, { useState, useRef } from "react";
import {
  Printer,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, Button } from "../components/common";
import KPICard from "../components/reports/KPICard";
import ReportFilters from "../components/reports/ReportFilters";
import TrialBalanceReport from "../components/reports/TrialBalanceReport";
import IncomeStatementReport from "../components/reports/IncomeStatementReport";
import BalanceSheetReport from "../components/reports/BalanceSheetReport";
import CashFlowReport from "../components/reports/CashFlowReport";
import GeneralLedgerReport from "../components/reports/GeneralLedgerReport"; // ✅ add this
import { toast } from "sonner";
import api from "../services/api";
import SectionHeader from "../components/common/SectionHeader";
import { SectionSkeleton, ErrorState } from "../components/common/Loaders";
import { formatDisplayDate, todayISO } from "../utils/date";
import { useGeneralLedgerReport } from "../hooks/useGeneralLedgerReport";
import { openPrintWindow } from "../utils/printWindow";

const LEDGER_LIMIT = 50;

export default function Reports() {
  const printRef = useRef(null);

  const [reportType, setReportType] = useState("trial-balance");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    asOfDate: todayISO(),
    viewType: "detailed",
    accountId: "",
  });

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  // ── General Ledger: React Query-driven (page/limit live in the query key) ──
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerSubmitted, setLedgerSubmitted] = useState(false);
  const isLedger = reportType === "general-ledger";
  const ledgerQuery = useGeneralLedgerReport(
    {
      accountId: filters.accountId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      page: ledgerPage,
      limit: LEDGER_LIMIT,
    },
    { enabled: isLedger && ledgerSubmitted && !!filters.accountId },
  );

  const fetchReport = async () => {
    if (reportType === "general-ledger") {
      if (!filters.accountId) {
        toast.error("Please select an account for General Ledger report");
        return;
      }
      setLedgerPage(1);
      if (ledgerSubmitted) {
        // Query is already enabled for this account — force a fresh fetch.
        ledgerQuery.refetch();
      } else {
        // Flipping `enabled` to true triggers the initial fetch declaratively.
        setLedgerSubmitted(true);
      }
      return;
    }

    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      let endpoint = "/accounting/journal-entries";
      const params = {};

      switch (reportType) {
        case "trial-balance":
          endpoint += "/trial-balance";
          if (filters.asOfDate) params.asOfDate = filters.asOfDate;
          break;

        case "income-statement":
          endpoint += "/income-statement";
          if (filters.startDate) params.startDate = filters.startDate;
          if (filters.endDate) params.endDate = filters.endDate;
          break;

        case "balance-sheet":
          endpoint += "/balance-sheet";
          if (filters.asOfDate) params.asOfDate = filters.asOfDate;
          break;

        case "cash-flow":
          endpoint += "/cash-flow";
          if (filters.startDate) params.startDate = filters.startDate;
          if (filters.endDate) params.endDate = filters.endDate;
          break;

        default:
          throw new Error("Invalid report type selected");
      }

      const response = await api.get(endpoint, { params });
      setReportData(response?.data?.data || null);
      toast.success("Report generated successfully");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to generate report";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReportTypeChange = (type) => {
    setReportType(type);
    setReportData(null);
    setError(null);
    setLedgerSubmitted(false);
    setLedgerPage(1);
  };

  const handleReset = () => {
    setFilters({
      startDate: "",
      endDate: "",
      asOfDate: todayISO(),
      viewType: "detailed",
      accountId: "",
    });
    setReportData(null);
    setError(null);
    setLedgerSubmitted(false);
    setLedgerPage(1);
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = openPrintWindow(printRef.current, {
      title: `${reportType}-report`,
      windowFeatures: "height=700,width=1000",
    });

    if (!printWindow) {
      toast.error("Unable to open print window");
    }
  };

  // ── Unify ledger (React Query) and other report types (local state) ────────
  const effectiveReportData = isLedger ? ledgerQuery.data : reportData;
  const effectiveLoading = isLedger ? ledgerQuery.isLoading && !ledgerQuery.data : loading;
  const effectiveError = isLedger
    ? (ledgerQuery.isError && (ledgerQuery.error?.response?.data?.message || ledgerQuery.error?.message || "Failed to load ledger")) || null
    : error;

  const getKPIs = () => {
    if (!effectiveReportData) return [];

    switch (reportType) {
      case "income-statement":
        return [
          {
            title: "Total Revenue",
            value: effectiveReportData.totalRevenue || 0,
            color: "green",
          },
          {
            title: "Total Expenses",
            value: effectiveReportData.totalExpenses || 0,
            color: "red",
          },
          {
            title: "Net Income",
            value: effectiveReportData.netIncome || 0,
            color: effectiveReportData.netIncome >= 0 ? "green" : "red",
          },
        ];

      case "balance-sheet":
        return [
          {
            title: "Total Assets",
            value: effectiveReportData.totalAssets || 0,
            color: "blue",
          },
          {
            title: "Total Liabilities",
            value: effectiveReportData.totalLiabilities || 0,
            color: "amber",
          },
          {
            title: "Total Equity",
            value: effectiveReportData.totalEquity || 0,
            color: "purple",
          },
        ];

      case "cash-flow":
        return [
          {
            title: "Total Inflows",
            value: effectiveReportData.totalInflow || 0,
            color: "green",
          },
          {
            title: "Total Outflows",
            value: effectiveReportData.totalOutflow || 0,
            color: "red",
          },
          {
            title: "Net Cash Flow",
            value: effectiveReportData.netCashFlow || 0,
            color: effectiveReportData.netCashFlow >= 0 ? "green" : "red",
          },
        ];

      case "trial-balance":
        return [
          {
            title: "Total Debits",
            value: effectiveReportData.totalDebits || 0,
            color: "blue",
          },
          {
            title: "Total Credits",
            value: effectiveReportData.totalCredits || 0,
            color: "blue",
          },
          {
            title: "Status",
            value: effectiveReportData.isBalanced ? "Balanced" : "Unbalanced",
            color: effectiveReportData.isBalanced ? "green" : "red",
            format: "text",
          },
        ];

      case "general-ledger":
        return [
          {
            title: "Opening Balance",
            value: effectiveReportData.openingBalance || 0,
            color: "blue",
          },
          {
            title: "Closing Balance",
            value: effectiveReportData.closingBalance || 0,
            color: "green",
          },
          {
            title: "Transactions",
            value: effectiveReportData.pagination?.total || effectiveReportData.transactions?.length || 0,
            color: "purple",
            format: "text",
          },
        ];

      default:
        return [];
    }
  };

  const kpis = getKPIs();

  return (
    <div className="space-y-8 pb-12">
      <SectionHeader
        icon={BarChart3}
        title="Financial Reports"
        description="Generate and analyze comprehensive financial statements"
        buttonText="Generate Report"
        onButtonClick={fetchReport}
        buttonIcon={BarChart3}
        isLoading={effectiveLoading}
      />

      <ReportFilters
        reportType={reportType}
        onReportTypeChange={handleReportTypeChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        loading={effectiveLoading}
      />

      {effectiveError && (
        <ErrorState message={effectiveError} onRetry={fetchReport} />
      )}

      {effectiveLoading && (
        <SectionSkeleton rows={8} />
      )}

      {effectiveReportData && !effectiveLoading && (
        <>
          {kpis.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {kpis.map((kpi, idx) => (
                <KPICard
                  key={idx}
                  title={kpi.title}
                  value={kpi.value}
                  color={kpi.color}
                  format={kpi.format || "currency"}
                />
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer size={16} className="mr-2" />
              Print / Save as PDF
            </Button>
          </div>

          <Card className="border-t-4 border-red-600 shadow-xl">
            <CardContent className="pt-8" ref={printRef}>
              <div className="mb-8 border-b-2 border-slate-900 pb-6 text-center">
                <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
                  Alliance Française
                </h1>
                <p className="mt-1 font-medium text-slate-600">
                  Financial Management System
                </p>

                {/* ✅ Changed: wrap in flex div instead of inline-block */}
                <div className="mt-6 flex justify-center">
                  <div className="rounded-full bg-slate-900 px-4 py-1 text-sm font-bold uppercase tracking-widest text-white">
                    {reportType === "trial-balance" && "Trial Balance"}
                    {reportType === "income-statement" &&
                      "Profit & Loss Statement"}
                    {reportType === "balance-sheet" && "Balance Sheet"}
                    {reportType === "cash-flow" && "Cash Flow Statement"}
                    {reportType === "general-ledger" && "General Ledger"}
                  </div>
                </div>

                <div className="mt-4 flex flex-col items-center gap-1">
                  {(filters.startDate || filters.endDate) &&
                    (reportType === "income-statement" ||
                      reportType === "cash-flow" ||
                      reportType === "general-ledger") && (
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold">Period:</span>{" "}
                        {filters.startDate
                          ? formatDisplayDate(filters.startDate)
                          : "N/A"}{" "}
                        to{" "}
                        {filters.endDate
                          ? formatDisplayDate(filters.endDate)
                          : "N/A"}
                      </p>
                    )}

                  {filters.asOfDate &&
                    (reportType === "trial-balance" ||
                      reportType === "balance-sheet") && (
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold">As of:</span>{" "}
                        {formatDisplayDate(filters.asOfDate)}
                      </p>
                    )}
                </div>
              </div>

              <div className="min-h-[400px]">
                {reportType === "trial-balance" && (
                  <TrialBalanceReport
                    data={reportData}
                    asOfDate={filters.asOfDate}
                  />
                )}

                {reportType === "income-statement" && (
                  <IncomeStatementReport
                    data={reportData}
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                  />
                )}

                {reportType === "balance-sheet" && (
                  <BalanceSheetReport
                    data={reportData}
                    asOfDate={filters.asOfDate}
                  />
                )}

                {reportType === "cash-flow" && (
                  <CashFlowReport
                    data={reportData}
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                  />
                )}

                {reportType === "general-ledger" && (
                  <GeneralLedgerReport
                    data={effectiveReportData}
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    onPageChange={setLedgerPage}
                    isFetching={ledgerQuery.isFetching}
                  />
                )}
              </div>

              <div className="mt-12 border-t border-slate-200 pt-6 text-center text-xs italic text-slate-500">
                <p>
                  Generated on {new Date().toLocaleDateString()} at{" "}
                  {new Date().toLocaleTimeString()}
                </p>
                <p>
                  This is a computer-generated report and does not require a
                  signature.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!effectiveReportData && !effectiveLoading && !effectiveError && (
        <Card className="border-2 border-dashed border-slate-200 bg-slate-50">
          <CardContent className="py-20 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
              <BarChart3 size={40} className="text-slate-300" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">
              No Report Generated
            </h3>
            <p className="mx-auto mb-8 max-w-md text-slate-600">
              Select your report type and date filters above, then click the
              "Generate Report" button to view your financial statements.
            </p>
            <Button variant="primary" onClick={fetchReport} >
              <BarChart3 size={18} className="mr-2" />
              Generate Report Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
