import React from "react";
import {
  X,
  Mail,
  Hash,
  BookOpen,
  Phone,
  MapPin,
  User,
  Globe,
  GraduationCap,
  Notebook,
  Wallet,
} from "lucide-react";
import { Modal } from "../common";
import { formatCurrency } from "../../utils/currency";

const StudentDetailsModal = ({ isOpen, onClose, student }) => {
  if (!isOpen || !student) return null;

  const financials = student.financials || {};
  const totalPayable = financials.totalPayable || 0;
  const totalPaid = financials.totalPaid || 0;
  const pending = financials.pending || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={student.name || "Unnamed Student"}
      description="Alliance Française Student Record"
      size="4xl"
    >
      <div className="space-y-4">
        <div className="px-0">
          <div className="min-w-0 space-y-2 px-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Alliance Française Student Record</div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl break-words">{student.name || "Unnamed Student"}</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mt-1">
                  <StatusBadge status={student.status} />
                  <span className="inline-flex items-center gap-2"><Hash size={14} className="text-[#DA002E]" /> Roll: {student.rollNumber || "N/A"}</span>
                </div>
              </div>

              <div className="shrink-0">
                <button onClick={onClose} className="shrink-0 rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close modal"><X size={18} /></button>
              </div>
            </div>
          </div>
        </div>

        <div className="h-1 w-full bg-[#DA002E]" />

        <div className="px-0 py-0 sm:px-0 sm:py-0 space-y-4">
            {/* Academic + Guardian */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <InfoSection
                title="Academic Information"
                icon={<GraduationCap size={16} className="text-[#DA002E]" />}>
                <div className="my-4">
                  <DetailRow
                    label="Class & Section"
                    value={`Class ${student.class || "N/A"} - ${
                      student.section || "N/A"
                    }`}
                    icon={<BookOpen size={15} />}
                  />
                  <DetailRow
                    label="Nationality"
                    value={student.nationality || "N/A"}
                    icon={<Globe size={15} />}
                  />
                  <DetailRow
                    label="Phone"
                    value={student.phone || "N/A"}
                    icon={<Phone size={15} />}
                  />
                </div>
              </InfoSection>

              <InfoSection
                title="Parent / Guardian"
                icon={<User size={16} className="text-[#DA002E]" />}>
                <div className="my-4">
                  <DetailRow
                    label="Name"
                    value={student.parent?.name || "N/A"}
                    icon={<User size={15} />}
                  />
                  <DetailRow
                    label="Email"
                    value={student.parent?.email || "N/A"}
                    icon={<Mail size={15} />}
                  />
                  <DetailRow
                    label="Phone"
                    value={student.parent?.phone || "N/A"}
                    icon={<Phone size={15} />}
                  />
                </div>
              </InfoSection>
            </div>

            {/* Address */}
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-5 flex items-center gap-2">
                <MapPin size={16} className="text-[#DA002E]" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
                  Residential Address
                </h3>
              </div>

              <p className="text-sm leading-7 text-slate-700">
                {student.address?.replace(/"/g, "") || "No address provided"}
              </p>
            </section>

            {/* Financial Summary */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-[#DA002E]" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
                    Financial Summary
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-0 md:grid-cols-3">
                <FinancialCell
                  label="Total Payable"
                  value={formatCurrency(totalPayable)}
                />
                <FinancialCell
                  label="Total Paid"
                  value={formatCurrency(totalPaid)}
                  bordered
                />
                <FinancialCell
                  label="Pending Balance"
                  value={formatCurrency(pending)}
                  bordered
                />
              </div>
            </section>

            {/* Notes */}
            {student.notes && student.notes !== "None" && (
              <section className="rounded-2xl border border-[#ead7dc] bg-[#fff8fa] p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Notebook size={16} className="text-[#DA002E]" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
                    Administrative Notes
                  </h3>
                </div>

                <p className="text-sm leading-7 text-slate-700">
                  {student.notes}
                </p>
              </section>
            )}

            {/* Footer */}
            <div className="mt-4 flex justify-end border-t border-slate-200 pt-6">
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl bg-[#1A171B] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                Close
              </button>
            </div>
          </div>
        </div>
    </Modal>
  );
};

const InfoSection = ({ title, icon, children }) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-5 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
};

const DetailRow = ({ label, value, icon }) => {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <div className="mt-0.5 shrink-0 text-slate-500">{icon}</div>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
        <p className="wrap-break-word text-sm text-slate-900">
          {value || "N/A"}
        </p>
      </div>
    </div>
  );
};

const FinancialCell = ({ label, value, bordered = false }) => {
  return (
    <div
      className={`bg-white p-5 ${
        bordered ? "border-t border-slate-200 md:border-l md:border-t-0" : ""
      }`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const normalized = (status || "").toLowerCase();

  const styles =
    normalized === "active"
      ? "border-[#cfe8d6] bg-[#f7faf7] text-[#166534]"
      : "border-[#f1d2b8] bg-[#fff8f1] text-[#9a3412]";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${styles}`}>
      {status || "Unknown"}
    </span>
  );
};

export default StudentDetailsModal;
