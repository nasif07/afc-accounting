import React, { useState, useRef } from "react";
import {
  Download,
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
          if (!filters.accountId) {
            toast.error("Please select an account for General Ledger report");
            setLoading(false);
            return;
          }
          endpoint += `/ledger/${filters.accountId}`;
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
      asOfDate: todayISO(),
      viewType: "detailed",
      accountId: "",
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
            body { padding: 24px; font-family: Arial, sans-serif; color: #111827; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; border: 1px solid #e5e7eb; text-align: left; }
          </style>
        </head>
        <body></body>
      </html>
    `);

    printWindow.document.close();
    printWindow.document.body.appendChild(printRef.current.cloneNode(true));

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };
  const handleDownloadPDF = async () => {
    let clone = null;

    try {
      const source = printRef.current;
      if (!source) {
        toast.error("No report content found to export");
        return;
      }

      toast.info("Preparing PDF...");

      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      clone = source.cloneNode(true);
      clone.style.position = "fixed";
      clone.style.top = "0";
      clone.style.left = "0";
      clone.style.width = "794px";
      clone.style.zIndex = "-9999";
      clone.style.pointerEvents = "none";
      clone.style.opacity = "1";
      clone.style.backgroundColor = "#ffffff";
      clone.style.background = "#ffffff";
      clone.style.overflow = "visible";

      // ✅ Remove buttons and icons from clone
      clone.querySelectorAll("button, svg").forEach((el) => el.remove());

      // ✅ Collect all CSS from document stylesheets and replace oklch
      const oklchRegex = /oklch\([^)]+\)/g;

      const replaceOklch = (cssText) => {
        return cssText.replace(oklchRegex, (match) => {
          try {
            const parts = match
              .replace("oklch(", "")
              .replace(")", "")
              .split(/[\s,/]+/)
              .map((p) => p.trim())
              .filter(Boolean);

            const lightness = parseFloat(parts[0]);
            const l = lightness > 1 ? lightness / 100 : lightness;
            const gray = Math.round(l * 255);
            const hex = gray.toString(16).padStart(2, "0");
            return `#${hex}${hex}${hex}`;
          } catch {
            return "#888888";
          }
        });
      };

      let allCSS = "";
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            allCSS += rule.cssText + "\n";
          }
        } catch {
          // cross-origin sheets — skip
        }
      }

      const safeCSSText = replaceOklch(allCSS);
      const styleTag = document.createElement("style");
      styleTag.textContent = safeCSSText;
      clone.prepend(styleTag);

      document.body.appendChild(clone);

      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => setTimeout(resolve, 400));

      // ✅ Fix oklch on individual nodes using computed styles from original
      const originalNodes = Array.from(source.querySelectorAll("*"));
      const cloneNodes = Array.from(clone.querySelectorAll("*"));

      originalNodes.forEach((origEl, i) => {
        const cloneEl = cloneNodes[i];
        if (!(cloneEl instanceof HTMLElement)) return;

        const computed = window.getComputedStyle(origEl);
        const props = [
          ["color", "#111827"],
          ["backgroundColor", "#ffffff"],
          ["borderColor", "#d1d5db"],
          ["borderTopColor", "#d1d5db"],
          ["borderBottomColor", "#d1d5db"],
          ["borderLeftColor", "#d1d5db"],
          ["borderRightColor", "#d1d5db"],
          ["outlineColor", "transparent"],
          ["fill", "#111827"],
          ["stroke", "none"],
          ["boxShadow", "none"],
          ["textDecorationColor", "#111827"],
          ["caretColor", "#111827"],
          ["columnRuleColor", "#d1d5db"],
        ];

        props.forEach(([prop, fallback]) => {
          const val = computed[prop];
          if (val && val.includes("oklch")) {
            cloneEl.style[prop] = fallback;
          }
        });
      });

      // ✅ Fix table backgrounds
      clone.querySelectorAll("tr").forEach((tr) => {
        tr.style.backgroundColor = "#ffffff";
        tr.style.background = "#ffffff";
      });

      clone.querySelectorAll("thead tr").forEach((tr) => {
        tr.style.backgroundColor = "#f9fafb";
        tr.style.background = "#f9fafb";
      });

      clone.querySelectorAll("tfoot tr").forEach((tr) => {
        tr.style.backgroundColor = "#f9fafb";
        tr.style.background = "#f9fafb";
      });

      clone.querySelectorAll("td, th").forEach((cell) => {
        if (!(cell instanceof HTMLElement)) return;
        cell.style.backgroundColor = "transparent";
        cell.style.background = "transparent";
      });

      // ✅ Fix remaining oklch backgrounds
      clone.querySelectorAll("*").forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        if (el.style.backgroundColor?.includes("oklch")) {
          el.style.backgroundColor = "#ffffff";
        }
        if (el.style.background?.includes("oklch")) {
          el.style.background = "#ffffff";
        }
      });

      // ❌ Remove report title badge (black background pill)
      clone.querySelectorAll(".rounded-full.bg-neutral-900").forEach((el) => {
        el.remove();
      });
      // ✅ Fix badge pill centering

      // ✅ Collapse large min-heights
      clone.querySelectorAll("*").forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const computed = window.getComputedStyle(el);
        const minH = parseFloat(computed.minHeight);
        if (minH >= 100) {
          el.style.setProperty("min-height", "0", "important");
          el.style.setProperty("height", "auto", "important");
        }
      });

      // ✅ Force root clone background
      clone.style.backgroundColor = "#ffffff";
      clone.style.background = "#ffffff";

      // ✅ Wait for layout to settle
      await new Promise((resolve) => setTimeout(resolve, 300));

      // ✅ Crop to actual content height using bounding rects
      const allChildren = Array.from(clone.querySelectorAll("*"));
      let maxBottom = 0;
      allChildren.forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const r = el.getBoundingClientRect();
        if (r.bottom > maxBottom) maxBottom = r.bottom;
      });

      const contentHeight = Math.min(clone.scrollHeight, maxBottom + 32);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        windowHeight: contentHeight,
        height: contentHeight,
        width: 794,
        x: 0,
        y: 0,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // ✅ Single page — no blank second page
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      } else {
        let yOffset = 0;
        let remainingHeight = imgHeight;

        while (remainingHeight > 0) {
          pdf.addImage(
            imgData,
            "JPEG",
            0,
            yOffset === 0 ? 0 : -yOffset,
            imgWidth,
            imgHeight,
          );
          remainingHeight -= pageHeight;
          if (remainingHeight > 0) {
            pdf.addPage();
            yOffset += pageHeight;
          }
        }
      }

      pdf.save(`${reportType}-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Report downloaded successfully");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error(err?.message || "Failed to export PDF");
    } finally {
      if (clone && document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
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

      case "general-ledger":
        return [
          {
            title: "Opening Balance",
            value: reportData.openingBalance || 0,
            color: "blue",
          },
          {
            title: "Closing Balance",
            value: reportData.closingBalance || 0,
            color: "green",
          },
          {
            title: "Transactions",
            value: reportData.pagination?.total || reportData.transactions?.length || 0,
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
        <ErrorState message={error} onRetry={fetchReport} />
      )}

      {loading && (
        <SectionSkeleton rows={8} />
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

                {/* ✅ Changed: wrap in flex div instead of inline-block */}
                <div className="mt-6 flex justify-center">
                  <div className="rounded-full bg-neutral-900 px-4 py-1 text-sm font-bold uppercase tracking-widest text-white">
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
                      <p className="text-sm text-neutral-600">
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
                      <p className="text-sm text-neutral-600">
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
