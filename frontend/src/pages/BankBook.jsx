import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { bankBookAPI, coaAPI } from "../services/apiMethods";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import DatePicker from "../components/common/DatePicker";
import Input from "../components/common/Input";
import Modal from "../components/common/Modal";
import SectionHeader from "../components/common/SectionHeader";
import Select from "../components/common/Select";
import { TableSkeleton } from "../components/common/Loaders";
import { formatCurrency } from "../utils/currency";
import { formatDisplayDate, todayISO, toISODate } from "../utils/date";

const DEFAULT_PAGE_SIZE = 20;

const paymentPurposes = [
  "Admission Fee",
  "Exam Fee",
  "Book Purchase",
  "Other Fee",
];

const paymentMethods = [
  ["cheque", "Cheque"],
  ["bank_transfer", "Bank Transfer"],
  ["bank_deposit", "Bank Deposit"],
  ["card_pos", "Card/POS"],
];

const initialFormData = {
  transactionDate: todayISO(),
  paymentPurpose: "Admission Fee",
  paymentMethod: "bank_transfer",
  incomeHeadId: "",
  bankHeadId: "",
  amount: "",
  chequeNumber: "",
  chequeDate: "",
  referenceNo: "",
  note: "",
};

const firstDayOfCurrentMonth = () => {
  const now = new Date();
  return toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
};

const getErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message || error?.message || fallback;

const asOptions = (items) =>
  items.map((item) =>
    Array.isArray(item)
      ? { value: item[0], label: item[1] }
      : { value: item, label: item },
  );

const accountLabel = (account) => {
  if (!account) return "---";
  return `${account.accountCode || ""} - ${account.accountName || ""}`.replace(
    /^ - /,
    "",
  );
};

const normalizeMethod = (value) => String(value || "").replace(/_/g, " ");

export default function BankBook() {
  const [accounts, setAccounts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [summary, setSummary] = useState({
    openingBalance: 0,
    totalDeposits: 0,
    totalPayments: 0,
    closingBalance: 0,
    count: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState("");
  const [detail, setDetail] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [filters, setFilters] = useState({
    dateFrom: firstDayOfCurrentMonth(),
    dateTo: todayISO(),
    paymentPurpose: "",
    paymentMethod: "",
    bankHeadId: "",
    voucherNo: "",
    referenceNo: "",
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  });

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        value: account._id,
        label: accountLabel(account),
      })),
    [accounts],
  );
  const bankHeadOptions = useMemo(() => {
    const parentIds = new Set(
      accounts
        .map((account) =>
          typeof account.parentAccount === "object"
            ? account.parentAccount?._id
            : account.parentAccount,
        )
        .filter(Boolean)
        .map(String),
    );

    return accounts
      .filter((account) => {
        const parent = account.parentAccount;
        const parentCode =
          typeof parent === "object" ? parent?.accountCode : "";

        return (
          parentCode === "1002" &&
          !parentIds.has(String(account._id)) &&
          account.status === "active"
        );
      })
      .map((account) => ({
        value: account._id,
        label: accountLabel(account),
      }));
  }, [accounts]);
  const incomeHeadOptions = useMemo(() => {
    const parentIds = new Set(
      accounts
        .map((account) =>
          typeof account.parentAccount === "object"
            ? account.parentAccount?._id
            : account.parentAccount,
        )
        .filter(Boolean)
        .map(String),
    );

    return accounts
      .filter((account) => {
        const type = String(account.accountType || "").toLowerCase();

        return (
          ["income", "revenue"].includes(type) &&
          !parentIds.has(String(account._id)) &&
          account.status === "active"
        );
      })
      .map((account) => ({
        value: account._id,
        label: accountLabel(account),
      }));
  }, [accounts]);

  const selectedBankHead = accounts.find(
    (account) => account._id === formData.bankHeadId,
  );
  const selectedIncomeHead = accounts.find(
    (account) => account._id === formData.incomeHeadId,
  );
  const amount = Number(formData.amount || 0);
  const isPreviewBalanced =
    amount > 0 &&
    formData.bankHeadId &&
    formData.incomeHeadId &&
    formData.bankHeadId !== formData.incomeHeadId;

  const loadAccounts = async () => {
    try {
      const response = await coaAPI.getAll({ status: "active" });
      const activeAccounts = (response?.data?.data || []).filter(
        (account) => account.status === "active",
      );
      const parentIds = new Set(
        activeAccounts
          .map((account) =>
            typeof account.parentAccount === "object"
              ? account.parentAccount?._id
              : account.parentAccount,
          )
          .filter(Boolean)
          .map(String),
      );
      const firstBankHead = activeAccounts.find((account) => {
        const parent = account.parentAccount;
        const parentCode =
          typeof parent === "object" ? parent?.accountCode : "";

        return (
          parentCode === "1002" &&
          !parentIds.has(String(account._id)) &&
          account.status === "active"
        );
      });
      const nextFilters = firstBankHead
        ? { ...filters, bankHeadId: filters.bankHeadId || firstBankHead._id }
        : filters;

      setAccounts(activeAccounts);
      setFilters(nextFilters);
      if (nextFilters.bankHeadId) {
        loadCollections(nextFilters);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load account heads"));
    }
  };

  const loadCollections = async (nextFilters = filters) => {
    if (!nextFilters.bankHeadId) {
      setCollections([]);
      setSummary({
        openingBalance: 0,
        totalDeposits: 0,
        totalPayments: 0,
        closingBalance: 0,
        count: 0,
      });
      setPagination({
        total: 0,
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        totalPages: 1,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await bankBookAPI.getStatement(nextFilters);
      const payload = response?.data?.data || {};
      const data = payload.rows || [];

      setCollections(data);
      setSummary({
        openingBalance: Number(payload.openingBalance || 0),
        totalDeposits: Number(payload.totalDeposits || 0),
        totalPayments: Number(payload.totalPayments || 0),
        closingBalance: Number(payload.closingBalance || 0),
        count: data.length,
      });
      setPagination({
        total: data.length,
        page: 1,
        limit: data.length || DEFAULT_PAGE_SIZE,
        totalPages: 1,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load bank statement"));
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormError("");
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "paymentMethod" && value !== "cheque"
        ? { chequeNumber: "", chequeDate: "" }
        : {}),
    }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setFormError("");
  };

  const validateForm = () => {
    if (!formData.transactionDate) return "Date is required.";
    if (!formData.paymentPurpose) return "Payment purpose is required.";
    if (!formData.paymentMethod) return "Payment method is required.";
    if (!formData.bankHeadId) return "Bank Head is required.";
    if (!formData.incomeHeadId) return "Income Head is required.";
    if (formData.bankHeadId === formData.incomeHeadId) {
      return "Bank Head and Income Head cannot be the same.";
    }
    if (!amount || amount <= 0) return "Amount must be greater than 0.";
    if (formData.paymentMethod === "cheque") {
      if (!formData.chequeNumber.trim()) return "Cheque number is required.";
      if (!formData.chequeDate) return "Cheque date is required.";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      await bankBookAPI.create({
        ...formData,
        amount,
      });
      toast.success("Student collection saved to journal");
      resetForm();
      await loadCollections({ ...filters, page: 1 });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to save collection");
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const applyFilters = () => {
    loadCollections({ ...filters, page: 1 });
  };

  const resetFilters = () => {
    const next = {
      dateFrom: firstDayOfCurrentMonth(),
      dateTo: todayISO(),
      paymentPurpose: "",
      paymentMethod: "",
      bankHeadId: filters.bankHeadId,
      voucherNo: "",
      referenceNo: "",
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    };
    setFilters(next);
    loadCollections(next);
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportFiltered = async (format) => {
    if (!filters.bankHeadId) {
      toast.error("Select a Bank Head first");
      return;
    }

    try {
      const response =
        format === "pdf"
          ? await bankBookAPI.exportPdf(filters)
          : await bankBookAPI.exportExcel(filters);
      downloadBlob(
        response.data,
        format === "pdf" ? "bank-statement.pdf" : "bank-statement.xls",
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Export failed"));
    }
  };

  const printStatement = () => {
    if (!filters.bankHeadId) {
      toast.error("Select a Bank Head first");
      return;
    }

    const bankHead = accounts.find((account) => account._id === filters.bankHeadId);
    const printWindow = window.open("", "", "height=720,width=1080");

    if (!printWindow) {
      toast.error("Unable to open print window");
      return;
    }

    const money = (value) =>
      Number(value || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    const movementMoney = (value) => (Number(value || 0) ? money(value) : "");
    const openingBalanceLabel = (() => {
      if (!filters.dateFrom) return "Current Balance";
      return `Balance as of ${formatDisplayDate(filters.dateFrom)}`;
    })();

    const rows = collections
      .map(
        (row) => `
          <tr>
            <td>${formatDisplayDate(row.transactionDate)}</td>
            <td>${row.transactionDetails || ""}</td>
            <td>${row.chequeNumber || ""}</td>
            <td class="right">${movementMoney(row.deposit)}</td>
            <td class="right">${movementMoney(row.payment)}</td>
            <td class="right">${money(row.balance || row.runningBalance || 0)}</td>
            <td>${row.referenceNo || ""}</td>
            <td>${row.note || ""}</td>
          </tr>
        `,
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Bank Statement</title>
          <style>
            @page { size: A4 landscape; margin: 14mm; }
            body { font-family: "Times New Roman", serif; color: #111827; }
            h1, h2, p { margin: 0; }
            .center { text-align: center; }
            .brand { display: grid; grid-template-columns: 120px 1fr 120px; align-items: start; }
            .brand img { width: 92px; }
            .meta { margin-top: 7px; font-size: 12px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
            th, td { border: 1px solid #94a3b8; padding: 5px; text-align: left; vertical-align: top; }
            th { background: #ecf3df; font-weight: 700; }
            .right { text-align: right; }
            .summary { width: 42%; margin-left: 70px; margin-top: 14px; font-weight: 700; }
            .summary td { border: 1px solid #94a3b8; padding: 6px; }
            .sign { margin-top: 42px; margin-left: auto; width: 260px; text-align: center; font-weight: 700; }
            .foot { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="brand">
            <img src="/afc-logo.jpg" />
            <div class="center">
              <h1>Alliance Francaise de Chittagong</h1>
              <h2>Statement of Account</h2>
              <p class="meta">Period: ${filters.dateFrom || "Beginning"} to ${filters.dateTo || "Current"}</p>
            </div>
            <span></span>
          </div>
          <p class="meta">A/C Number: ${bankHead?.accountNumber || bankHead?.accountCode || ""}</p>
          <p class="meta">${bankHead?.accountName || accountLabel(bankHead)}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction Details</th>
                <th>Cheque Number</th>
                <th>Deposit</th>
                <th>Payment / Withdrawal</th>
                <th>Balance</th>
                <th>Remarks</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${filters.dateFrom ? formatDisplayDate(filters.dateFrom) : ""}</td>
                <td><strong>${openingBalanceLabel}</strong></td>
                <td></td>
                <td></td>
                <td></td>
                <td class="right"><strong>${money(summary.openingBalance)}</strong></td>
                <td>As per System</td>
                <td></td>
              </tr>
              ${rows}
              <tr>
                <td>${filters.dateTo ? formatDisplayDate(filters.dateTo) : ""}</td>
                <td><strong>CLOSING BALANCE</strong></td>
                <td></td>
                <td></td>
                <td></td>
                <td class="right"><strong>${money(summary.closingBalance)}</strong></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <table class="summary">
            <tr><td>Total Deposits</td><td class="right">${money(summary.totalDeposits)}</td></tr>
            <tr><td>Total Payments</td><td class="right">${money(summary.totalPayments)}</td></tr>
          </table>
          <div class="sign">
            <div>Checked & Approved</div>
            <br /><br />
            <div>Signature</div>
          </div>
          <div class="foot"><span>AFC/Statement_of_Account</span><span></span></div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const printVoucher = (row) => {
    const printWindow = window.open("", "", "height=640,width=880");
    if (!printWindow) {
      toast.error("Unable to open print window");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${row.voucherNo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #0f172a; }
            .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 20px; }
            h1 { margin: 0 0 12px; font-size: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            td, th { border: 1px solid #cbd5e1; padding: 9px; text-align: left; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>Student Collection Voucher</h1>
            <p><strong>Voucher:</strong> ${row.voucherNo}</p>
            <p><strong>Date:</strong> ${formatDisplayDate(row.transactionDate)}</p>
            <p><strong>Purpose:</strong> ${row.paymentPurpose}</p>
            <p><strong>Method:</strong> ${normalizeMethod(row.paymentMethod)}</p>
            <table>
              <thead><tr><th>Account</th><th>Debit</th><th>Credit</th></tr></thead>
              <tbody>
                <tr><td>${accountLabel(row.bankHead)}</td><td class="right">${Number(row.amount || 0).toFixed(2)}</td><td class="right">-</td></tr>
                <tr><td>${accountLabel(row.incomeHead)}</td><td class="right">-</td><td class="right">${Number(row.amount || 0).toFixed(2)}</td></tr>
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const cancelCollection = async () => {
    if (!cancelTarget?.journalEntryId) return;
    setSaving(true);
    try {
      await bankBookAPI.cancel(cancelTarget.journalEntryId, {
        reason: cancelReason,
      });
      toast.success("Collection cancelled");
      setCancelTarget(null);
      setCancelReason("");
      await loadCollections(filters);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to cancel collection"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-10">
      <SectionHeader
        icon={Banknote}
        title="Student Collection"
        description="Simple student payment collection form backed by journal entries"
        buttonText="Refresh"
        buttonIcon={RefreshCw}
        onButtonClick={() => loadCollections(filters)}
      />

   

      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{formError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card title="Payment Information">
            <div className="space-y-4">
              <DatePicker
                label="Date"
                name="transactionDate"
                value={formData.transactionDate}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, transactionDate: value }))
                }
                required
              />
              <Select
                label="Payment Purpose"
                name="paymentPurpose"
                value={formData.paymentPurpose}
                onChange={handleFormChange}
                options={asOptions(paymentPurposes)}
                required
              />
              <Select
                label="Payment Method"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleFormChange}
                options={asOptions(paymentMethods)}
                required
              />
              <Input
                label="Amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.amount}
                onChange={handleFormChange}
                required
              />
            </div>
          </Card>

          <Card title="Account Selection">
            <div className="space-y-4">
              <Select
                label="Bank Head"
                name="bankHeadId"
                value={formData.bankHeadId}
                onChange={handleFormChange}
                options={bankHeadOptions}
                placeholder="Select bank, cheque, or POS head"
                required
              />
              <p className="text-xs leading-5 text-slate-500">
                This account will be debited. Choose the bank, cheque, or POS
                account that received the payment.
              </p>
              <Select
                label="Income Head"
                name="incomeHeadId"
                value={formData.incomeHeadId}
                onChange={handleFormChange}
                options={incomeHeadOptions}
                placeholder="Select income head"
                required
              />
              <p className="text-xs leading-5 text-slate-500">
                This account will be credited, such as Admission Fee Income,
                Exam Fee Income, or Book Sales Income.
              </p>
            </div>
          </Card>

          <Card title="Extra Details">
            <div className="space-y-4">
              {formData.paymentMethod === "cheque" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <Input
                    label="Cheque Number"
                    name="chequeNumber"
                    value={formData.chequeNumber}
                    onChange={handleFormChange}
                    required
                  />
                  <DatePicker
                    label="Cheque Date"
                    name="chequeDate"
                    value={formData.chequeDate}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, chequeDate: value }))
                    }
                    required
                  />
                </div>
              )}
              <Input
                label="Reference No"
                name="referenceNo"
                value={formData.referenceNo}
                onChange={handleFormChange}
                placeholder="Optional"
              />
              <Input
                label="Note"
                name="note"
                value={formData.note}
                onChange={handleFormChange}
                placeholder="Optional"
              />
            </div>
          </Card>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Journal Preview
              </h3>
              <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                <p>
                  <span className="text-slate-500">Debit:</span>{" "}
                  <span className="font-medium">
                    {accountLabel(selectedBankHead)}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Credit:</span>{" "}
                  <span className="font-medium">
                    {accountLabel(selectedIncomeHead)}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Amount:</span>{" "}
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </p>
              </div>
            </div>
            <Badge variant={isPreviewBalanced ? "success" : "warning"}>
              {isPreviewBalanced ? "Balanced" : "Incomplete"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={saving}
            className="border-slate-300 text-slate-700 hover:bg-slate-50">
            Reset
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={saving}
            className="border-slate-300 text-slate-700 hover:bg-slate-50">
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={saving}>
            <Plus size={16} />
            Save Payment
          </Button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Opening Balance", value: formatCurrency(summary.openingBalance) },
          { title: "Total Deposits", value: formatCurrency(summary.totalDeposits) },
          { title: "Total Payments", value: formatCurrency(summary.totalPayments) },
          { title: "Closing Balance", value: formatCurrency(summary.closingBalance) },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {item.title}
            </p>
            <p className="mt-1 truncate text-xl font-bold text-slate-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <Card
        title="Filters"
        subtitle="Select a Bank Head to generate the bank statement from journal lines">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4 xl:grid-cols-7">
          <DatePicker
            value={filters.dateFrom}
            onChange={(value) => setFilter("dateFrom", value)}
          />
          <DatePicker
            value={filters.dateTo}
            onChange={(value) => setFilter("dateTo", value)}
          />
          <Select
            value={filters.paymentPurpose}
            onChange={(e) => setFilter("paymentPurpose", e.target.value)}
            options={asOptions(paymentPurposes)}
            placeholder="All purposes"
          />
          <Select
            value={filters.paymentMethod}
            onChange={(e) => setFilter("paymentMethod", e.target.value)}
            options={asOptions(paymentMethods)}
            placeholder="All methods"
          />
          <Select
            value={filters.bankHeadId}
            onChange={(e) => setFilter("bankHeadId", e.target.value)}
            options={bankHeadOptions}
            placeholder="Bank head"
          />
          <Input
            value={filters.voucherNo}
            onChange={(e) => setFilter("voucherNo", e.target.value)}
            placeholder="Voucher no"
          />
          <Input
            value={filters.referenceNo}
            onChange={(e) => setFilter("referenceNo", e.target.value)}
            placeholder="Reference no"
          />
          <div className="flex flex-wrap gap-2 lg:col-span-4 xl:col-span-6">
            <Button type="button" onClick={applyFilters} loading={loading}>
              <RefreshCw size={16} />
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              className="border-slate-300 text-slate-700 hover:bg-slate-50">
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => exportFiltered("pdf")}>
              <Download size={16} />
              Download PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => exportFiltered("excel")}>
              <FileSpreadsheet size={16} />
              Download Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={printStatement}>
              <Printer size={16} />
              Print
            </Button>
          </div>
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Bank Statement
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Shows only journal lines related to the selected Bank Head.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={8} columns={8} />
          ) : collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
              <Banknote className="h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                No bank statement rows found
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Select a Bank Head or adjust filters to see journal-backed
                bank transactions.
              </p>
            </div>
          ) : (
            <table className="min-w-[1080px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Date",
                    "Transaction Details",
                    "Cheque Number",
                    "Deposit",
                    "Payment / Withdrawal",
                    "Balance",
                    "Remarks",
                    "Note",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                        ["Deposit", "Payment / Withdrawal", "Balance"].includes(heading)
                          ? "text-right"
                          : ""
                      }`}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {collections.map((row) => (
                  <tr key={row.journalEntryId}>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {formatDisplayDate(row.transactionDate)}
                    </td>
                    <td className="max-w-md px-4 py-4 text-sm text-slate-700">
                      <div className="font-medium">{row.transactionDetails}</div>
                      <div className="mt-1 font-mono text-xs text-blue-600">{row.voucherNo}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {row.chequeNumber || "---"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-semibold text-emerald-700">
                      {row.deposit ? formatCurrency(row.deposit) : "---"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-semibold text-rose-700">
                      {row.payment ? formatCurrency(row.payment) : "---"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-bold text-slate-900">
                      {formatCurrency(row.balance || row.runningBalance || 0)}
                    </td>
                    <td className="max-w-xs px-4 py-4 text-sm text-slate-600">
                      {row.referenceNo || row.remarks || "---"}
                    </td>
                    <td className="max-w-xs px-4 py-4 text-sm text-slate-600">
                      {row.note || "---"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {collections.length > 0 && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-4 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-bold uppercase text-slate-400">
                Total Deposits
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-emerald-700">
                {formatCurrency(summary.totalDeposits)}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-bold uppercase text-slate-400">
                Total Payments / Withdrawals
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-rose-700">
                {formatCurrency(summary.totalPayments)}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-bold uppercase text-slate-400">
                Closing Balance
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                {formatCurrency(summary.closingBalance)}
              </p>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title="Student Collection Details"
        size="lg">
        {detail && (
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            {[
              ["Voucher No", detail.voucherNo],
              ["Date", formatDisplayDate(detail.transactionDate)],
              ["Purpose", detail.paymentPurpose],
              ["Payment Method", normalizeMethod(detail.paymentMethod)],
              ["Bank Head", accountLabel(detail.bankHead)],
              ["Income Head", accountLabel(detail.incomeHead)],
              ["Amount", formatCurrency(detail.amount)],
              ["Reference No", detail.referenceNo || "---"],
              ["Cheque Number", detail.chequeNumber || "---"],
              [
                "Cheque Date",
                detail.chequeDate
                  ? formatDisplayDate(detail.chequeDate)
                  : "---",
              ],
              ["Created By", detail.createdBy?.name || "---"],
              ["Status", detail.status || detail.journalStatus],
              ["Note", detail.note || "---"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">
                  {label}
                </p>
                <p className="mt-1 break-words text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Collection">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Posted collections are reversed with a journal entry so accounting
            reports stay balanced.
          </p>
          <Input
            label="Reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Close
            </Button>
            <Button
              variant="danger"
              loading={saving}
              onClick={cancelCollection}>
              Cancel Collection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
