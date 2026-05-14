import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Hash,
  Loader2,
  User,
  XCircle,
  Info,
  DollarSign,
} from "lucide-react";
import SectionHeader from "../components/common/SectionHeader";
import api from "../services/api";
import { formatCurrency } from "../utils/currency";

const EMPTY_VALUE = "---";

// --- Helper Functions (Keep original logic, refined formatting) ---
const getPersonLabel = (person) => {
  if (!person) return EMPTY_VALUE;
  if (typeof person === "string") return person;
  return person.name || person.email || person._id || EMPTY_VALUE;
};

const formatDate = (date) => {
  if (!date) return EMPTY_VALUE;
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime())
    ? EMPTY_VALUE
    : parsedDate.toLocaleDateString("en-BD", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
};

const formatDateTime = (date) => {
  if (!date) return EMPTY_VALUE;
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime())
    ? EMPTY_VALUE
    : parsedDate.toLocaleString("en-BD", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const formatLabel = (value) => {
  if (!value) return EMPTY_VALUE;
  return String(value)
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const getAccountLabel = (account) => {
  if (!account) return EMPTY_VALUE;
  const code = account.accountCode ? `[${account.accountCode}] ` : "";
  return `${code}${account.accountName || EMPTY_VALUE}`;
};

const getStatusStyles = (entry) => {
  if (entry?.status === "posted" || entry?.approvalStatus === "approved") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20";
  }
  if (entry?.approvalStatus === "rejected") {
    return "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20";
  }
  return "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20";
};

// --- Refined Detail Item Component ---
function DetailItem({ icon: Icon, label, value, className = "" }) {
  return (
    <div
      className={`group flex flex-col gap-1.5 p-3 transition-colors hover:bg-slate-50/80 ${className}`}>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {Icon && (
          <Icon
            size={12}
            className="text-slate-300 group-hover:text-blue-500 transition-colors"
          />
        )}
        {label}
      </div>
      <div className="text-sm font-medium text-slate-700 line-clamp-2">
        {value || EMPTY_VALUE}
      </div>
    </div>
  );
}

export default function JournalEntryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchEntry = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/accounting/journal-entries/${id}`);
        const payload = response?.data?.data ?? response?.data;
        if (isMounted) setEntry(payload || null);
      } catch (err) {
        if (isMounted)
          setError(
            err?.response?.data?.message || "Failed to load journal entry",
          );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    if (id) fetchEntry();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const lineItems = Array.isArray(entry?.bookEntries) ? entry.bookEntries : [];
  const totals = useMemo(() => {
    return lineItems.reduce(
      (sum, line) => ({
        debit: sum.debit + Number(line?.debit || 0),
        credit: sum.credit + Number(line?.credit || 0),
      }),
      { debit: 0, credit: 0 },
    );
  }, [lineItems]);

  const statusStyle = getStatusStyles(entry);
  const reviewer = entry?.approvedBy || entry?.rejectedBy;

  return (
    <div className="space-y-6 pb-20 pt-4">
      <SectionHeader
        icon={BookOpen}
        title="Voucher Insight"
        description="Detailed overview of financial transaction records"
        buttonText="Back"
        buttonIcon={ArrowLeft}
        onButtonClick={() => navigate("/dashboard/journal-entries")}
        buttonColor="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 "
      />

      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white/50 backdrop-blur-sm">
          <Loader2 className="mb-4 animate-spin text-blue-600" size={32} />
          <p className="text-sm font-medium text-slate-400">
            Fetching entry details...
          </p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-6 backdrop-blur-sm">
          <div className="rounded-full bg-rose-100 p-3 text-rose-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-rose-900">System Error</h3>
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        </div>
      ) : !entry ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <FileText className="mx-auto mb-4 text-slate-200" size={48} />
          <h2 className="text-lg font-semibold text-slate-800">
            No Record Found
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-sm font-bold text-blue-600 underline">
            Return to previous page
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT COLUMN: Header Info */}
          <div className="lg:col-span-2 space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-white p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-2xl font-black tracking-tighter text-slate-900">
                        {entry.voucherNumber}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ring-4 ${statusStyle}`}>
                        {entry.approvalStatus === "approved" ? (
                          <CheckCircle size={10} />
                        ) : (
                          <Clock size={10} />
                        )}
                        {entry.approvalStatus || "pending"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar size={14} />
                      {formatDate(entry.voucherDate || entry.date)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-right">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Total Value
                      </p>
                      <p className="font-mono text-lg font-bold text-blue-600">
                        {formatCurrency(entry.totalDebit ?? totals.debit)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50/50 p-4">
                  <Info size={18} className="mt-0.5 text-blue-500" />
                  <p className="text-sm leading-relaxed text-slate-600">
                    {entry.description || "No transaction narrative provided."}
                  </p>
                </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-2 border-t border-slate-50 sm:grid-cols-4">
                <DetailItem
                  label="Transaction"
                  value={formatLabel(entry.transactionType)}
                  icon={FileText}
                  className="border-r border-b border-slate-50"
                />
                <DetailItem
                  label="Reference"
                  value={entry.referenceNumber}
                  icon={Hash}
                  className="border-r border-b border-slate-50"
                />
                <DetailItem
                  label="Created By"
                  value={getPersonLabel(entry.createdBy)}
                  icon={User}
                  className="border-r border-b border-slate-50"
                />
                <DetailItem
                  label="Status"
                  value={formatLabel(entry.status)}
                  icon={CheckCircle}
                  className="border-b border-slate-50"
                />
              </div>

              {entry.rejectionReason && (
                <div className="m-4 flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-rose-800">
                  <XCircle size={18} className="text-rose-500" />
                  <p className="text-xs">
                    <strong>Rejection:</strong> {entry.rejectionReason}
                  </p>
                </div>
              )}
            </section>

            {/* Line Items Table */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white ">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Journal Line Items
                </h3>
                <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-slate-400  border border-slate-100">
                  {lineItems.length} ENTRIES
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/30 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-6 py-3">Account Account Details</th>
                      <th className="px-6 py-3 text-right">Debit</th>
                      <th className="px-6 py-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {lineItems.map((line, idx) => (
                      <tr
                        key={idx}
                        className="group hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-700">
                            {getAccountLabel(line.account)}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {line.description || "No line description"}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm font-bold text-slate-600">
                          {Number(line.debit) > 0
                            ? formatCurrency(line.debit)
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm font-bold text-slate-600">
                          {Number(line.credit) > 0
                            ? formatCurrency(line.credit)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className=" text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100">
                    <tr>
                      <td className="px-6 py-4 text-sm font-bold uppercase">
                        Balance Summary
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm       font-black text-blue-600">
                        {formatCurrency(totals.debit)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-black text-blue-600">
                        {formatCurrency(totals.credit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Audit Trail / Metadata */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 ">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                <Clock size={14} /> Audit Timeline
              </h3>
              <div className="space-y-6">
                <TimelineItem
                  label="Submission"
                  date={formatDateTime(entry.createdAt)}
                  user={getPersonLabel(entry.createdBy)}
                  isLast={false}
                />
                <TimelineItem
                  label="Review"
                  date={formatDateTime(
                    entry.approvalDate || entry.rejectionDate,
                  )}
                  user={getPersonLabel(reviewer)}
                  isLast={true}
                  status={entry.approvalStatus}
                />
              </div>
            </section>

            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg shadow-blue-200">
              <DollarSign className="mb-4 opacity-40" size={32} />
              <h4 className="text-xs font-bold uppercase tracking-widest opacity-80">
                Quick Summary
              </h4>
              <p className="mt-2 text-sm leading-relaxed opacity-90">
                This voucher is currently{" "}
                <strong>{entry.approvalStatus}</strong>.
                {entry.approvalStatus === "approved"
                  ? " It has been posted to the general ledger."
                  : " It requires further action before posting."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Internal Visual Components ---
function TimelineItem({ label, date, user, isLast, status }) {
  const isRejected = status === "rejected";
  return (
    <div className="relative flex gap-4">
      {!isLast && (
        <div className="absolute left-[11px] top-6 h-full w-0.5 bg-slate-100" />
      )}
      <div
        className={`relative z-10 h-6 w-6 rounded-full border-4 border-white  
        ${status ? (isRejected ? "bg-rose-500" : "bg-emerald-500") : "bg-blue-500"}`}
      />
      <div className="-mt-1">
        <p className="text-[10px] font-bold uppercase text-slate-400">
          {label}
        </p>
        <p className="text-sm font-bold text-slate-700">{user}</p>
        <p className="text-[11px] text-slate-500">{date}</p>
      </div>
    </div>
  );
}
