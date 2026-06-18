import {
  User,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Hash,
  Building2,
  Globe,
  FileText,
  ShieldAlert,
  Heart,
  Edit2,
} from "lucide-react";
import Modal from "../common/Modal";
import Badge from "../common/Badge";
import Button from "../common/Button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig = {
  active:    { variant: "success",   label: "Active"    },
  inactive:  { variant: "secondary", label: "Inactive"  },
  "on-leave":{ variant: "warning",   label: "On Leave"  },
  resigned:  { variant: "danger",    label: "Resigned"  },
};

function fmtDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function avatarColor(name = "") {
  const colors = [
    "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-purple-500",
    "bg-rose-500",  "bg-orange-500", "bg-amber-500",  "bg-teal-500",
    "bg-emerald-500","bg-cyan-500",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      {Icon && (
        <Icon size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{value || "—"}</p>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, iconBg = "bg-blue-50", iconColor = "text-blue-600", children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className={`flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 ${iconBg}`}>
        <Icon size={14} className={`shrink-0 ${iconColor}`} aria-hidden="true" />
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600">{title}</h4>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeDetailsModal({ employee, isOpen, onClose, onEdit }) {
  if (!employee) return null;

  const emp    = employee;
  const status = statusConfig[emp.status] ?? statusConfig.inactive;
  const avatar = avatarColor(emp.name);


  const hasEmergencyContact =
    emp.emergencyContactName ||
    emp.emergencyContactPhone ||
    emp.emergencyContactAltPhone;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Employee Profile" size="4xl">
      {/* ── Profile banner ── */}
    <div className="-mx-4 -mt-4 sm:-mx-5 sm:-mt-5 bg-gradient-to-br from-[#7A1A1A] to-[#A32D2D] px-6 py-8 mb-5 relative overflow-hidden">
  {/* Decorative tricolore stripe */}
  <div className="absolute top-0 left-0 right-0 flex h-1">
    <div className="flex-1 bg-[#002395]" />
    <div className="flex-1 bg-white" />
    <div className="flex-1 bg-[#ED2939]" />
  </div>

  {/* Subtle watermark */}
  <span className="pointer-events-none absolute -right-4 -bottom-4 text-[120px] leading-none text-white/5 select-none font-serif">
    ❧
  </span>

  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
    {/* Avatar + identity */}
    <div className="flex items-center gap-5">
      <div
        className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl ${avatar} text-3xl font-bold text-white shadow-lg ring-4 ring-white/15`}
      >
        {emp.name?.charAt(0)?.toUpperCase()}
      </div>
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-white sm:text-2xl truncate">{emp.name}</h2>
        <p className="mt-0.5 text-sm text-red-200">{emp.designation}</p>
        {emp.department && (
          <p className="text-xs text-red-300/70">{emp.department}</p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Badge variant={status.variant} size="sm">{status.label}</Badge>
          <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs text-red-100">
            #{emp.employeeCode}
          </span>
        </div>
      </div>
    </div>

    {/* Quick stats */}
    <div className="flex gap-4 sm:gap-6 text-center">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-red-300/80">Joined</p>
        <p className="mt-0.5 text-sm font-semibold text-white">{fmtDate(emp.dateOfJoining)}</p>
      </div>
      {emp.dateOfBirth && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-300/80">Date of Birth</p>
          <p className="mt-0.5 text-sm font-semibold text-white">{fmtDate(emp.dateOfBirth)}</p>
        </div>
      )}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-red-300/80">Record Since</p>
        <p className="mt-0.5 text-sm font-semibold text-white">{fmtDate(emp.createdAt)}</p>
      </div>
    </div>
  </div>
</div>

      {/* ── Info cards grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Personal Information */}
        <SectionCard icon={User} title="Personal Information" iconBg="bg-blue-50" iconColor="text-blue-600">
          <InfoRow icon={Hash}     label="Employee ID"   value={emp.employeeCode} />
          <InfoRow icon={User}     label="Full Name"     value={emp.name} />
          <InfoRow icon={Calendar} label="Date of Birth" value={fmtDate(emp.dateOfBirth)} />
          <InfoRow icon={Calendar} label="Date of Joining" value={fmtDate(emp.dateOfJoining)} />
        </SectionCard>

        {/* Employment Details */}
        <SectionCard icon={Briefcase} title="Employment Details" iconBg="bg-indigo-50" iconColor="text-indigo-600">
          <InfoRow icon={Briefcase}  label="Designation"  value={emp.designation} />
          <InfoRow icon={Building2}  label="Department"   value={emp.department}  />
          <InfoRow icon={Hash}       label="Status"       value={emp.status?.replace("-", " ")} />
        </SectionCard>

        {/* Contact Information */}
        <SectionCard icon={Mail} title="Contact Information" iconBg="bg-teal-50" iconColor="text-teal-600">
          <InfoRow icon={Mail}  label="Email Address" value={emp.email} />
          <InfoRow icon={Phone} label="Phone Number"  value={emp.phone} />
        </SectionCard>

        {/* Address Information */}
        <SectionCard icon={MapPin} title="Address Information" iconBg="bg-orange-50" iconColor="text-orange-600">
          <InfoRow icon={MapPin}   label="Street Address"  value={emp.address}  />
          <InfoRow icon={Building2} label="City"           value={emp.city}     />
          <InfoRow icon={Globe}    label="State / Province" value={emp.state}   />
          <InfoRow icon={Hash}     label="Zip / Postal"    value={emp.zipCode}  />
          <InfoRow icon={Globe}    label="Country"          value={emp.country}  />
        </SectionCard>

        {/* Emergency Contact */}
        <SectionCard
          icon={ShieldAlert}
          title="Emergency Contact"
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
        >
          {hasEmergencyContact ? (
            <>
              <InfoRow icon={User}      label="Contact Name"       value={emp.emergencyContactName}         />
              <InfoRow icon={Heart}     label="Relationship"        value={emp.emergencyContactRelationship} />
              <InfoRow icon={Phone}     label="Phone Number"        value={emp.emergencyContactPhone}        />
              <InfoRow icon={Phone}     label="Alternative Phone"   value={emp.emergencyContactAltPhone}     />
              <InfoRow icon={MapPin}    label="Address"             value={emp.emergencyContactAddress}      />
            </>
          ) : (
            <p className="py-4 text-center text-xs text-slate-400">No emergency contact on file</p>
          )}
        </SectionCard>

        {/* Bank / Financial */}
        <SectionCard icon={CreditCard} title="Bank Information" iconBg="bg-emerald-50" iconColor="text-emerald-600">
          <InfoRow icon={Building2}  label="Bank Name"       value={emp.bankName}          />
          <InfoRow icon={CreditCard} label="Account Number"  value={emp.bankAccountNumber} />
        </SectionCard>

        {/* Notes — full width if present */}
        {emp.notes && (
          <div className="sm:col-span-2">
            <SectionCard icon={FileText} title="Administrative Notes" iconBg="bg-slate-50" iconColor="text-slate-500">
              <p className="py-3 text-sm text-slate-700 leading-relaxed">{emp.notes}</p>
            </SectionCard>
          </div>
        )}
      </div>

      {/* ── Footer actions ── */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-400">
          Last updated: {fmtDate(emp.updatedAt)}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          {onEdit && (
            <Button variant="primary" size="sm" icon={Edit2} onClick={() => { onClose(); onEdit(emp); }}>
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
