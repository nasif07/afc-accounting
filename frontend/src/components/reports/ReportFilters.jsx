import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Filter, X } from "lucide-react";
import { toast } from "sonner";
import AccountCombobox from "../common/AccountCombobox";
import Button from "../common/Button";
import Select from "../common/Select";
import DatePicker from "../common/DatePicker";
import { coaAPI } from "../../services/apiMethods";
import {
  buildMonthOptions,
  financialYearOptions,
  financialYearRange,
  monthRange,
} from "../../utils/date";

const PERIOD_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "year", label: "Financial Year" },
  { value: "custom", label: "Custom Range" },
];

const ReportFilters = ({
  reportType,
  onReportTypeChange,
  filters,
  onFilterChange,
  onReset,
  loading = false,
}) => {
  const financialYearType =
    useSelector((state) => state.settings?.data?.financialYearType) ||
    "july-june";
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const reportOptions = [
    { value: "trial-balance", label: "Trial Balance" },
    { value: "receipts-payments", label: "Receipts & Payments" },
    { value: "balance-sheet", label: "Balance Sheet" },
    { value: "cash-flow", label: "Cash Flow Statement" },
    { value: "general-ledger", label: "General Ledger" },
  ];

  const requiresDateRange = [
    "receipts-payments",
    "cash-flow",
    "general-ledger",
  ].includes(reportType);

  const period = filters.period || "custom";

  const applyMonth = (monthValue) => {
    if (!monthValue) return;
    onFilterChange({ period: "month", periodValue: monthValue, ...monthRange(monthValue) });
  };

  const applyYear = (startYear) => {
    if (!startYear) return;
    onFilterChange({
      period: "year",
      periodValue: startYear,
      ...financialYearRange(startYear, financialYearType),
    });
  };

  // Switching the period type lands on its most useful value straight away:
  // Month → the month the current dates start in, Financial Year → the year in
  // progress. Custom keeps whatever dates are already there.
  const handlePeriodChange = (nextPeriod) => {
    if (nextPeriod === "month") {
      const fromDates = filters.startDate ? filters.startDate.slice(0, 7) : "";
      applyMonth(fromDates || buildMonthOptions()[0].value);
    } else if (nextPeriod === "year") {
      applyYear(financialYearOptions(financialYearType)[0].value);
    } else {
      onFilterChange({ period: "custom", periodValue: "" });
    }
  };

  const requiresSingleDate = [
    "trial-balance",
    "balance-sheet",
  ].includes(reportType);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (reportType !== "general-ledger") return;

      setLoadingAccounts(true);
      try {
        const response = await coaAPI.getLeafNodes();
        setAccounts(response?.data?.data || []);
      } catch {
        toast.error("Failed to load accounts");
        setAccounts([]);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, [reportType]);


  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <Filter size={18} className="text-slate-600" />
        <h3 className="font-semibold text-slate-900">Report Filters</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Report Type
          </label>
          <Select
            value={reportType}
            onChange={(e) => onReportTypeChange(e.target.value)}
            options={reportOptions}
            disabled={loading}
          />
        </div>

        {reportType === "general-ledger" && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Account
            </label>
            <AccountCombobox
              value={filters.accountId || ""}
              onChange={(value) => onFilterChange("accountId", value)}
              accounts={accounts}
              disabled={loading || loadingAccounts}
              placeholder={
                loadingAccounts ? "Loading accounts..." : "Select Account"
              }
            />
          </div>
        )}

        {requiresDateRange && (
          <>
            {/* Month or financial year fills Start/End in one step; editing
                either date by hand switches the period to Custom Range. */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Period
              </label>
              <Select
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value)}
                options={PERIOD_OPTIONS}
                disabled={loading}
              />
            </div>

            {period === "month" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Month
                </label>
                <Select
                  value={filters.periodValue || ""}
                  onChange={(e) => applyMonth(e.target.value)}
                  options={buildMonthOptions(filters.periodValue)}
                  placeholder="Select month"
                  disabled={loading}
                />
              </div>
            )}

            {period === "year" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Financial Year
                </label>
                <Select
                  value={filters.periodValue || ""}
                  onChange={(e) => applyYear(e.target.value)}
                  options={financialYearOptions(financialYearType)}
                  placeholder="Select year"
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Start Date
              </label>
              <DatePicker
                value={filters.startDate || ""}
                onChange={(value) =>
                  onFilterChange({ startDate: value, period: "custom", periodValue: "" })
                }
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                End Date
              </label>
              <DatePicker
                value={filters.endDate || ""}
                onChange={(value) =>
                  onFilterChange({ endDate: value, period: "custom", periodValue: "" })
                }
                disabled={loading}
              />
            </div>
          </>
        )}

        {requiresSingleDate && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              As of Date
            </label>
            <DatePicker
              value={filters.asOfDate || ""}
              onChange={(value) => onFilterChange("asOfDate", value)}
              disabled={loading}
            />
          </div>
        )}

        {["general-ledger", "receipts-payments"].includes(reportType) && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              View
            </label>
            <Select
              value={filters.viewType || "detailed"}
              onChange={(e) => onFilterChange("viewType", e.target.value)}
              options={[
                { value: "detailed", label: "Detailed" },
                { value: "grouped", label: "Grouped" },
              ]}
              disabled={loading}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={loading}
        >
          <X size={16} className="mr-1" />
          Reset
        </Button>
      </div>
    </div>
  );
};

export default ReportFilters;
