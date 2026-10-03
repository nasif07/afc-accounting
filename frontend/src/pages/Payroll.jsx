import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Edit2, Trash2, Search, Loader,
  CheckCircle, Users, Wallet, TrendingDown, TrendingUp,
  FileText, FileType, Eye, CalendarDays,
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
import { Modal, Select, Badge, Table } from "../components/common";
import { usePaginationParams } from "../hooks/usePaginationParams";
import { payrollAPI } from "../services/apiMethods";
import PayslipPreview from "../components/payroll/PayslipPreview";
import KPICard from "../components/reports/KPICard";
import { formatCurrency } from "../utils/currency";
import { resolveEarnings } from "../utils/payslipFields";
import { cn } from "../utils/cn";

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

const DOWNLOAD_MIME = {
  pdf:  "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const STATUS_FILTER_OPTIONS = [
  { value: "",         label: "All Status"  },
  { value: "pending",  label: "Pending"     },
  { value: "approved", label: "Approved"    },
  { value: "rejected", label: "Rejected"    },
];

// ── Zod validation schema ────────────────────────────────────────────────────
// Mirrors backend/src/validation/payroll.validation.js's createPayrollBody.
//
// Live bug found and fixed here: payroll.model.js declares `month` as a
// Mongoose String, and createPayrollBody/updatePayrollBody both require
// `month: z.string()` — Zod does NOT coerce a JS number to a string, it
// rejects it outright ("expected string, received number"). The old code's
// handleChange forced month to `Number(value)`, and the initial form state
// was already a number — so EVERY payroll create/update has been sending
// month as a number and failing with a 400 the entire time. Confirmed live
// against the backend (throwaway employee + payroll record, cleaned up
// after). Fixed by coercing month to a string before validation.
//
// The ৳0 salary guard added in Phase 1 is preserved exactly (same message,
// same trigger conditions: blank, non-numeric, or <= 0) — it's intentionally
// stricter than the backend's `nonNegative` (which allows 0).
const monthAsString = z.preprocess((v) => String(v), z.string().min(1, "Month is required"));

const baseSalaryGuard = z.preprocess(
  (v) => (v === "" || v == null ? NaN : parseFloat(v)),
  z.any().refine(
    (n) => typeof n === "number" && !Number.isNaN(n) && n > 0,
    "Enter a base salary greater than 0.",
  ),
);

const optionalNonNegative = (label) =>
  z.preprocess(
    (v) => (v === "" || v == null ? 0 : v),
    z.coerce.number().min(0, `${label} cannot be negative`),
  );

const payrollSchema = z.object({
  employee: z.string().min(1, "Please select an employee"),
  month: monthAsString,
  year: z.coerce.number().int("Enter a valid year").min(2000, "Enter a valid year").max(2100, "Enter a valid year"),
  salaryType: z.enum(SALARY_TYPES),
  baseSalary: baseSalaryGuard,
  // The payslip prints these as separate earnings lines. They used to be one
  // generic "Allowances" input (printed as House Rent) with no input at all
  // for Conveyance Allowance.
  houseRent: optionalNonNegative("House rent"),
  conveyanceAllowance: optionalNonNegative("Conveyance allowance"),
  deductions: optionalNonNegative("Deductions"),
});

const INITIAL_FORM_DATA = {
  employee: "", month: CUR_MONTH, year: CUR_YEAR,
  salaryType: "monthly", baseSalary: "", houseRent: "", conveyanceAllowance: "", deductions: "",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

// Earnings are Basic + House Rent + Conveyance Allowance, matching the
// payslip's earnings lines and the backend's calculateTotals.
const netSalary = (base, houseRent, conveyance, deductions) =>
  (Number(base) || 0) + (Number(houseRent) || 0) + (Number(conveyance) || 0) - (Number(deductions) || 0);

const STATUS_BADGE_VARIANT = {
  approved: "success",
  rejected: "rose",
  paid: "primary",
  pending: "warning",
};

function avatarBg(name = "") {
  const palette = ["bg-blue-500","bg-indigo-500","bg-violet-500","bg-teal-500","bg-emerald-500","bg-rose-500"];
  return palette[(name.charCodeAt(0) || 0) % palette.length];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
      {children}
    </label>
  );
}

// Both controls merge through `cn` (tailwind-merge) rather than string
// concatenation: appending "w-24" to a class list that already carries
// "w-full" is a coin flip decided by Tailwind's stylesheet order, which is
// what collapsed the month <select> to just its arrow.
const FIELD_CLASS = `w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none
  focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all`;

function FormInput({ className, ...props }) {
  return <input {...props} className={cn(FIELD_CLASS, className)} />;
}

function FormSelect({ children, className, ...props }) {
  return (
    <select {...props} className={cn(FIELD_CLASS, className)}>
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
  const { page, pageSize: limit, setPage, setPageSize } = usePaginationParams(20);
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

  const {
    register,
    handleSubmit: handleFormSubmit,
    reset,
    setError,
    watch,
    formState: { errors: formErrors },
  } = useForm({ resolver: zodResolver(payrollSchema), defaultValues: INITIAL_FORM_DATA });

  const watchedBaseSalary  = watch("baseSalary");
  const watchedHouseRent   = watch("houseRent");
  const watchedConveyance  = watch("conveyanceAllowance");
  const watchedDeductions  = watch("deductions");

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
  // Migration debt: this stays on the Redux thunk pattern rather than a full
  // React Query migration (out of scope for this pass given how tightly the
  // CRUD modal/success/error state is coupled to payrollSlice) — but the
  // dispatched thunk promise supports .abort(), so a fast filter change still
  // cancels the previous in-flight request instead of letting a stale
  // response land after a fresher one.
  useEffect(() => {
    const request = dispatch(fetchPayroll({
      month, year, page, limit,
      search: searchQ || undefined,
      approvalStatus: status || undefined,
    }));
    return () => request.abort();
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
  // resetForm closes over RHF's `reset`, which isn't a plain useState setter
  // ESLint can statically prove stable — omitted deliberately, same as the
  // search-debounce effect below, to avoid re-running this effect every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    reset(INITIAL_FORM_DATA);
    setEditingId(null);
  };

  const handleOpenModal = (payroll = null) => {
    if (payroll) {
      reset({
        employee: payroll.employee?._id || payroll.employee || "",
        month: payroll.month ?? CUR_MONTH,
        year: payroll.year ?? CUR_YEAR,
        salaryType: payroll.salaryType || "monthly",
        baseSalary: payroll.baseSalary ?? "",
        // Legacy records carry their earnings in allowances/bonus; resolve so
        // editing one shows the real figures rather than empty inputs.
        houseRent: resolveEarnings(payroll).houseRent || "",
        conveyanceAllowance: resolveEarnings(payroll).conveyanceAllowance || "",
        deductions: payroll.deductions ?? "",
      });
      setEditingId(payroll._id);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    const result = editingId
      ? await dispatch(updatePayroll({ id: editingId, data }))
      : await dispatch(createPayroll(data));

    if (result?.error) {
      const fieldErrors = result.payload?.errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        fieldErrors.forEach(({ field, message }) => {
          if (field) setError(field, { type: "server", message });
        });
      }
    }
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

  // "docx" hands the accountant an editable Word copy; "pdf" is the archival one.
  const handleDownload = async (payroll, format = "pdf") => {
    setDownloading(format);
    try {
      const res  = await payrollAPI.generatePayslip(payroll._id, format);
      const url  = URL.createObjectURL(new Blob([res.data], { type: DOWNLOAD_MIME[format] }));
      const link = document.createElement("a");
      link.href     = url;
      link.download = `payslip-${payroll.employee?.employeeCode || payroll._id}-${payroll.month}-${payroll.year}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(format === "docx" ? "Word payslip downloaded" : "Payslip downloaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download payslip");
    } finally {
      setDownloading(false);
    }
  };

  // ── Derived stats (from current page items) ──────────────────────────────────
  const totalNet       = items.reduce((s, p) => { const e = resolveEarnings(p); return s + netSalary(p.baseSalary, e.houseRent, e.conveyanceAllowance, p.deductions); }, 0);
  const totalAllow     = items.reduce((s, p) => { const e = resolveEarnings(p); return s + e.houseRent + e.conveyanceAllowance; }, 0);
  const totalDed       = items.reduce((s, p) => s + (Number(p.deductions) || 0), 0);
  const pendingCount   = items.filter((p) => p.approvalStatus === "pending").length;

  const periodLabel    = `${MONTHS[month - 1]} ${year}`;
  const totalRecords   = pagination.total      || 0;

  // ── Columns ───────────────────────────────────────────────────────────────────
  // Shared Table renders these as rows on desktop and as cards on mobile.
  const payrollColumns = [
    {
      key: "employee",
      label: "Employee",
      primary: true,
      wrap: true,
      render: (employee, row) => (
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarBg(employee?.name)}`}>
            {employee?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {employee?.name}
            </p>
            <p className="font-mono text-[11px] uppercase text-slate-400">
              {employee?.employeeCode} · {row.salaryType}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "period",
      label: "Period",
      align: "center",
      render: (_, row) => (
        <span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          {MONTHS[row.month - 1]?.slice(0, 3)} {row.year}
        </span>
      ),
    },
    {
      key: "payrollNumber",
      label: "Payroll No.",
      mono: true,
      className: "text-xs text-slate-500",
      render: (value) => value || "—",
    },
    {
      key: "breakdown",
      label: "Earnings / Deductions",
      render: (_, row) => (
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-14 text-slate-400">Base</span>
            <span className="font-medium text-slate-700">
              {formatCurrency(row.baseSalary || 0)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-14 text-emerald-500">Allow</span>
            <span className="font-medium text-emerald-600">
              +{formatCurrency(resolveEarnings(row).houseRent + resolveEarnings(row).conveyanceAllowance)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-14 text-rose-400">Deduct</span>
            <span className="font-medium text-rose-600">
              -{formatCurrency(row.deductions || 0)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "netPay",
      label: "Net Pay",
      align: "right",
      mono: true,
      className: "text-base font-bold text-slate-900",
      render: (_, row) =>
        formatCurrency(netSalary(row.baseSalary, resolveEarnings(row).houseRent, resolveEarnings(row).conveyanceAllowance, row.deductions)),
    },
    {
      key: "approvalStatus",
      label: "Status",
      render: (value) => (
        <Badge
          variant={STATUS_BADGE_VARIANT[value] ?? STATUS_BADGE_VARIANT.pending}
          size="sm">
          {(value || "pending").toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      type: "actions",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-0.5">
          {row.approvalStatus === "pending" && (
            <>
              <ActionBtn
                title="Edit"
                onClick={() => handleOpenModal(row)}
                hoverCls="hover:text-blue-600 hover:bg-blue-50">
                <Edit2 size={15} />
              </ActionBtn>
              {user?.role === "director" && (
                <ActionBtn
                  title="Approve"
                  onClick={() => handleApprove(row._id)}
                  hoverCls="hover:text-emerald-600 hover:bg-emerald-50">
                  <CheckCircle size={15} />
                </ActionBtn>
              )}
              <ActionBtn
                title="Delete"
                onClick={() => handleDelete(row._id)}
                hoverCls="hover:text-red-600 hover:bg-red-50">
                <Trash2 size={15} />
              </ActionBtn>
            </>
          )}
          <ActionBtn
            title="Preview payslip"
            onClick={() => handlePreview(row)}
            disabled={previewLoading}
            hoverCls="hover:text-indigo-600 hover:bg-indigo-50">
            {previewLoading ? (
              <Loader size={15} className="animate-spin" />
            ) : (
              <Eye size={15} />
            )}
          </ActionBtn>
          <ActionBtn
            title="Download PDF"
            onClick={() => handleDownload(row, "pdf")}
            disabled={!!downloading}
            hoverCls="hover:text-blue-600 hover:bg-blue-50">
            {downloading === "pdf" ? (
              <Loader size={15} className="animate-spin" />
            ) : (
              <FileText size={15} />
            )}
          </ActionBtn>
          <ActionBtn
            title="Download editable Word file"
            onClick={() => handleDownload(row, "docx")}
            disabled={!!downloading}
            hoverCls="hover:text-sky-600 hover:bg-sky-50">
            {downloading === "docx" ? (
              <Loader size={15} className="animate-spin" />
            ) : (
              <FileType size={15} />
            )}
          </ActionBtn>
        </div>
      ),
    },
  ];

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
        <KPICard
          title="Net Disbursement"
          value={totalNet}
          icon={Wallet}
          color="slate"
        />
        <KPICard
          title="Total Allowances"
          value={totalAllow}
          icon={TrendingUp}
          color="green"
        />
        <KPICard
          title="Total Deductions"
          value={totalDed}
          icon={TrendingDown}
          color="rose"
        />
        <KPICard
          title="Pending Approval"
          value={`${pendingCount} record${pendingCount !== 1 ? "s" : ""}`}
          format="text"
          icon={CalendarDays}
          color="amber"
        />
      </div>

      <Table
        columns={payrollColumns}
        data={items}
        loading={loading}
        rowKey={(row) => row._id}
        page={page}
        pageSize={limit}
        totalItems={totalRecords}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        paginationDisabled={loading}
        itemLabel={`records · ${periodLabel}`}
        minWidth="min-w-[900px]"
        emptyIcon={CalendarDays}
        emptyMessage={`No payroll records for ${periodLabel}`}
        emptyDescription={
          [searchQ && `matching "${searchQ}"`, status && `with status "${status}"`]
            .filter(Boolean)
            .join(" ") || "Generate payroll for this period to see records here."
        }
        toolbar={
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
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
        }
      />

      {/* ── Payslip Preview Modal ── */}
      {previewPayroll && (
        <Modal isOpen={!!previewPayroll} onClose={() => setPreviewPayroll(null)} title="Payslip Preview" size="4xl">
          <PayslipPreview
            payroll={previewPayroll}
            orgInfo={orgInfo}
            onClose={() => setPreviewPayroll(null)}
            onDownload={(format) => handleDownload(previewPayroll, format)}
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
        <form onSubmit={handleFormSubmit(onSubmit)} noValidate className="space-y-5">
              {/* Employee */}
              <div>
                <FieldLabel>Employee</FieldLabel>
                <FormSelect required {...register("employee")}>
                  <option value="">Select employee…</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.employeeCode})
                    </option>
                  ))}
                </FormSelect>
                {formErrors.employee && (
                  <p className="mt-1 text-xs font-medium text-red-600">{formErrors.employee.message}</p>
                )}
              </div>

              {/* Period + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Salary Period</FieldLabel>
                  <div className="flex gap-2">
                    {/* min-w-0 lets the select shrink to the flex track instead
                        of its widest option ("September"), and the year keeps a
                        fixed track so the month name always stays readable. */}
                    <FormSelect className="min-w-0 flex-1" {...register("month")}>
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </FormSelect>
                    <FormInput
                      type="number" className="w-24 shrink-0"
                      {...register("year")}
                    />
                  </div>
                  {(formErrors.month || formErrors.year) && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {formErrors.month?.message || formErrors.year?.message}
                    </p>
                  )}
                </div>
                <div>
                  <FieldLabel>Salary Type</FieldLabel>
                  <FormSelect {...register("salaryType")}>
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
                      type="number" min="0.01" step="0.01" placeholder="0"
                      className={formErrors.baseSalary ? "border-red-400 focus:border-red-500" : ""}
                      {...register("baseSalary")}
                    />
                    {formErrors.baseSalary && (
                      <p className="mt-1 text-xs font-medium text-red-600">{formErrors.baseSalary.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1.5">
                      House Rent
                    </label>
                    <FormInput
                      type="number" placeholder="0"
                      className="border-emerald-100 bg-emerald-50/40"
                      {...register("houseRent")}
                    />
                    {formErrors.houseRent && (
                      <p className="mt-1 text-xs font-medium text-red-600">{formErrors.houseRent.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1.5">
                      Conveyance Allowance
                    </label>
                    <FormInput
                      type="number" placeholder="0"
                      className="border-emerald-100 bg-emerald-50/40"
                      {...register("conveyanceAllowance")}
                    />
                    {formErrors.conveyanceAllowance && (
                      <p className="mt-1 text-xs font-medium text-red-600">{formErrors.conveyanceAllowance.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-rose-500 uppercase tracking-wide mb-1.5">
                      Deductions
                    </label>
                    <FormInput
                      type="number" placeholder="0"
                      className="border-rose-100 bg-rose-50/30"
                      {...register("deductions")}
                    />
                    {formErrors.deductions && (
                      <p className="mt-1 text-xs font-medium text-red-600">{formErrors.deductions.message}</p>
                    )}
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
                    {formatCurrency(
                      netSalary(
                        watchedBaseSalary,
                        watchedHouseRent,
                        watchedConveyance,
                        watchedDeductions,
                      ),
                    )}
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
