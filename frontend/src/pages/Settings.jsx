import { useEffect, useState } from "react";
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
  Loader2,
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
  const [form, setForm] = useState({
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
    financialYearType: "julyjune",
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
  });

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (data) {
      setForm((prev) => ({
        ...prev,
        orgName: data.orgName ?? prev.orgName,
        orgEmail: data.orgEmail ?? prev.orgEmail,
        orgPhone: data.orgPhone ?? prev.orgPhone,
        orgAddress: data.orgAddress ?? prev.orgAddress,
        orgWebsite: data.orgWebsite ?? prev.orgWebsite,
        orgLogo: data.orgLogo ?? prev.orgLogo,
        directorName: data.directorName ?? prev.directorName,
        directorTitle: data.directorTitle ?? prev.directorTitle,
        currency: data.currency ?? prev.currency,
        currencySymbol: data.currencySymbol ?? prev.currencySymbol,
        financialYearType: data.financialYearType ?? prev.financialYearType,
        leaveYearLabel: data.leaveYearLabel ?? prev.leaveYearLabel,
        benefitPeriodLabel: data.benefitPeriodLabel ?? prev.benefitPeriodLabel,
        bankNameForPayment: data.bankNameForPayment ?? prev.bankNameForPayment,
        bankAccountForPayment:
          data.bankAccountForPayment ?? prev.bankAccountForPayment,
        reportHeader: data.reportHeader ?? prev.reportHeader,
        reportFooter: data.reportFooter ?? prev.reportFooter,
        highValueTransactionThreshold:
          data.highValueTransactionThreshold ??
          prev.highValueTransactionThreshold,
        approvalLimitDirector:
          data.approvalLimitDirector ?? prev.approvalLimitDirector,
        approvalLimitAccountant:
          data.approvalLimitAccountant ?? prev.approvalLimitAccountant,
        approvalLimitSubAccountant:
          data.approvalLimitSubAccountant ?? prev.approvalLimitSubAccountant,
        enableApprovalWorkflow:
          data.enableApprovalWorkflow ?? prev.enableApprovalWorkflow,
        enableEmailNotifications:
          data.enableEmailNotifications ?? prev.enableEmailNotifications,
      }));
    }
  }, [data]);

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

  const set = (key) => (e) => {
    const val =
      e.target.type === "checkbox"
        ? e.target.checked
        : [
              "highValueTransactionThreshold",
              "approvalLimitDirector",
              "approvalLimitAccountant",
              "approvalLimitSubAccountant",
            ].includes(key)
          ? Number(e.target.value) || 0
          : e.target.value;
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(updateSettings(form));
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

        <form onSubmit={handleSubmit}>
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
                  <FormField label="Organisation Name" required>
                    <IconInput
                      icon={Building2}
                      value={form.orgName}
                      onChange={set("orgName")}
                      disabled={!isDirector}
                      required
                    />
                  </FormField>

                  <FormField label="Email Address">
                    <IconInput
                      icon={Mail}
                      type="email"
                      value={form.orgEmail}
                      onChange={set("orgEmail")}
                      disabled={!isDirector}
                    />
                  </FormField>

                  <FormField label="Phone Number">
                    <IconInput
                      icon={Phone}
                      type="tel"
                      value={form.orgPhone}
                      onChange={set("orgPhone")}
                      disabled={!isDirector}
                    />
                  </FormField>

                  <FormField label="Website">
                    <IconInput
                      icon={Globe}
                      type="url"
                      value={form.orgWebsite}
                      onChange={set("orgWebsite")}
                      placeholder="https://"
                      disabled={!isDirector}
                    />
                  </FormField>

                  <FormField label="Logo URL / Path">
                    <Input
                      value={form.orgLogo}
                      onChange={set("orgLogo")}
                      placeholder="/afc-logo.jpg or https://..."
                      disabled={!isDirector}
                    />
                    {form.orgLogo && (
                      <img
                        src={form.orgLogo}
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
                        value={form.orgAddress}
                        onChange={set("orgAddress")}
                        disabled={!isDirector}
                        className="pl-9"
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
                    value={form.directorName}
                    onChange={set("directorName")}
                    disabled={!isDirector}
                  />
                  <Input
                    label="Title"
                    value={form.directorTitle}
                    onChange={set("directorTitle")}
                    placeholder="Director"
                    disabled={!isDirector}
                  />
                  <Input
                    label="Bank Name (for payslip mode of payment)"
                    value={form.bankNameForPayment}
                    onChange={set("bankNameForPayment")}
                    disabled={!isDirector}
                  />
                  <Input
                    label="Bank Account No. (for payslip)"
                    value={form.bankAccountForPayment}
                    onChange={set("bankAccountForPayment")}
                    disabled={!isDirector}
                  />
                  <Input
                    label="Leave Year Label (shown on payslips)"
                    value={form.leaveYearLabel}
                    onChange={set("leaveYearLabel")}
                    placeholder="July'2025 - June'2026"
                    disabled={!isDirector}
                  />
                  <Input
                    label="Benefit Period Label (shown on payslips)"
                    value={form.benefitPeriodLabel}
                    onChange={set("benefitPeriodLabel")}
                    placeholder="01-07-2023 to 30-06-2025"
                    disabled={!isDirector}
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
                    value={form.currency}
                    onChange={set("currency")}
                    disabled={!isDirector}>
                    <option value="BDT">BDT — Bangladeshi Taka</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                  </Select>

                  <Input
                    label="Currency Symbol"
                    value={form.currencySymbol}
                    onChange={set("currencySymbol")}
                    placeholder="৳"
                    disabled={!isDirector}
                  />

                  <Select
                    label="Financial Year Type"
                    value={form.financialYearType}
                    onChange={set("financialYearType")}
                    disabled={!isDirector}>
                    <option value="julyjune">July – June</option>
                    <option value="jandec">January – December</option>
                  </Select>

                  <Input
                    label="High-Value Transaction Threshold (৳)"
                    type="number"
                    min="0"
                    value={form.highValueTransactionThreshold}
                    onChange={set("highValueTransactionThreshold")}
                    disabled={!isDirector}
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
                    value={form.reportHeader}
                    onChange={set("reportHeader")}
                    placeholder="e.g. CONFIDENTIAL — For internal use only"
                    disabled={!isDirector}
                  />
                  <Textarea
                    label="Report Footer Text"
                    rows={3}
                    value={form.reportFooter}
                    onChange={set("reportFooter")}
                    placeholder="e.g. This report was generated by Alliance Accounting System"
                    disabled={!isDirector}
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
                    value={form.approvalLimitDirector}
                    onChange={set("approvalLimitDirector")}
                    disabled={!isDirector}
                  />
                  <Input
                    label="Accountant Approval Limit (৳)"
                    type="number"
                    min="0"
                    value={form.approvalLimitAccountant}
                    onChange={set("approvalLimitAccountant")}
                    disabled={!isDirector}
                  />
                  <Input
                    label="Sub-Accountant Approval Limit (৳)"
                    type="number"
                    min="0"
                    value={form.approvalLimitSubAccountant}
                    onChange={set("approvalLimitSubAccountant")}
                    disabled={!isDirector}
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
                        checked={form[key]}
                        onChange={set(key)}
                        disabled={!isDirector}
                        className="h-4 w-4 rounded border-slate-300 text-[#EE081D] focus:ring-[#EE081D]"
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
