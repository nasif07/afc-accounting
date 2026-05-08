import React, { useEffect, useState } from "react";
import { Filter, X } from "lucide-react";
import { toast } from "sonner";
import Button from "../common/Button";
import Input from "../common/Input";
import Select from "../common/Select";
import { coaAPI } from "../../services/apiMethods";

const ReportFilters = ({
  reportType,
  onReportTypeChange,
  filters,
  onFilterChange,
  onReset,
  loading = false,
}) => {
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const reportOptions = [
    { value: "trial-balance", label: "Trial Balance" },
    { value: "income-statement", label: "Profit & Loss" },
    { value: "balance-sheet", label: "Balance Sheet" },
    { value: "cash-flow", label: "Cash Flow Statement" },
    { value: "general-ledger", label: "General Ledger" },
  ];

  const requiresDateRange = [
    "income-statement",
    "cash-flow",
    "general-ledger",
  ].includes(reportType);

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
      } catch (error) {
        toast.error("Failed to load accounts");
        setAccounts([]);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, [reportType]);

  const accountOptions = [
    {
      value: "",
      label: loadingAccounts ? "Loading accounts..." : "Select Account",
    },
    ...accounts.map((account) => ({
      value: account._id,
      label: `${account.accountCode} - ${account.accountName}`,
    })),
  ];

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <Filter size={18} className="text-gray-600" />
        <h3 className="font-semibold text-gray-900">Report Filters</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
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
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Account
            </label>
            <Select
              value={filters.accountId || ""}
              onChange={(e) => onFilterChange("accountId", e.target.value)}
              options={accountOptions}
              disabled={loading || loadingAccounts}
            />
          </div>
        )}

        {requiresDateRange && (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <Input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => onFilterChange("startDate", e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                End Date
              </label>
              <Input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => onFilterChange("endDate", e.target.value)}
                disabled={loading}
              />
            </div>
          </>
        )}

        {requiresSingleDate && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              As of Date
            </label>
            <Input
              type="date"
              value={filters.asOfDate || ""}
              onChange={(e) => onFilterChange("asOfDate", e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        {["general-ledger", "income-statement"].includes(reportType) && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
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

      <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
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