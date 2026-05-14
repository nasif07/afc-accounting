import {
  AlertCircle,
  Coins,
  Download,
  FileText,
  Loader,
  Plus,
  Printer,
  ReceiptText,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";

import { createPettyCash, clearError } from "../store/slices/pettyCashSlice";
import { fetchCoa } from "../store/slices/coaSlice";
import { pettyCashAPI } from "../services/apiMethods";
import SectionHeader from "../components/common/SectionHeader";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import Button from "../components/common/Button";
import PettyCashReport from "../components/reports/PettyCashReport";
import { formatCurrency } from "../utils/currency";

const PETTY_CASH_ACCOUNT_CODE = "1001";
const DEFAULT_PAGE_SIZE = 20;

const initialFormData = {
  date: new Date().toISOString().split("T")[0],
  description: "",
  amount: "",
  paidTo: "",
  expenseAccount: "",
  referenceNumber: "",
};

const toDateInputValue = (date) => {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().split("T")[0];
};

const formatDate = (date) => {
  if (!date) return "---";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "---";
  return parsed.toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatReportDate = (date) => {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-GB");
};

export default function PettyCash() {
  const dispatch = useDispatch();
  const reportRef = useRef(null);

  const { loading: pettyCashSaving, error } = useSelector(
    (state) => state.pettyCash,
  );
  const { items: accounts = [] } = useSelector((state) => state.coa);
  const { user } = useSelector((state) => state.auth);

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalDebit: 0,
    totalCredit: 0,
    balance: 0,
    count: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    totalPages: 1,
  });
  const [pettyCashAccount, setPettyCashAccount] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const canCreatePettyCash =
    user?.role === "director" ||
    user?.role === "accountant" ||
    user?.role === "sub-accountant";

  const expenseAccounts = useMemo(() => {
    return accounts.filter((account) => account.accountType === "expense");
  }, [accounts]);

  const fetchPettyCashHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError("");

      const response = await pettyCashAPI.getTransactions({
        page: currentPage,
        limit: DEFAULT_PAGE_SIZE,
        search: searchTerm || undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      });
      const payload = response?.data?.data || {};

      setPettyCashAccount(payload.account || null);
      setTransactions(Array.isArray(payload.transactions) ? payload.transactions : []);
      setSummary({
        totalDebit: Number(payload.summary?.totalDebit || 0),
        totalCredit: Number(payload.summary?.totalCredit || 0),
        balance: Number(payload.summary?.balance || 0),
        count: Number(payload.summary?.count || 0),
      });
      setPagination({
        total: Number(payload.pagination?.total || 0),
        page: Number(payload.pagination?.page || 1),
        limit: Number(payload.pagination?.limit || DEFAULT_PAGE_SIZE),
        totalPages: Number(payload.pagination?.totalPages || 1),
      });
    } catch (err) {
      setHistoryError(
        err?.response?.data?.message || "Failed to load petty cash history",
      );
      setTransactions([]);
      setSummary({
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
        count: 0,
      });
      setPagination({
        total: 0,
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        totalPages: 1,
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    dispatch(fetchCoa());
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setSearchTerm(searchInput.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchPettyCashHistory();
  }, [currentPage, searchTerm, dateFrom, dateTo]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const reportData = useMemo(() => {
    const ascendingRows = [...transactions].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    const monthYear = dateFrom
      ? new Date(dateFrom).toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        })
      : "Selected Period";

    return {
      reportData: ascendingRows.map((row) => ({
        date: formatReportDate(row.date),
        expenditures: row.credit > 0 ? row.description : "Cash Deposit",
        cashReceivedPaidFrom: row.counterparty,
        cashReceived: row.debit,
        cashPayment: row.credit,
        balance: row.runningBalance,
        remarks: row.referenceNumber || row.voucherNumber,
      })),
      summary: {
        totalCashReceived: summary.totalDebit,
        totalCashPayment: summary.totalCredit,
        totalRecords: summary.count,
        closingBalance: summary.balance,
      },
      dateRange: {
        from: dateFrom || null,
        to: dateTo || null,
        monthYear,
      },
    };
  }, [transactions, summary, dateFrom, dateTo]);

  const resetForm = () => {
    setFormData(initialFormData);
    setFormError("");
  };

  const handleOpenModal = () => {
    setFormError("");
    resetForm();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormError("");
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.date) return "Date is required.";
    if (!formData.amount || Number(formData.amount) <= 0) {
      return "Amount must be greater than 0.";
    }
    if (!formData.description.trim()) return "Description is required.";
    if (!formData.expenseAccount) return "Please select an expense account.";
    return "";
  };

  const getErrorMessage = (err) => {
    if (typeof err === "string") return err;

    return (
      err?.message ||
      err?.error ||
      err?.data?.message ||
      err?.response?.data?.message ||
      "Something went wrong. Please try again."
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }

    const payload = {
      ...formData,
      amount: Number(formData.amount),
    };

    try {
      setIsSubmitting(true);
      setFormError("");

      await dispatch(createPettyCash(payload)).unwrap();
      toast.success("Petty cash expense posted to journal successfully.");

      handleCloseModal();
      fetchPettyCashHistory();
    } catch (err) {
      const message = getErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const handlePrint = () => {
    if (!reportRef.current) return;

    const printWindow = window.open("", "", "height=700,width=1000");
    if (!printWindow) {
      toast.error("Unable to open print window");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Petty Cash Report</title>
          <style>
            body { padding: 24px; font-family: Arial, sans-serif; color: #111827; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; border: 1px solid #111827; text-align: left; }
            th { background: #dcfce7; font-weight: 700; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>${reportRef.current.innerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadCSV = () => {
    if (transactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const rows = [
      [
        "Date",
        "Voucher",
        "Reference",
        "Type",
        "Description",
        "Account",
        "Money In",
        "Money Out",
        "Running Balance",
      ],
      ...transactions.map((row) => [
        formatDate(row.date),
        row.voucherNumber,
        row.referenceNumber,
        row.type,
        `"${row.description.replace(/"/g, '""')}"`,
        `"${row.counterparty.replace(/"/g, '""')}"`,
        row.debit,
        row.credit,
        row.runningBalance,
      ]),
    ];

    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `petty-cash-journal-${new Date()
      .toISOString()
      .split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Petty cash CSV exported");
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) {
      toast.error("No report content found to export");
      return;
    }

    let clone = null;

    try {
      toast.loading("Preparing PDF...", { id: "petty-cash-pdf" });

      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      clone = reportRef.current.cloneNode(true);
      clone.style.position = "fixed";
      clone.style.left = "0";
      clone.style.top = "0";
      clone.style.width = "794px";
      clone.style.background = "#ffffff";
      clone.style.zIndex = "-9999";
      document.body.appendChild(clone);

      clone.querySelectorAll("*").forEach((element) => {
        if (!(element instanceof HTMLElement)) return;

        element.style.color = "#111827";
        element.style.backgroundColor = "#ffffff";
        element.style.borderColor = "#111827";
      });

      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        width: 794,
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let position = 0;
      let heightLeft = imgHeight;

      pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `petty-cash-journal-${new Date().toISOString().split("T")[0]}.pdf`,
      );
      toast.success("Petty cash PDF exported", { id: "petty-cash-pdf" });
    } catch (err) {
      toast.error(err?.message || "Failed to export PDF", {
        id: "petty-cash-pdf",
      });
    } finally {
      if (clone && document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
    }
  };

  const isLoading = historyLoading;
  const canExport = transactions.length > 0;

  return (
    <div className="space-y-4 pb-10">
      <SectionHeader
        icon={Coins}
        title="Petty Cash Management"
        description={`Journal-based petty cash account (${PETTY_CASH_ACCOUNT_CODE})`}
        buttonText={canCreatePettyCash ? "Create Transaction" : ""}
        onButtonClick={handleOpenModal}
        buttonIcon={Plus}
      />

      {!isLoading && !historyError && !pettyCashAccount && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Petty Cash account code {PETTY_CASH_ACCOUNT_CODE} was not found in
          Chart of Accounts.
        </div>
      )}

      {historyError && (
        <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{historyError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Current Balance",
            value: formatCurrency(summary.balance),
            icon: Coins,
            iconBg: "bg-slate-50",
            iconColor: "text-slate-700",
          },
          {
            title: "Money In",
            value: formatCurrency(summary.totalDebit),
            icon: TrendingUp,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
          },
          {
            title: "Money Out",
            value: formatCurrency(summary.totalCredit),
            icon: TrendingDown,
            iconBg: "bg-rose-50",
            iconColor: "text-rose-600",
          },
          {
            title: "Transactions",
            value: summary.count,
            icon: ReceiptText,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}>
                  <Icon className={`h-5 w-5 ${item.iconColor}`} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {item.title}
                  </p>
                  <p className="mt-1 truncate text-xl font-bold text-slate-900">
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <Input
              type="text"
              placeholder="Search voucher, reference, description, or account..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>

          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />

          <Button
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            className="border-slate-300 text-slate-700 hover:bg-slate-50">
            Reset
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Transaction History
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Deposits and expenses are read only from approved journal lines.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowReport((value) => !value)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <FileText size={16} />
            {showReport ? "Hide Report" : "Show Report"}
          </button>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-14">
              <Loader className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
              <Coins className="h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                No petty cash transactions
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Manual deposits and auto-posted expenses will appear here after
                journal entries touch account {PETTY_CASH_ACCOUNT_CODE}.
              </p>
            </div>
          ) : (
            <table className="min-w-[980px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Date",
                    "Voucher",
                    "Type",
                    "Description",
                    "Account",
                    "Money In",
                    "Money Out",
                    "Balance",
                    "Source",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                        ["Money In", "Money Out", "Balance"].includes(heading)
                          ? "text-right"
                          : ""
                      }`}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {transactions.map((item) => (
                  <tr key={`${item.id}-${item.debit}-${item.credit}`}>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {formatDate(item.date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-sm font-bold text-blue-600">
                      {item.voucherNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
                          item.debit > 0
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}>
                        {item.type === "deposit" ? "Deposit" : "Expense"}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-4 text-sm text-slate-700">
                      <div className="truncate">{item.description || "---"}</div>
                      {item.referenceNumber && (
                        <div className="mt-1 text-xs text-slate-400">
                          Ref: {item.referenceNumber}
                        </div>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-4 text-sm text-slate-600">
                      {item.counterparty}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-semibold text-emerald-700">
                      {item.debit > 0 ? formatCurrency(item.debit) : "---"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-semibold text-rose-700">
                      {item.credit > 0 ? formatCurrency(item.credit) : "---"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-bold text-slate-900">
                      {formatCurrency(item.runningBalance)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm capitalize text-slate-500">
                      {String(item.sourceModule).replace(/_/g, " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:flex-row">
            <p className="text-sm text-slate-500">
              Showing page{" "}
              <span className="font-semibold text-slate-700">
                {pagination.page}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {pagination.totalPages}
              </span>{" "}
              for{" "}
              <span className="font-semibold text-slate-700">
                {pagination.total}
              </span>{" "}
              approved transactions
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={pagination.page <= 1 || isLoading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                Prev
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(pagination.totalPages, page + 1),
                  )
                }
                disabled={pagination.page >= pagination.totalPages || isLoading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showReport && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              disabled={!canExport}
              className="border-slate-300 text-slate-700 hover:bg-slate-50">
              <Printer size={16} />
              Print
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={!canExport}
              className="border-slate-300 text-slate-700 hover:bg-slate-50">
              <Download size={16} />
              Download PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadCSV}
              disabled={!canExport}
              className="border-slate-300 text-slate-700 hover:bg-slate-50">
              <FileText size={16} />
              Download CSV
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <PettyCashReport ref={reportRef} data={reportData} />
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm">
          <div className="min-h-full px-3 py-6 sm:px-4">
            <div className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    New Petty Cash Expense
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    This creates an auto-approved journal entry that credits
                    petty cash account {PETTY_CASH_ACCOUNT_CODE}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{formError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Date"
                    type="date"
                    name="date"
                    value={toDateInputValue(formData.date)}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting || pettyCashSaving}
                  />

                  <Input
                    label="Amount"
                    type="number"
                    name="amount"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                    min="0.01"
                    step="0.01"
                    disabled={isSubmitting || pettyCashSaving}
                  />
                </div>

                <Input
                  label="Description"
                  name="description"
                  placeholder="Describe the petty cash expense"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  textarea
                  rows={3}
                  disabled={isSubmitting || pettyCashSaving}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Select
                    label="Expense Account"
                    name="expenseAccount"
                    value={formData.expenseAccount}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting || pettyCashSaving}
                    placeholder="Select expense account"
                    options={expenseAccounts.map((account) => ({
                      label: `${account.accountCode} - ${account.accountName}`,
                      value: account._id,
                    }))}
                  />
                  <Input
                    label="Paid To"
                    name="paidTo"
                    placeholder="Person who received cash"
                    value={formData.paidTo}
                    onChange={handleChange}
                    disabled={isSubmitting || pettyCashSaving}
                  />
                </div>

                <Input
                  label="Reference Number"
                  name="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={handleChange}
                  placeholder="Optional reference number"
                  disabled={isSubmitting || pettyCashSaving}
                />

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 sm:w-auto">
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || pettyCashSaving}
                    loading={isSubmitting || pettyCashSaving}
                    className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto">
                    {isSubmitting || pettyCashSaving
                      ? "Posting..."
                      : "Post Expense"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
