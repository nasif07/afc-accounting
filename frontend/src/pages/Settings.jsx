import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  UserCog,
  FileText,
  Banknote,
  ShieldCheck,
  Save,
} from "lucide-react";
import SectionHeader from "../components/common/SectionHeader";
import {
  Input,
  Select,
  Textarea,
  Button,
  FormField,
} from "../components/common";
import {
  fetchSettings,
  updateSettings,
  clearError,
  clearSuccess,
} from "../store/slices/settingsSlice";

const TABS = [
  { id: "org", label: "Organisation", icon: Building2 },
  { id: "signatory", label: "Signatory", icon: UserCog },
  { id: "financial", label: "Financial", icon: Banknote },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "workflow", label: "Workflow", icon: ShieldCheck },
];

// ── Zod validation schema ────────────────────────────────────────────────────
// There's no Zod validation middleware on the settings route at all — the
// backend only enforces what's declared on settings.model.js's Mongoose
// schema (an enum on financialYearType; everything else is an unconstrained
// String/Number/Boolean). This schema mirrors exactly that, plus the two
// fields the UI itself already marked `required`.
//
// Live bug found and fixed here: the Financial Year Type dropdown sent
// "julyjune" / "jandec", but settings.model.js's Mongoose enum only accepts
// "july-june" / "jan-dec" (see backend/src/config/constants.js). Selecting
// either option and saving has been failing with a 400 (Mongoose
// ValidationError) in production — confirmed no other code reads this field,
// so the values below are corrected to match the backend exactly.
const blankToUndefined = (v) => (v === "" || v == null ? undefined : v);
const optionalEmail = z.preprocess(
  blankToUndefined,
  z.string().trim().email("Enter a valid email address").optional(),
);

const settingsSchema = z.object({
  orgName: z.string().trim().min(1, "Organisation name is required"),
  orgEmail: optionalEmail,
  orgPhone: z.string().trim().optional(),
  orgAddress: z.string().trim().optional(),
  orgWebsite: z.string().trim().optional(),
  orgLogo: z.string().trim().optional(),
  directorName: z.string().trim().min(1, "Director / Principal name is required"),
  directorTitle: z.string().trim().optional(),
  currency: z.enum(["BDT", "USD", "EUR", "GBP"]),
  currencySymbol: z.string().trim().optional(),
  financialYearType: z.enum(["july-june", "jan-dec"]),
  leaveYearLabel: z.string().trim().optional(),
  benefitPeriodLabel: z.string().trim().optional(),
  bankNameForPayment: z.string().trim().optional(),
  bankAccountForPayment: z.string().trim().optional(),
  reportHeader: z.string().trim().optional(),
  reportFooter: z.string().trim().optional(),
  highValueTransactionThreshold: z.coerce.number().optional(),
  approvalLimitDirector: z.coerce.number().optional(),
  approvalLimitAccountant: z.coerce.number().optional(),
  approvalLimitSubAccountant: z.coerce.number().optional(),
  enableApprovalWorkflow: z.boolean().optional(),
  enableEmailNotifications: z.boolean().optional(),
});

const INITIAL_FORM_DATA = {
  orgName: "",
  orgEmail: "",
  orgPhone: "",
  orgAddress: "",
  orgWebsite: "",
  orgLogo: "",
  directorName: "",
  directorTitle: "",
  currency: "BDT",
  currencySymbol: "৳",
  financialYearType: "july-june",
  leaveYearLabel: "",
  benefitPeriodLabel: "",
  bankNameForPayment: "",
  bankAccountForPayment: "",
  reportHeader: "",
  reportFooter: "",
  highValueTransactionThreshold: 50000,
  approvalLimitDirector: 999999,
  approvalLimitAccountant: 100000,
  approvalLimitSubAccountant: 10000,
  enableApprovalWorkflow: true,
  enableEmailNotifications: true,
};

// Icon-prefixed input: wraps common/Input with an absolute icon
function IconInput({ icon: Icon, ...inputProps }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
      )}
      <Input {...inputProps} className={Icon ? "pl-9" : ""} />
    </div>
  );
}

export default function Settings() {
  const dispatch = useDispatch();
  const { data, loading, error, success } = useSelector((s) => s.settings);
  const { user } = useSelector((s) => s.auth);

  const isDirector = user?.role === "director";
  const [activeTab, setActiveTab] = useState("org");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: INITIAL_FORM_DATA,
  });

  const watchedOrgLogo = watch("orgLogo");

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (data) {
      reset({ ...INITIAL_FORM_DATA, ...data });
    }
  }, [data, reset]);

  useEffect(() => {
    if (success) {
      toast.success("Settings saved successfully");
      dispatch(clearSuccess());
    }
  }, [success, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const onSubmit = (data) => {
    dispatch(updateSettings(data));
  };

  return (
    <div className="space-y-4 pb-10">
      <SectionHeader
        icon={Building2}
        title="System Settings"
        description="Manage organisation profile, signatory, financial year, and workflow settings"
      />

      {!isDirector && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have view-only access. Only a Director can update settings.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Tab bar with proper ARIA roles for keyboard navigation */}
        <div
          role="tablist"
          aria-label="Settings sections"
          className="flex overflow-x-auto border-b border-slate-200 bg-slate-50">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              type="button"
              id={`tab-${id}`}
              aria-selected={activeTab === id}
              aria-controls={`panel-${id}`}
              tabIndex={activeTab === id ? 0 : -1}
              onClick={() => setActiveTab(id)}
              onKeyDown={(e) => {
                const ids = TABS.map((t) => t.id);
                const idx = ids.indexOf(id);
                if (e.key === "ArrowRight")
                  setActiveTab(ids[(idx + 1) % ids.length]);
                if (e.key === "ArrowLeft")
                  setActiveTab(ids[(idx - 1 + ids.length) % ids.length]);
              }}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-medium transition ${
                activeTab === id
                  ? "border-[#EE081D] bg-white text-[#EE081D]"
                  : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className="p-6">
            {/* ── Organisation ── */}
            {activeTab === "org" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Organisation Information
                </h3>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <FormField label="Organisation Name" required error={errors.orgName?.message}>
                    <IconInput
                      icon={Building2}
                      disabled={!isDirector}
                      required
                      {...register("orgName")}
                    />
                  </FormField>

                  <FormField label="Email Address" error={errors.orgEmail?.message}>
                    <IconInput
                      icon={Mail}
                      type="email"
                      disabled={!isDirector}
                      {...register("orgEmail")}
                    />
                  </FormField>

                  <FormField label="Phone Number">
                    <IconInput
                      icon={Phone}
                      type="tel"
                      disabled={!isDirector}
                      {...register("orgPhone")}
                    />
                  </FormField>

                  <FormField label="Website">
                    <IconInput
                      icon={Globe}
                      type="url"
                      placeholder="https://"
                      disabled={!isDirector}
                      {...register("orgWebsite")}
                    />
                  </FormField>

                  <FormField label="Logo URL / Path">
                    <Input
                      placeholder="/afc-logo.jpg or https://..."
                      disabled={!isDirector}
                      {...register("orgLogo")}
                    />
                    {watchedOrgLogo && (
                      <img
                        src={watchedOrgLogo}
                        alt="Logo preview"
                        className="mt-2 h-14 rounded border border-slate-200 object-contain p-1"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    )}
                  </FormField>

                  <FormField label="Full Address">
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-3 z-10 h-4 w-4 text-slate-400" />
                      <Textarea
                        rows={3}
                        disabled={!isDirector}
                        className="pl-9"
                        {...register("orgAddress")}
                      />
                    </div>
                  </FormField>
                </div>
              </div>
            )}

            {/* ── Signatory ── */}
            {activeTab === "signatory" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Authorised Signatory
                </h3>
                <p className="text-sm text-slate-500">
                  These details appear on payslips, bank statements, and printed
                  reports.
                </p>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Input
                    label="Director / Principal Name"
                    required
                    error={errors.directorName?.message}
                    touched={!!errors.directorName}
                    disabled={!isDirector}
                    {...register("directorName")}
                  />
                  <Input
                    label="Title"
                    placeholder="Director"
                    disabled={!isDirector}
                    {...register("directorTitle")}
                  />
                  <Input
                    label="Bank Name (for payslip mode of payment)"
                    disabled={!isDirector}
                    {...register("bankNameForPayment")}
                  />
                  <Input
                    label="Bank Account No. (for payslip)"
                    disabled={!isDirector}
                    {...register("bankAccountForPayment")}
                  />
                  <Input
                    label="Leave Year Label (shown on payslips)"
                    placeholder="July'2025 - June'2026"
                    disabled={!isDirector}
                    {...register("leaveYearLabel")}
                  />
                  <Input
                    label="Benefit Period Label (shown on payslips)"
                    placeholder="01-07-2023 to 30-06-2025"
                    disabled={!isDirector}
                    {...register("benefitPeriodLabel")}
                  />
                </div>
              </div>
            )}

            {/* ── Financial ── */}
            {activeTab === "financial" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Financial Settings
                </h3>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Select
                    label="Currency Code"
                    disabled={!isDirector}
                    {...register("currency")}>
                    <option value="BDT">BDT — Bangladeshi Taka</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                  </Select>

                  <Input
                    label="Currency Symbol"
                    placeholder="৳"
                    disabled={!isDirector}
                    {...register("currencySymbol")}
                  />

                  <Select
                    label="Financial Year Type"
                    disabled={!isDirector}
                    {...register("financialYearType")}>
                    <option value="july-june">July – June</option>
                    <option value="jan-dec">January – December</option>
                  </Select>

                  <Input
                    label="High-Value Transaction Threshold (৳)"
                    type="number"
                    min="0"
                    disabled={!isDirector}
                    {...register("highValueTransactionThreshold")}
                  />
                </div>
              </div>
            )}

            {/* ── Reports ── */}
            {activeTab === "reports" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Report Header &amp; Footer
                </h3>
                <p className="text-sm text-slate-500">
                  Optional text printed at the top and bottom of generated
                  reports.
                </p>
                <div className="grid grid-cols-1 gap-5">
                  <Textarea
                    label="Report Header Text"
                    rows={3}
                    placeholder="e.g. CONFIDENTIAL — For internal use only"
                    disabled={!isDirector}
                    {...register("reportHeader")}
                  />
                  <Textarea
                    label="Report Footer Text"
                    rows={3}
                    placeholder="e.g. This report was generated by Alliance Accounting System"
                    disabled={!isDirector}
                    {...register("reportFooter")}
                  />
                </div>
              </div>
            )}

            {/* ── Workflow ── */}
            {activeTab === "workflow" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Approval Workflow
                </h3>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Input
                    label="Director Approval Limit (৳)"
                    type="number"
                    min="0"
                    disabled={!isDirector}
                    {...register("approvalLimitDirector")}
                  />
                  <Input
                    label="Accountant Approval Limit (৳)"
                    type="number"
                    min="0"
                    disabled={!isDirector}
                    {...register("approvalLimitAccountant")}
                  />
                  <Input
                    label="Sub-Accountant Approval Limit (৳)"
                    type="number"
                    min="0"
                    disabled={!isDirector}
                    {...register("approvalLimitSubAccountant")}
                  />
                </div>

                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  {[
                    {
                      key: "enableApprovalWorkflow",
                      label: "Enable approval workflow for transactions",
                    },
                    {
                      key: "enableEmailNotifications",
                      label: "Enable email notifications",
                    },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-center gap-3 ${!isDirector ? "opacity-60" : ""}`}>
                      <input
                        type="checkbox"
                        disabled={!isDirector}
                        className="h-4 w-4 rounded border-slate-300 text-[#EE081D] focus:ring-[#EE081D]"
                        {...register(key)}
                      />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Save bar */}
          {isDirector && (
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <Button
                type="submit"
                disabled={loading}
                loading={loading}
                size="md">
                {!loading && <Save size={16} />}
                {loading ? "Saving…" : "Save Settings"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
