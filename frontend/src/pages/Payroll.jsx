import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus, Edit2, Trash2, Search, Loader, X,
  CheckCircle, Users, Wallet, TrendingDown, TrendingUp,
  FileText, Eye, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, CalendarDays,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  fetchPayroll, createPayroll, updatePayroll,
  deletePayroll, approvePayroll,
  clearError, clearSuccess,
} from "../store/slices/payrollSlice";
import { selectOrgInfo } from "../store/slices/settingsSlice";
import { useEmployees } from "../hooks/useEmployees";
import SectionHeader from "../components/common/SectionHeader";
import { Modal, Select } from "../components/common";
import { payrollAPI } from "../services/apiMethods";
import PayslipPreview from "../components/payroll/PayslipPreview";

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const SALARY_TYPES = ["monthly", "contract", "hourly"];
const NOW          = new Date();
const CUR_MONTH    = NOW.getMonth() + 1;
const CUR_YEAR     = NOW.getFullYear();
const YEARS        = Array.from({ length: 6 }, (_, i) => CUR_YEAR - i);

const STATUS_FILTER_OPTIONS = [
  { value: "",         label: "All Status"  },
  { value: "pending",  label: "Pending"     },
  { value: "approved", label: "Approved"    },
  { value: "rejected", label: "Rejected"    },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const netSalary = (b, a, d) => (Number(b) || 0) + (Number(a) || 0) - (Number(d) || 0);

const statusBadge = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50  text-rose-700  border-rose-200",
  paid:     "bg-blue-50  text-blue-700  border-blue-200",
  pending:  "bg-amber-50 text-amber-700 border-amber-200",
};

function avatarBg(name = "") {
  const palette = ["bg-blue-500","bg-indigo-500","bg-violet-500","bg-teal-500","bg-emerald-500","bg-rose-500"];
  return palette[(name.charCodeAt(0) || 0) % palette.length];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, iconBg, iconColor, accent }) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${accent ?? "border-slate-200"}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon size={16} className={iconColor} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
      {children}
    </label>
  );
}

function FormInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none
        focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all ${className}`}
    />
  );
}

function FormSelect({ children, className = "", ...props }) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none
        focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all ${className}`}
    >
      {children}
    </select>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Payroll() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch  = useDispatch();
  const { items, pagination, loading, error, success } = useSelector((s) => s.payroll);
  const { data: employees = [] } = useEmployees();
  const { user }   = useSelector((s) => s.auth);
  const orgInfo    = useSelector(selectOrgInfo);

  // ── URL-driven filter state ──────────────────────────────────────────────────
  const month  = Number(searchParams.get("month")  || CUR_MONTH);
  const year   = Number(searchParams.get("year")   || CUR_YEAR);
  const page   = Number(searchParams.get("page")   || "1");
  const limit  = Number(searchParams.get("limit")  || "20");
  const status = searchParams.get("status") || "";
  const searchQ = searchParams.get("search") || "";

  const [localSearch, setLocalSearch] = useState(searchQ);
  const [refreshKey,  setRefreshKey]  = useState(0);

  // ── UI modal state ───────────────────────────────────────────────────────────
  const [showModal,      setShowModal]      = useState(false);
  const [editingId,      setEditingId]      = useState(null);
  const [previewPayroll, setPreviewPayroll] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloading,    setDownloading]    = useState(false);

  const [formData, setFormData] = useState({
    employee: "", month: CUR_MONTH, year: CUR_YEAR,
    salaryType: "monthly", baseSalary: "", allowances: "", deductions: "", notes: "",
  });

  // ── Set URL defaults on first load ───────────────────────────────────────────
  useEffect(() => {
    if (!searchParams.get("month") || !searchParams.get("year")) {
      const p = Object.fromEntries(searchParams.entries());
      if (!p.month) p.month = String(CUR_MONTH);
      if (!p.year)  p.year  = String(CUR_YEAR);
      setSearchParams(p, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch on any filter/page/refresh change ──────────────────────────────────
  useEffect(() => {
    dispatch(fetchPayroll({
      month, year, page, limit,
      search: searchQ || undefined,
      approvalStatus: status || undefined,
    }));
  }, [dispatch, month, year, page, limit, searchQ, status, refreshKey]);

  // ── Search debounce ──────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      const current = searchParams.get("search") || "";
      const trimmed = localSearch.trim();
      if (current === trimmed) return;
      const p = Object.fromEntries(searchParams.entries());
      if (trimmed) {
        setSearchParams({ ...p, search: trimmed, page: "1" });
      } else {
        delete p.search;
        p.page = "1";
        setSearchParams(p);
      }
    }, 450);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  // ── Redux success / error ────────────────────────────────────────────────────
  useEffect(() => {
    if (success) {
      toast.success(editingId ? "Payroll record updated!" : "Payroll generated successfully!");
      dispatch(clearSuccess());
      setShowModal(false);
      resetForm();
      setRefreshKey((k) => k + 1);
    }
  }, [success, dispatch, editingId]);

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error, dispatch]);

  // ── URL param helpers ────────────────────────────────────────────────────────
  const setParam = (key, value) => {
    const p = Object.fromEntries(searchParams.entries());
    p[key]  = String(value);
    p.page  = "1";
    setSearchParams(p);
  };

  const handlePageChange = (newPage) => {
    const p = Object.fromEntries(searchParams.entries());
    setSearchParams({ ...p, page: String(newPage) });
  };

  const handleLimitChange = (newLimit) => {
    const p = Object.fromEntries(searchParams.entries());
    setSearchParams({ ...p, limit: String(newLimit), page: "1" });
  };

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      employee: "", month: CUR_MONTH, year: CUR_YEAR,
      salaryType: "monthly", baseSalary: "", allowances: "", deductions: "", notes: "",
    });
    setEditingId(null);
  };

  const handleOpenModal = (payroll = null) => {
    if (payroll) {
      setFormData({
        ...payroll,
        employee: payroll.employee?._id || payroll.employee,
        baseSalary: payroll.baseSalary || "",
        allowances: payroll.allowances || "",
        deductions: payroll.deductions || "",
      });
      setEditingId(payroll._id);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "month" ? Number(value) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      baseSalary: parseFloat(formData.baseSalary) || 0,
      allowances: parseFloat(formData.allowances) || 0,
      deductions: parseFloat(formData.deductions) || 0,
      year: Number(formData.year) || CUR_YEAR,
    };
    editingId
      ? dispatch(updatePayroll({ id: editingId, data }))
      : dispatch(createPayroll(data));
  };

  // ── Action handlers ──────────────────────────────────────────────────────────
  const handleApprove = async (payrollId) => {
    try {
      await dispatch(approvePayroll(payrollId)).unwrap();
      toast.success("Payroll approved!");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to approve payroll");
    }
  };

  const handleDelete = async (payrollId) => {
    if (!window.confirm("Delete this payroll record? This cannot be undone.")) return;
    try {
      await dispatch(deletePayroll(payrollId)).unwrap();
      toast.success("Payroll record deleted.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to delete payroll");
    }
  };

  const handlePreview = async (payroll) => {
    setPreviewLoading(true);
    try {
      const res  = await payrollAPI.getById(payroll._id);
      const full = res.data?.data ?? res.data;
      setPreviewPayroll(full);
    } catch {
      toast.error("Failed to load payslip preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (payroll) => {
    setDownloading(true);
    try {
      const res  = await payrollAPI.generatePayslip(payroll._id);
      const url  = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href     = url;
      link.download = `payslip-${payroll.employee?.employeeCode || payroll._id}-${payroll.month}-${payroll.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Payslip downloaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download payslip");
    } finally {
      setDownloading(false);
    }
  };

  // ── Derived stats (from current page items) ──────────────────────────────────
  const totalNet       = items.reduce((s, p) => s + netSalary(p.baseSalary, p.allowances, p.deductions), 0);
  const totalAllow     = items.reduce((s, p) => s + (Number(p.allowances) || 0), 0);
  const totalDed       = items.reduce((s, p) => s + (Number(p.deductions) || 0), 0);
  const pendingCount   = items.filter((p) => p.approvalStatus === "pending").length;

  const periodLabel    = `${MONTHS[month - 1]} ${year}`;
  const totalPages     = pagination.totalPages || 1;
  const totalRecords   = pagination.total      || 0;
  const rangeStart     = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd       = Math.min(page * limit, totalRecords);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Users}
        title="Payroll Registry"
        description="Process salaries, manage deductions, and track disbursement history."
        buttonText="Generate Payroll"
        onButtonClick={() => handleOpenModal()}
        buttonIcon={Plus}
      />

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Net Disbursement"
          value={`৳${totalNet.toLocaleString()}`}
          icon={Wallet}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
        />
        <StatCard
          label="Total Allowances"
          value={`৳${totalAllow.toLocaleString()}`}
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Total Deductions"
          value={`৳${totalDed.toLocaleString()}`}
          icon={TrendingDown}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          label="Pending Approval"
          value={`${pendingCount} record${pendingCount !== 1 ? "s" : ""}`}
          icon={CalendarDays}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* ── Table card ── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">

        {/* Toolbar */}
        <div className="border-b border-slate-100 bg-slate-50/40 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

            {/* Left: Period + Status */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Month */}
              <div className="flex items-center gap-1.5">
                <CalendarDays size={14} className="text-slate-400 shrink-0" />
                <div className="w-36">
                  <Select
                    value={month}
                    onChange={(e) => setParam("month", e.target.value)}
                    className="min-h-0 py-1.5 rounded-lg font-medium">
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Year */}
              <div className="w-24">
                <Select
                  value={year}
                  onChange={(e) => setParam("year", e.target.value)}
                  className="min-h-0 py-1.5 rounded-lg font-medium">
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </Select>
              </div>

              {/* Status */}
              <div className="w-36">
                <Select
                  value={status}
                  onChange={(e) => setParam("status", e.target.value)}
                  className="min-h-0 py-1.5 rounded-lg">
                  {STATUS_FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Right: Search */}
            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search employee…"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800
                  placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5 text-center">Period</th>
                <th className="px-5 py-3.5">Payroll No.</th>
                <th className="px-5 py-3.5">Earnings / Deductions</th>
                <th className="px-5 py-3.5 text-right">Net Pay</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <CalendarDays size={32} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-medium text-slate-400">
                      No payroll records for {periodLabel}
                      {searchQ && ` matching "${searchQ}"`}
                      {status && ` with status "${status}"`}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((p) => {
                  const net = netSalary(p.baseSalary, p.allowances, p.deductions);
                  const badge = statusBadge[p.approvalStatus] ?? statusBadge.pending;
                  return (
                    <tr key={p._id} className="group transition-colors hover:bg-slate-50/70">
                      {/* Employee */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarBg(p.employee?.name)}`}>
                            {p.employee?.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">{p.employee?.name}</p>
                            <p className="font-mono text-[11px] text-slate-400 uppercase">
                              {p.employee?.employeeCode} · {p.salaryType}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Period */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 whitespace-nowrap">
                          {MONTHS[p.month - 1]?.slice(0, 3)} {p.year}
                        </span>
                      </td>

                      {/* Payroll No */}
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-slate-500">{p.payrollNumber || "—"}</span>
                      </td>

                      {/* Earnings / Deductions */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-14 text-slate-400">Base</span>
                            <span className="font-medium text-slate-700">৳{(p.baseSalary || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-14 text-emerald-500">Allow</span>
                            <span className="font-medium text-emerald-600">+৳{(p.allowances || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-14 text-rose-400">Deduct</span>
                            <span className="font-medium text-rose-600">-৳{(p.deductions || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </td>

                      {/* Net Pay */}
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-base font-bold text-slate-900">৳{net.toLocaleString()}</span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide ${badge}`}>
                          {(p.approvalStatus || "pending").toUpperCase()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          {p.approvalStatus === "pending" && (
                            <>
                              <ActionBtn
                                title="Edit"
                                onClick={() => handleOpenModal(p)}
                                hoverCls="hover:text-blue-600 hover:bg-blue-50">
                                <Edit2 size={15} />
                              </ActionBtn>
                              {user?.role === "director" && (
                                <ActionBtn
                                  title="Approve"
                                  onClick={() => handleApprove(p._id)}
                                  hoverCls="hover:text-emerald-600 hover:bg-emerald-50">
                                  <CheckCircle size={15} />
                                </ActionBtn>
                              )}
                              <ActionBtn
                                title="Delete"
                                onClick={() => handleDelete(p._id)}
                                hoverCls="hover:text-rose-600 hover:bg-rose-50">
                                <Trash2 size={15} />
                              </ActionBtn>
                            </>
                          )}
                          <ActionBtn
                            title="Preview payslip"
                            onClick={() => handlePreview(p)}
                            disabled={previewLoading}
                            hoverCls="hover:text-indigo-600 hover:bg-indigo-50">
                            {previewLoading ? <Loader size={15} className="animate-spin" /> : <Eye size={15} />}
                          </ActionBtn>
                          <ActionBtn
                            title="Download PDF"
                            onClick={() => handleDownload(p)}
                            disabled={downloading}
                            hoverCls="hover:text-blue-600 hover:bg-blue-50">
                            {downloading ? <Loader size={15} className="animate-spin" /> : <FileText size={15} />}
                          </ActionBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination bar ── */}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3
          sm:flex-row sm:items-center sm:justify-between sm:px-5">

          {/* Left: record info */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
            <span>
              <span className="font-semibold text-slate-800">{totalRecords}</span>{" "}
              {totalRecords === 1 ? "record" : "records"} · {periodLabel}
            </span>
            {totalRecords > 0 && (
              <>
                <span className="hidden text-slate-300 sm:inline">|</span>
                <span>
                  Showing{" "}
                  <span className="font-semibold text-slate-800">{rangeStart}</span>
                  {rangeEnd > rangeStart && <>–<span className="font-semibold text-slate-800">{rangeEnd}</span></>}
                </span>
                <span className="hidden text-slate-300 sm:inline">|</span>
                <span>
                  Page <span className="font-semibold text-slate-800">{page}</span>
                  {" "}of <span className="font-semibold text-slate-800">{totalPages}</span>
                </span>
              </>
            )}
          </div>

          {/* Right: rows-per-page + navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="hidden text-xs text-slate-500 sm:inline">Rows</label>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-100">
                {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <span className="hidden h-4 w-px bg-slate-200 sm:block" />

            <div className="flex items-center gap-1">
              {[
                { icon: ChevronsLeft,  fn: () => handlePageChange(1),            dis: page <= 1,           title: "First" },
                { icon: ChevronLeft,   fn: () => handlePageChange(page - 1),     dis: page <= 1,           title: "Prev"  },
                { icon: ChevronRight,  fn: () => handlePageChange(page + 1),     dis: page >= totalPages,  title: "Next"  },
                { icon: ChevronsRight, fn: () => handlePageChange(totalPages),   dis: page >= totalPages,  title: "Last"  },
              ].map(({ icon: Icon, fn, dis, title }) => (
                <button
                  key={title}
                  onClick={fn}
                  disabled={dis}
                  title={title}
                  aria-label={title}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500
                    hover:bg-slate-50 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-40 transition">
                  <Icon size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Payslip Preview Modal ── */}
      {previewPayroll && (
        <Modal isOpen={!!previewPayroll} onClose={() => setPreviewPayroll(null)} title="Payslip Preview" size="4xl">
          <PayslipPreview
            payroll={previewPayroll}
            orgInfo={orgInfo}
            onClose={() => setPreviewPayroll(null)}
            onDownload={() => handleDownload(previewPayroll)}
            downloading={downloading}
          />
        </Modal>
      )}

      {/* ── Generate / Edit Modal ── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Update Payroll Record" : "New Payroll Disbursement"}
        description={editingId ? "Adjust the payroll figures for this period." : "Generate payroll for the selected employee and period."}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
              {/* Employee */}
              <div>
                <FieldLabel>Employee</FieldLabel>
                <FormSelect name="employee" value={formData.employee} onChange={handleChange} required>
                  <option value="">Select employee…</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.employeeCode})
                    </option>
                  ))}
                </FormSelect>
              </div>

              {/* Period + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Salary Period</FieldLabel>
                  <div className="flex gap-2">
                    <FormSelect name="month" value={formData.month} onChange={handleChange} className="flex-1">
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </FormSelect>
                    <FormInput
                      name="year" type="number" value={formData.year}
                      onChange={handleChange} className="w-24"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Salary Type</FieldLabel>
                  <FormSelect name="salaryType" value={formData.salaryType} onChange={handleChange}>
                    {SALARY_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </FormSelect>
                </div>
              </div>

              {/* Financial breakdown */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Financial Breakdown
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Base Salary</FieldLabel>
                    <FormInput
                      name="baseSalary" type="number" value={formData.baseSalary}
                      onChange={handleChange} required placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1.5">
                      Allowances
                    </label>
                    <FormInput
                      name="allowances" type="number" value={formData.allowances}
                      onChange={handleChange} placeholder="0"
                      className="border-emerald-100 bg-emerald-50/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-rose-500 uppercase tracking-wide mb-1.5">
                      Deductions
                    </label>
                    <FormInput
                      name="deductions" type="number" value={formData.deductions}
                      onChange={handleChange} placeholder="0"
                      className="border-rose-100 bg-rose-50/30"
                    />
                  </div>
                </div>
              </div>

              {/* Net payout + actions */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 text-white">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Net Payout
                  </p>
                  <p className="text-2xl font-bold mt-0.5">
                    ৳{netSalary(formData.baseSalary, formData.allowances, formData.deductions).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition">
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl bg-white px-6 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100 disabled:opacity-60 transition">
                    {loading && <Loader size={13} className="animate-spin" />}
                    {editingId ? "Update Record" : "Commit Payroll"}
                  </button>
                </div>
              </div>
            </form>
      </Modal>
    </div>
  );
}

// ── Tiny action button ─────────────────────────────────────────────────────────
function ActionBtn({ children, hoverCls = "", ...props }) {
  return (
    <button
      {...props}
      className={`flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition ${hoverCls}
        disabled:pointer-events-none disabled:opacity-40`}>
      {children}
    </button>
  );
}
