import { useEffect, useMemo, useState } from "react";
import { Banknote, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { bankBookAPI, coaAPI } from "../services/apiMethods";
import SectionHeader from "../components/common/SectionHeader";
import BankBookCancelModal from "../components/bankBook/BankBookCancelModal";
import BankBookCollectionForm from "../components/bankBook/BankBookCollectionForm";
import BankBookDetailsModal from "../components/bankBook/BankBookDetailsModal";
import BankBookFilters from "../components/bankBook/BankBookFilters";
import BankBookStatement from "../components/bankBook/BankBookStatement";
import BankBookSummaryCards from "../components/bankBook/BankBookSummaryCards";
import {
  accountLabel,
  getErrorMessage,
  initialFormData,
} from "../components/bankBook/bankBookHelpers";
import { formatDisplayDate, todayISO, toISODate } from "../utils/date";

const DEFAULT_PAGE_SIZE = 20;

const firstDayOfCurrentMonth = () => {
  const now = new Date();
  return toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
};

const defaultFilters = () => ({
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

const defaultSummary = () => ({
  openingBalance: 0,
  totalDeposits: 0,
  totalPayments: 0,
  closingBalance: 0,
  count: 0,
});

export default function BankBook() {
  const [accounts, setAccounts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [summary, setSummary] = useState(defaultSummary());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ ...initialFormData, transactionDate: todayISO() });
  const [formError, setFormError] = useState("");
  const [detail, setDetail] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [filters, setFilters] = useState(defaultFilters());

  // ─── Derived options ────────────────────────────────────────────────────────

  const bankHeadOptions = useMemo(() => {
    const parentIds = new Set(
      accounts
        .map((a) => (typeof a.parentAccount === "object" ? a.parentAccount?._id : a.parentAccount))
        .filter(Boolean)
        .map(String),
    );
    return accounts
      .filter((a) => {
        const parentCode = typeof a.parentAccount === "object" ? a.parentAccount?.accountCode : "";
        return parentCode === "1002" && !parentIds.has(String(a._id)) && a.status === "active";
      })
      .map((a) => ({ value: a._id, label: accountLabel(a) }));
  }, [accounts]);

  const incomeHeadOptions = useMemo(() => {
    const parentIds = new Set(
      accounts
        .map((a) => (typeof a.parentAccount === "object" ? a.parentAccount?._id : a.parentAccount))
        .filter(Boolean)
        .map(String),
    );
    return accounts
      .filter((a) => {
        const type = String(a.accountType || "").toLowerCase();
        return ["income", "revenue"].includes(type) && !parentIds.has(String(a._id)) && a.status === "active";
      })
      .map((a) => ({ value: a._id, label: accountLabel(a) }));
  }, [accounts]);

  const selectedBankHead = accounts.find((a) => a._id === formData.bankHeadId);
  const selectedIncomeHead = accounts.find((a) => a._id === formData.incomeHeadId);
  const amount = Number(formData.amount || 0);
  const isPreviewBalanced =
    amount > 0 && formData.bankHeadId && formData.incomeHeadId && formData.bankHeadId !== formData.incomeHeadId;

  // ─── Data loading ────────────────────────────────────────────────────────────

  const loadCollections = async (nextFilters = filters) => {
    if (!nextFilters.bankHeadId) {
      setCollections([]);
      setSummary(defaultSummary());
      return;
    }
    setLoading(true);
    try {
      const response = await bankBookAPI.getStatement(nextFilters);
      const payload = response?.data?.data || {};
      const rows = payload.rows || [];
      setCollections(rows);
      setSummary({
        openingBalance: Number(payload.openingBalance || 0),
        totalDeposits: Number(payload.totalDeposits || 0),
        totalPayments: Number(payload.totalPayments || 0),
        closingBalance: Number(payload.closingBalance || 0),
        count: rows.length,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load bank statement"));
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await coaAPI.getAll({ status: "active" });
      const active = (response?.data?.data || []).filter((a) => a.status === "active");
      const parentIds = new Set(
        active
          .map((a) => (typeof a.parentAccount === "object" ? a.parentAccount?._id : a.parentAccount))
          .filter(Boolean)
          .map(String),
      );
      const firstBank = active.find((a) => {
        const parentCode = typeof a.parentAccount === "object" ? a.parentAccount?.accountCode : "";
        return parentCode === "1002" && !parentIds.has(String(a._id)) && a.status === "active";
      });
      const next = firstBank
        ? { ...filters, bankHeadId: filters.bankHeadId || firstBank._id }
        : filters;
      setAccounts(active);
      setFilters(next);
      if (next.bankHeadId) loadCollections(next);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load account heads"));
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAccounts(); }, []);

  // ─── Form handlers ───────────────────────────────────────────────────────────

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormError("");
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "paymentMethod" && value !== "cheque" ? { chequeNumber: "", chequeDate: "" } : {}),
    }));
  };

  const handleDateChange = (name, value) => {
    setFormError("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ ...initialFormData, transactionDate: todayISO() });
    setFormError("");
  };

  const validateForm = () => {
    if (!formData.transactionDate) return "Date is required.";
    if (!formData.paymentPurpose) return "Payment purpose is required.";
    if (!formData.paymentMethod) return "Payment method is required.";
    if (!formData.bankHeadId) return "Bank Head is required.";
    if (!formData.incomeHeadId) return "Income Head is required.";
    if (formData.bankHeadId === formData.incomeHeadId) return "Bank Head and Income Head cannot be the same.";
    if (!amount || amount <= 0) return "Amount must be greater than 0.";
    if (formData.paymentMethod === "cheque") {
      if (!formData.chequeNumber.trim()) return "Cheque number is required.";
      if (!formData.chequeDate) return "Cheque date is required.";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setFormError(err);
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      await bankBookAPI.create({ ...formData, amount });
      toast.success("Student collection saved to journal");
      resetForm();
      await loadCollections({ ...filters, page: 1 });
    } catch (error) {
      const msg = getErrorMessage(error, "Failed to save collection");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Filter handlers ─────────────────────────────────────────────────────────

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const applyFilters = () => loadCollections({ ...filters, page: 1 });

  const resetFilters = () => {
    const next = { ...defaultFilters(), bankHeadId: filters.bankHeadId };
    setFilters(next);
    loadCollections(next);
  };

  // ─── Export & print ──────────────────────────────────────────────────────────

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

  const handleExport = async (format) => {
    if (!filters.bankHeadId) { toast.error("Select a Bank Head first"); return; }
    try {
      const response = format === "pdf"
        ? await bankBookAPI.exportPdf(filters)
        : await bankBookAPI.exportExcel(filters);
      downloadBlob(response.data, format === "pdf" ? "bank-statement.pdf" : "bank-statement.xls");
    } catch (error) {
      toast.error(getErrorMessage(error, "Export failed"));
    }
  };

  const printStatement = () => {
    if (!filters.bankHeadId) { toast.error("Select a Bank Head first"); return; }
    const bankHead = accounts.find((a) => a._id === filters.bankHeadId);
    const printWindow = window.open("", "", "height=720,width=1080");
    if (!printWindow) { toast.error("Unable to open print window"); return; }

    const money = (v) => Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const movMoney = (v) => (Number(v || 0) ? money(v) : "");
    const openingLabel = filters.dateFrom ? `Balance as of ${formatDisplayDate(filters.dateFrom)}` : "Current Balance";
    const rows = collections.map((row) => `
      <tr>
        <td>${formatDisplayDate(row.transactionDate)}</td>
        <td>${row.transactionDetails || ""}</td>
        <td>${row.chequeNumber || ""}</td>
        <td class="right">${movMoney(row.deposit)}</td>
        <td class="right">${movMoney(row.payment)}</td>
        <td class="right">${money(row.balance || row.runningBalance || 0)}</td>
        <td>${row.referenceNo || ""}</td>
        <td>${row.note || ""}</td>
      </tr>`).join("");

    printWindow.document.write(`<html><head><title>Bank Statement</title><style>
      @page{size:A4 landscape;margin:14mm}body{font-family:"Times New Roman",serif;color:#111827}
      h1,h2,p{margin:0}.center{text-align:center}
      .brand{display:grid;grid-template-columns:120px 1fr 120px;align-items:start}
      .brand img{width:92px}.meta{margin-top:7px;font-size:12px;font-weight:700}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:11px}
      th,td{border:1px solid #94a3b8;padding:5px;text-align:left;vertical-align:top}
      th{background:#ecf3df;font-weight:700}.right{text-align:right}
      .summary{width:42%;margin-left:70px;margin-top:14px;font-weight:700}
      .summary td{border:1px solid #94a3b8;padding:6px}
      .sign{margin-top:42px;margin-left:auto;width:260px;text-align:center;font-weight:700}
      .foot{position:fixed;bottom:0;left:0;right:0;display:flex;justify-content:space-between;font-size:10px}
    </style></head><body>
      <div class="brand"><img src="/afc-logo.jpg"/><div class="center">
        <h1>Alliance Francaise de Chittagong</h1><h2>Statement of Account</h2>
        <p class="meta">Period: ${filters.dateFrom || "Beginning"} to ${filters.dateTo || "Current"}</p>
      </div><span></span></div>
      <p class="meta">A/C Number: ${bankHead?.accountNumber || bankHead?.accountCode || ""}</p>
      <p class="meta">${bankHead?.accountName || accountLabel(bankHead)}</p>
      <table><thead><tr>
        <th>Date</th><th>Transaction Details</th><th>Cheque Number</th>
        <th>Deposit</th><th>Payment / Withdrawal</th><th>Balance</th><th>Remarks</th><th>Note</th>
      </tr></thead><tbody>
        <tr><td>${filters.dateFrom ? formatDisplayDate(filters.dateFrom) : ""}</td>
          <td><strong>${openingLabel}</strong></td><td></td><td></td><td></td>
          <td class="right"><strong>${money(summary.openingBalance)}</strong></td>
          <td>As per System</td><td></td></tr>
        ${rows}
        <tr><td>${filters.dateTo ? formatDisplayDate(filters.dateTo) : ""}</td>
          <td><strong>CLOSING BALANCE</strong></td><td></td><td></td><td></td>
          <td class="right"><strong>${money(summary.closingBalance)}</strong></td><td></td><td></td></tr>
      </tbody></table>
      <table class="summary">
        <tr><td>Total Deposits</td><td class="right">${money(summary.totalDeposits)}</td></tr>
        <tr><td>Total Payments</td><td class="right">${money(summary.totalPayments)}</td></tr>
      </table>
      <div class="sign"><div>Checked &amp; Approved</div><br/><br/><div>Signature</div></div>
      <div class="foot"><span>AFC/Statement_of_Account</span><span></span></div>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // ─── Cancel handler ──────────────────────────────────────────────────────────

  const cancelCollection = async () => {
    if (!cancelTarget?.journalEntryId) return;
    setSaving(true);
    try {
      await bankBookAPI.cancel(cancelTarget.journalEntryId, { reason: cancelReason });
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

  // ─── Render ──────────────────────────────────────────────────────────────────

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

      <BankBookCollectionForm
        formData={formData}
        formError={formError}
        saving={saving}
        bankHeadOptions={bankHeadOptions}
        incomeHeadOptions={incomeHeadOptions}
        selectedBankHead={selectedBankHead}
        selectedIncomeHead={selectedIncomeHead}
        amount={amount}
        isPreviewBalanced={isPreviewBalanced}
        onChange={handleFormChange}
        onDateChange={handleDateChange}
        onSubmit={handleSubmit}
        onReset={resetForm}
      />

      <BankBookSummaryCards summary={summary} />

      <BankBookFilters
        filters={filters}
        bankHeadOptions={bankHeadOptions}
        loading={loading}
        onFilterChange={handleFilterChange}
        onApply={applyFilters}
        onReset={resetFilters}
        onExport={handleExport}
        onPrint={printStatement}
      />

      <BankBookStatement
        collections={collections}
        loading={loading}
        summary={summary}
      />

      <BankBookDetailsModal detail={detail} onClose={() => setDetail(null)} />

      <BankBookCancelModal
        cancelTarget={cancelTarget}
        cancelReason={cancelReason}
        saving={saving}
        onReasonChange={setCancelReason}
        onConfirm={cancelCollection}
        onClose={() => { setCancelTarget(null); setCancelReason(""); }}
      />
    </div>
  );
}
