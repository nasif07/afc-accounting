import React, { useState, useRef } from "react";
import {
  Download,
  Printer,
  BarChart3,
  AlertCircle,
  Loader,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import KPICard from "../components/reports/KPICard";
import ReportFilters from "../components/reports/ReportFilters";
import TrialBalanceReport from "../components/reports/TrialBalanceReport";
import IncomeStatementReport from "../components/reports/IncomeStatementReport";
import BalanceSheetReport from "../components/reports/BalanceSheetReport";
import CashFlowReport from "../components/reports/CashFlowReport";
import { toast } from "sonner";
import api from "../services/api";
import SectionHeader from "../components/common/SectionHeader";

export default function Reports() {
  const printRef = useRef(null);

  const [reportType, setReportType] = useState("trial-balance");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    asOfDate: new Date().toISOString().split("T")[0],
    viewType: "detailed",
  });

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
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

        case "general-ledger":
          // FIXED: Add general-ledger support
          if (!filters.accountId) {
            throw new Error(
              "Please select an account for General Ledger report",
            );
          }
          endpoint += "/ledger/" + filters.accountId;
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
  };

  const handleReset = () => {
    setFilters({
      startDate: "",
      endDate: "",
      asOfDate: new Date().toISOString().split("T")[0],
      viewType: "detailed",
    });
    setReportData(null);
    setError(null);
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "", "height=700,width=1000");
    if (!printWindow) {
      toast.error("Unable to open print window");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Report</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
          <style>
            body {
              padding: 24px;
              font-family: Arial, sans-serif;
              color: #111827;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 8px;
              border: 1px solid #e5e7eb;
              text-align: left;
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  const handleDownloadPDF = async () => {
    try {
      const source = printRef.current;
      if (!source) {
        toast.error("No report content found to export");
        return;
      }

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      // Create a clean export container
      const exportWrapper = document.createElement("div");
      exportWrapper.style.position = "fixed";
      exportWrapper.style.left = "0";
      exportWrapper.style.top = "0";
      exportWrapper.style.width = "794px"; // A4-ish content width in px
      exportWrapper.style.background = "#ffffff";
      exportWrapper.style.color = "#111827";
      exportWrapper.style.padding = "24px";
      exportWrapper.style.zIndex = "-1";
      exportWrapper.style.opacity = "1";
      exportWrapper.style.pointerEvents = "none";

      // Clone the report content
      const clone = source.cloneNode(true);
      exportWrapper.appendChild(clone);
      document.body.appendChild(exportWrapper);

      // Force plain export-safe styling
      const all = exportWrapper.querySelectorAll("*");
      all.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;

        node.style.boxShadow = "none";
        node.style.textShadow = "none";
        node.style.filter = "none";
        node.style.backdropFilter = "none";
        node.style.borderColor = "#d1d5db";

        const text = window.getComputedStyle(node).color;
        const bg = window.getComputedStyle(node).backgroundColor;

        if (text && text.includes("oklch")) {
          node.style.color = "#111827";
        }

        if (bg && bg.includes("oklch")) {
          node.style.backgroundColor = "#ffffff";
        }
      });

      // Give the browser a moment to render the clone
      await new Promise((resolve) => setTimeout(resolve, 300));

      const options = {
        margin: 10,
        filename: `${reportType}-${new Date().toISOString().split("T")[0]}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: { mode: ["css", "legacy"] },
      };

      await html2pdf().set(options).from(exportWrapper).save();

      document.body.removeChild(exportWrapper);
      toast.success("Report downloaded successfully");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error(
        typeof err?.message === "string" ? err.message : "Failed to export PDF",
      );
    }
  };

  const getKPIs = () => {
    if (!reportData) return [];

    switch (reportType) {
      case "income-statement":
        return [
          {
            title: "Total Revenue",
            value: reportData.totalRevenue || 0,
            color: "green",
          },
          {
            title: "Total Expenses",
            value: reportData.totalExpenses || 0,
            color: "red",
          },
          {
            title: "Net Income",
            value: reportData.netIncome || 0,
            color: reportData.netIncome >= 0 ? "green" : "red",
          },
        ];

      case "balance-sheet":
        return [
          {
            title: "Total Assets",
            value: reportData.totalAssets || 0,
            color: "blue",
          },
          {
            title: "Total Liabilities",
            value: reportData.totalLiabilities || 0,
            color: "amber",
          },
          {
            title: "Total Equity",
            value: reportData.totalEquity || 0,
            color: "purple",
          },
        ];

      case "cash-flow":
        return [
          {
            title: "Total Inflows",
            value: reportData.totalInflow || 0,
            color: "green",
          },
          {
            title: "Total Outflows",
            value: reportData.totalOutflow || 0,
            color: "red",
          },
          {
            title: "Net Cash Flow",
            value: reportData.netCashFlow || 0,
            color: reportData.netCashFlow >= 0 ? "green" : "red",
          },
        ];

      case "trial-balance":
        return [
          {
            title: "Total Debits",
            value: reportData.totalDebits || 0,
            color: "blue",
          },
          {
            title: "Total Credits",
            value: reportData.totalCredits || 0,
            color: "blue",
          },
          {
            title: "Status",
            value: reportData.isBalanced ? "Balanced" : "Unbalanced",
            color: reportData.isBalanced ? "green" : "red",
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
        isLoading={loading}
      />

      <ReportFilters
        reportType={reportType}
        onReportTypeChange={handleReportTypeChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        loading={loading}
      />

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle size={20} className="text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-12 text-center">
            <Loader
              size={48}
              className="mx-auto mb-4 animate-spin text-neutral-400"
            />
            <p className="text-neutral-600">Generating report...</p>
          </CardContent>
        </Card>
      )}

      {reportData && !loading && (
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
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download size={16} className="mr-2" />
              Download PDF
            </Button>
          </div>

          <Card className="border-t-4 border-mahogany-700 shadow-xl">
            <CardContent className="pt-8" ref={printRef}>
              <div className="mb-8 border-b-2 border-neutral-900 pb-6 text-center">
                <h1 className="text-2xl font-bold uppercase tracking-wider text-neutral-900">
                  Alliance Française
                </h1>
                <p className="mt-1 font-medium text-neutral-600">
                  Financial Management System
                </p>

                <div className="mt-6 inline-block rounded-full bg-neutral-900 px-4 py-1 text-sm font-bold uppercase tracking-widest text-white">
                  {reportType === "trial-balance" && "Trial Balance"}
                  {reportType === "income-statement" &&
                    "Profit & Loss Statement"}
                  {reportType === "balance-sheet" && "Balance Sheet"}
                  {reportType === "cash-flow" && "Cash Flow Statement"}
                </div>

                <div className="mt-4 flex flex-col items-center gap-1">
                  {(filters.startDate || filters.endDate) &&
                    (reportType === "income-statement" ||
                      reportType === "cash-flow") && (
                      <p className="text-sm text-neutral-600">
                        <span className="font-semibold">Period:</span>{" "}
                        {filters.startDate
                          ? new Date(filters.startDate).toLocaleDateString()
                          : "N/A"}{" "}
                        to{" "}
                        {filters.endDate
                          ? new Date(filters.endDate).toLocaleDateString()
                          : "N/A"}
                      </p>
                    )}

                  {filters.asOfDate &&
                    (reportType === "trial-balance" ||
                      reportType === "balance-sheet") && (
                      <p className="text-sm text-neutral-600">
                        <span className="font-semibold">As of:</span>{" "}
                        {new Date(filters.asOfDate).toLocaleDateString()}
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
              </div>

              <div className="mt-12 border-t border-neutral-200 pt-6 text-center text-xs italic text-neutral-500">
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

      {!reportData && !loading && !error && (
        <Card className="border-2 border-dashed border-neutral-200 bg-neutral-50">
          <CardContent className="py-20 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
              <BarChart3 size={40} className="text-neutral-300" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-neutral-900">
              No Report Generated
            </h3>
            <p className="mx-auto mb-8 max-w-md text-neutral-600">
              Select your report type and date filters above, then click the
              "Generate Report" button to view your financial statements.
            </p>
            <Button variant="primary" onClick={fetchReport} size="lg">
              <BarChart3 size={18} className="mr-2" />
              Generate Report Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
