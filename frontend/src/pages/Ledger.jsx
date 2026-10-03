import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  Download,
  Filter,
  ArrowLeftRight,
  BookOpen,
} from "lucide-react";
import { accountingAPI, coaAPI } from "../services/apiMethods";
import { formatCurrency } from "../utils/currency";
import {
  buildMonthOptions,
  formatDisplayDate,
  monthFromRange,
  monthRange,
} from "../utils/date";
import { toast } from "sonner";
import Card from "../components/common/Card";
import SectionHeader from "../components/common/SectionHeader";
import AccountCombobox from "../components/common/AccountCombobox";
import Button from "../components/common/Button";
import DatePicker from "../components/common/DatePicker";
import Select from "../components/common/Select";
import Table from "../components/common/Table";
import { usePaginationParams } from "../hooks/usePaginationParams";
import KPICard from "../components/reports/KPICard";

const CRITERIA_STORAGE_KEY = "ledger:criteria";

const readStoredCriteria = () => {
  try {
    const stored = JSON.parse(sessionStorage.getItem(CRITERIA_STORAGE_KEY));
    return stored?.accountId ? stored : null;
  } catch {
    return null;
  }
};

const Ledger = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // The generated report lives in the URL (?accountId=&startDate=&endDate=)
  // and is read from it on every render, so paging, a refresh and the back
  // button all agree with what's on screen. Arriving from the sidebar carries
  // no query string, so the last report of this tab session is restored from
  // sessionStorage instead. Other screens (the FDR cards on Bank & Cash)
  // deep-link with just ?accountId=.
  const urlAccountId = searchParams.get("accountId") || "";
  const urlStartDate = searchParams.get("startDate") || "";
  const urlEndDate = searchParams.get("endDate") || "";
  const [storedCriteria] = useState(readStoredCriteria);

  // Snapshot of the account + date range the last "Generate Ledger" click ran
  // with. Page changes refetch against this rather than whatever is currently
  // typed into the filters, so paging never silently switches the report out
  // from under the user.
  const criteria = useMemo(
    () =>
      urlAccountId
        ? { accountId: urlAccountId, startDate: urlStartDate, endDate: urlEndDate }
        : storedCriteria,
    [urlAccountId, urlStartDate, urlEndDate, storedCriteria],
  );
  const initialCriteria = criteria;

  // Bumped by every Generate so re-running the same report still refetches
  // (the URL, and so `criteria`, doesn't change in that case).
  const [refreshKey, setRefreshKey] = useState(0);

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(
    initialCriteria?.accountId || "",
  );
  const [startDate, setStartDate] = useState(initialCriteria?.startDate || "");
  const [endDate, setEndDate] = useState(initialCriteria?.endDate || "");
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  // The ledger endpoint clamps `limit` at 200 (accounting.service.js), so the
  // page-size menu can safely offer more than the shared 100 default.
  const { page, pageSize, setPage, setPageSize } = usePaginationParams(25, {
    maxPageSize: 200,
  });

  const selectedMonth = monthFromRange(startDate, endDate);
  const monthOptions = buildMonthOptions(selectedMonth);

  // When the report changes underneath the form (back/forward button), bring
  // the form back in line with it.
  useEffect(() => {
    if (!criteria) return;
    setSelectedAccount(criteria.accountId);
    setStartDate(criteria.startDate || "");
    setEndDate(criteria.endDate || "");
    try {
      sessionStorage.setItem(CRITERIA_STORAGE_KEY, JSON.stringify(criteria));
    } catch {
      // Storage blocked — the URL still carries the report.
    }
  }, [criteria]);

  // Runs a report and writes it to the URL together with page=1 in a single
  // update — two separate setSearchParams calls in one tick would each start
  // from the same `prev` and the second would drop the first's changes.
  const runReport = (nextCriteria) => {
    setRefreshKey((key) => key + 1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("accountId", nextCriteria.accountId);
      ["startDate", "endDate"].forEach((key) => {
        if (nextCriteria[key]) next.set(key, nextCriteria[key]);
        else next.delete(key);
      });
      next.set("page", "1");
      return next;
    });
  };

  const handleMonthChange = (monthValue) => {
    if (!monthValue) {
      // "Custom range" — leave the dates for the user to pick.
      setStartDate("");
      setEndDate("");
      return;
    }
    const range = monthRange(monthValue);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    // With an account already chosen, picking a month is the whole request.
    if (selectedAccount) runReport({ accountId: selectedAccount, ...range });
  };


  // Fetch leaf accounts for selection
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const response = await coaAPI.getLeafNodes();
        setAccounts(response.data.data || []);
      } catch {
        toast.error("Failed to load accounts");
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, []);

  const handleGenerateLedger = () => {
    if (!selectedAccount) {
      toast.error("Please select an account");
      return;
    }
    runReport({ accountId: selectedAccount, startDate, endDate });
  };

  // Single fetch driver: reacts to the generated criteria and to page/page-size
  // changes, and cancels the in-flight request when any of them change again.
  useEffect(() => {
    if (!criteria) return undefined;

    const controller = new AbortController();

    (async () => {
      setLoading(true);
      try {
        const params = { page, limit: pageSize };
        if (criteria.startDate) params.startDate = criteria.startDate;
        if (criteria.endDate) params.endDate = criteria.endDate;

        const response = await accountingAPI.getLedger(criteria.accountId, params, {
          signal: controller.signal,
        });
        setLedgerData(response.data.data);
      } catch (error) {
        if (controller.signal.aborted) return;
        toast.error(
          error.response?.data?.message || "Failed to fetch ledger data",
        );
      } finally {
        // A superseded request must not clear the spinner the newer one owns.
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [criteria, page, pageSize, refreshKey]);

  const ledgerColumns = [
    {
      key: "date",
      label: "Date",
      render: (value) => formatDisplayDate(value),
    },
    {
      key: "voucherNumber",
      label: "Voucher #",
      primary: true,
      mono: true,
      className: "text-blue-600",
    },
    {
      key: "description",
      label: "Description",
      wrap: true,
      render: (value, tx) => (
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{value}</p>
          {tx.reference && (
            <p className="text-xs text-slate-400">Ref: {tx.reference}</p>
          )}
        </div>
      ),
    },
    {
      key: "debit",
      label: "Debit",
      align: "right",
      mono: true,
      className: "font-medium text-emerald-600",
      render: (value) => (value > 0 ? formatCurrency(value) : "-"),
    },
    {
      key: "credit",
      label: "Credit",
      align: "right",
      mono: true,
      className: "font-medium text-red-600",
      render: (value) => (value > 0 ? formatCurrency(value) : "-"),
    },
    {
      key: "runningBalance",
      label: "Running Balance",
      align: "right",
      mono: true,
      className: "font-bold text-slate-900",
      render: (value, tx) =>
        `${formatCurrency(value)} ${tx.runningBalanceType === "debit" ? "Dr" : "Cr"}`,
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={BookOpen}
        title="Ledger Overview"
        description="Generate a detailed ledger report for any account and date range"
        buttonText={"Print Report"}
        hotkey={false}
        onButtonClick={() => window.print()}
        buttonIcon={Download}
      />

      {/* Filters */}
      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-5">
          {/* Account Select */}
          <AccountCombobox
            label="Select Account"
            value={selectedAccount}
            onChange={setSelectedAccount}
            disabled={loadingAccounts}
            accounts={accounts}
            placeholder={
              loadingAccounts ? "Loading accounts..." : "Select Account"
            }
          />

          {/* Month shortcut — fills From/To with that month's first and last
              day. Reads back "Custom range" once either date is edited. */}
          <Select
            label="Month"
            placeholder="Custom range"
            options={monthOptions}
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            disabled={loading}
          />

          {/* From Date */}
          <DatePicker
            label="From Date"
            value={startDate}
            onChange={setStartDate}
            disabled={loading}
          />

          {/* To Date */}
          <DatePicker
            label="To Date"
            value={endDate}
            onChange={setEndDate}
            disabled={loading}
          />

          {/* Button */}
          <Button
            onClick={handleGenerateLedger}
            disabled={loading || !selectedAccount}
            className="py-3"
            icon={loading ? null : Filter}
            loading={loading}>
            Generate Ledger
          </Button>
        </div>
      </Card>

      {/* Ledger Results */}
      {ledgerData ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard title="Opening Balance" value={ledgerData.openingBalance} icon={null} />
            <KPICard title="Total Debit" value={ledgerData.totalDebit} icon={null} />
            <KPICard title="Total Credit" value={ledgerData.totalCredit} icon={null} />
            <KPICard title="Closing Balance" value={ledgerData.closingBalance} icon={null} />
          </div>

          {/* Transaction Table */}
          <Table
            columns={ledgerColumns}
            data={ledgerData?.transactions || []}
            loading={loading}
            rowKey={(_, index) => index}
            page={ledgerData.pagination?.page || page}
            pageSize={pageSize}
            totalItems={ledgerData.pagination?.total ?? 0}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[25, 50, 100, 200]}
            paginationDisabled={loading}
            itemLabel="approved ledger transactions"
            minWidth="min-w-[880px]"
            emptyIcon={ArrowLeftRight}
            emptyMessage="No transactions in this period"
            emptyDescription="This account has no approved journal lines between the selected dates."
            // Opening and closing balances bracket the transactions the way a
            // printed ledger does, rather than sitting in separate cards.
            leadingRow={
              <tr className="bg-slate-50/70 italic">
                <td className="px-4 py-3 text-sm text-slate-500" colSpan={5}>
                  Opening Balance
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-medium tabular-nums text-slate-900">
                  {formatCurrency(ledgerData.openingBalance)}{" "}
                  {ledgerData.openingBalanceType === "debit" ? "Dr" : "Cr"}
                </td>
              </tr>
            }
            footer={
              <tr className="border-t-2 border-slate-200 bg-slate-100">
                <td
                  className="px-4 py-3 text-sm font-bold text-slate-900"
                  colSpan={5}>
                  Closing Balance
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                  {formatCurrency(ledgerData.closingBalance)}{" "}
                  {ledgerData.closingBalanceType === "debit" ? "Dr" : "Cr"}
                </td>
              </tr>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <ArrowLeftRight size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">
            No Ledger Selected
          </h3>
          <p className="text-slate-500 max-w-xs text-center mt-1">
            Select an account and date range above to generate the general
            ledger report.
          </p>
        </div>
      )}
    </div>
  );
};

export default Ledger;
