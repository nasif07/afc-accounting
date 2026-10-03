import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Edit2,
  FileText,
  Hourglass,
  Loader2,
  Lock,
  Scale,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import BookEntryLinesTable from "../components/journal/BookEntryLinesTable";
import DynamicJournalForm from "../components/journal/DynamicJournalForm";
import SectionHeader from "../components/common/SectionHeader";
import Modal from "../components/common/Modal";
import Button from "../components/common/Button";
import { accountingAPI, auditAPI } from "../services/apiMethods";
import { updateJournalEntry } from "../store/slices/journalSlice";
import { fetchSettings } from "../store/slices/settingsSlice";
import { formatCurrency } from "../utils/currency";
import { formatDisplayDate } from "../utils/date";
import {
  canEditEntry,
  editBlockedReason,
  editDeadline,
  isEntryApproved,
} from "../utils/journalPermissions";

const EMPTY_VALUE = "—";

// Maps the flat, field-scoped diff keys the backend stores in
// auditLog.changes (see accounting.service.js's snapshotEditableFields) to
// something a human recognises. Line keys arrive as `bookEntries.0.description`.
const FIELD_LABELS = {
  voucherDate: "Voucher Date",
  description: "Description",
  referenceNumber: "Reference Number",
  attachments: "Attachments",
};

const formatFieldName = (field) => {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const lineMatch = field.match(/^bookEntries\.(\d+)\.description$/);
  if (lineMatch) return `Line ${Number(lineMatch[1]) + 1} Description`;
  return field;
};

const formatDiffValue = (value) => {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "(empty)";
  // Dates are stored as ISO strings in the diff.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatDisplayDate(value) || value;
  }
  return String(value);
};

// Zips the stored { before: {...}, after: {...} } field-scoped objects back
// into per-field rows for display.
const toDiffRows = (changes) => {
  const before = changes?.before || {};
  const after = changes?.after || {};
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return fields.map((field) => ({
    field,
    before: before[field],
    after: after[field],
  }));
};

const getPersonLabel = (person) => {
  if (!person) return EMPTY_VALUE;
  if (typeof person === "string") return person;
  return person.name || person.email || person._id || EMPTY_VALUE;
};

// voucherDate/date are calendar-day values (the day the user picked, not a
// specific instant) — route through the timezone-safe formatter so a date
// stored near UTC midnight doesn't display as the previous day.
const formatDate = (date) => {
  if (!date) return EMPTY_VALUE;
  return (
    formatDisplayDate(date, { locale: "en-BD", month: "long" }) || EMPTY_VALUE
  );
};

const formatDateTime = (date) => {
  if (!date) return EMPTY_VALUE;
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime())
    ? EMPTY_VALUE
    : parsedDate.toLocaleString("en-BD", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const formatLabel = (value) => {
  if (!value) return EMPTY_VALUE;
  return String(value)
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

// One place that turns the entry's status fields into what the page shows.
const getStatusMeta = (entry) => {
  if (isEntryApproved(entry)) {
    return {
      label: "Approved",
      icon: CheckCircle2,
      pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
      accent: "bg-emerald-500",
      note: "Posted to the general ledger. Its amounts now count towards account balances and reports.",
    };
  }
  if (entry?.approvalStatus === "rejected") {
    return {
      label: "Rejected",
      icon: XCircle,
      pill: "bg-rose-50 text-rose-700 ring-rose-600/20",
      accent: "bg-rose-500",
      note: "Not posted. It has no effect on any ledger or report.",
    };
  }
  return {
    label: "Pending",
    icon: Hourglass,
    pill: "bg-amber-50 text-amber-700 ring-amber-600/20",
    accent: "bg-amber-500",
    note: "Waiting for approval. It will reach the ledger once approved.",
  };
};

function MetaItem({ label, value, mono = false }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd
        className={`mt-1 truncate text-sm font-medium text-slate-800 ${
          mono ? "font-mono" : ""
        }`}
        title={typeof value === "string" ? value : undefined}>
        {value || EMPTY_VALUE}
      </dd>
    </div>
  );
}

function Panel({ title, icon: Icon, action, children, className = "" }) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            {Icon && <Icon size={16} className="text-slate-400" />}
            {title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export default function JournalEntryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data: settings } = useSelector((state) => state.settings);

  const [entry, setEntry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // The director's allowJournalEdit switch gates the Edit button.
  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  const loadEntry = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setIsLoading(true);
        const response = await accountingAPI.getById(id);
        setEntry(response?.data?.data ?? response?.data ?? null);
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load journal entry");
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [id],
  );

  // Change log. Deliberately independent of the entry fetch — an entry with
  // no edits is the normal case, and a failure here must not blank the page.
  const loadAuditLogs = useCallback(async () => {
    try {
      setIsLoadingLogs(true);
      const response = await auditAPI.getEntityLogs("JournalEntry", id);
      const payload = response?.data?.data ?? response?.data;
      setAuditLogs(payload?.data || []);
    } catch {
      setAuditLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadEntry();
    loadAuditLogs();
  }, [id, loadEntry, loadAuditLogs]);

  const lineItems = useMemo(
    () => (Array.isArray(entry?.bookEntries) ? entry.bookEntries : []),
    [entry?.bookEntries],
  );
  const totals = useMemo(
    () =>
      lineItems.reduce(
        (sum, line) => ({
          debit: sum.debit + Number(line?.debit || 0),
          credit: sum.credit + Number(line?.credit || 0),
        }),
        { debit: 0, credit: 0 },
      ),
    [lineItems],
  );

  const isEditable = canEditEntry(entry, settings);
  const deadline = editDeadline(entry);
  const status = getStatusMeta(entry);
  const StatusIcon = status.icon;
  const reviewer = entry?.approvedBy || entry?.rejectedBy;
  const isReviewed =
    isEntryApproved(entry) || entry?.approvalStatus === "rejected";
  const difference = Math.abs(totals.debit - totals.credit);
  const isBalanced = difference < 0.01;

  // Deliberately rethrows — DynamicJournalForm awaits this and maps the
  // backend's field-level errors itself, same as on the list page.
  const handleEditSubmit = async (payload) => {
    setIsSaving(true);
    try {
      const result = await dispatch(
        updateJournalEntry({ id: entry._id, data: payload }),
      );
      if (result?.error) throw result.payload;

      toast.success("Journal entry updated successfully");
      setIsEditing(false);
      // Silent refresh: keep the page on screen while the new values and the
      // new change-log line load in.
      await Promise.all([loadEntry({ silent: true }), loadAuditLogs()]);
    } finally {
      setIsSaving(false);
    }
  };

  const editButton = entry && (
    <Button
      variant="primary"
      icon={isEditable ? Edit2 : Lock}
      onClick={() => setIsEditing(true)}
      disabled={!isEditable}
      title={isEditable ? "Edit this entry" : editBlockedReason(settings)}>
      Edit Entry
    </Button>
  );

  return (
    <div className="space-y-4 pb-16">
      <SectionHeader
        icon={BookOpen}
        title="Journal Entry"
        description="Voucher details, journal lines and change history"
        hotkey={false}>
        <Button
          variant="ghost"
          icon={ArrowLeft}
          onClick={() => navigate("/dashboard/journal-entries")}
          className="border border-slate-200">
          Back
        </Button>
        {editButton}
      </SectionHeader>

      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
          <Loader2 className="mb-3 animate-spin text-slate-400" size={28} />
          <p className="text-sm text-slate-500">Loading entry…</p>
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">
              Couldn't load this entry
            </h3>
            <p className="mt-0.5 text-sm text-red-700">{error}</p>
          </div>
        </div>
      ) : !entry ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <FileText className="mx-auto mb-3 text-slate-300" size={40} />
          <h2 className="text-base font-semibold text-slate-800">
            Entry not found
          </h2>
          <button
            type="button"
            onClick={() => navigate("/dashboard/journal-entries")}
            className="mt-3 text-sm font-semibold text-blue-600 hover:underline">
            Back to journal entries
          </button>
        </div>
      ) : (
        <>
          {/* ── Summary ─────────────────────────────────────────────── */}
          <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 w-1 ${status.accent}`}
            />

            <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-mono text-2xl font-bold tracking-tight text-slate-900">
                    {entry.voucherNumber || EMPTY_VALUE}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.pill}`}>
                    <StatusIcon size={12} />
                    {status.label}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {formatDate(entry.voucherDate || entry.date)}
                  <span className="mx-2 text-slate-300">•</span>
                  {formatLabel(entry.transactionType)}
                </p>
                <p className="max-w-2xl pt-1 text-[15px] leading-relaxed text-slate-700">
                  {entry.description || (
                    <span className="italic text-slate-400">
                      No description provided.
                    </span>
                  )}
                </p>
              </div>

              <div className="shrink-0 rounded-lg bg-slate-50 px-5 py-3 md:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Total amount
                </p>
                <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
                  {formatCurrency(entry.totalDebit ?? totals.debit)}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6 md:grid-cols-4">
              <MetaItem
                label="Reference"
                // referenceLabel is the server's display form — opening
                // balance journals store an id-based key that means nothing
                // on screen. Falls back for any cached older response.
                value={entry.referenceLabel ?? entry.referenceNumber}
                mono
              />
              <MetaItem label="Source" value={formatLabel(entry.sourceModule)} />
              <MetaItem label="Created by" value={getPersonLabel(entry.createdBy)} />
              <MetaItem label="Created on" value={formatDateTime(entry.createdAt)} />
            </dl>

            {entry.rejectionReason && (
              <div className="flex items-start gap-2.5 border-t border-rose-100 bg-rose-50 px-5 py-3.5 text-sm text-rose-800 sm:px-6">
                <XCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />
                <p>
                  <span className="font-semibold">Rejection reason:</span>{" "}
                  {entry.rejectionReason}
                </p>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* ── Journal lines ──────────────────────────────────────── */}
            <Panel
              title="Journal lines"
              icon={Scale}
              className="lg:col-span-2"
              action={
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    isBalanced
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}>
                  {isBalanced ? (
                    <>
                      <CheckCircle2 size={12} /> Balanced ·{" "}
                      {lineItems.length} lines
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} /> Off by{" "}
                      {formatCurrency(difference)}
                    </>
                  )}
                </span>
              }>
              <div className="p-4">
                <BookEntryLinesTable
                  lines={lineItems}
                  showNarration={false}
                  totalLabel="Total"
                />
              </div>
            </Panel>

            {/* ── Side column ────────────────────────────────────────── */}
            <div className="space-y-4">
              <Panel title="Status" icon={StatusIcon}>
                <div className="space-y-3 p-5">
                  <p className="text-sm leading-relaxed text-slate-600">
                    {status.note}
                  </p>

                  <div
                    className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-xs ${
                      isEditable
                        ? "bg-blue-50 text-blue-800"
                        : "bg-slate-50 text-slate-500"
                    }`}>
                    {isEditable ? (
                      <Edit2 size={14} className="mt-px shrink-0" />
                    ) : (
                      <Lock size={14} className="mt-px shrink-0" />
                    )}
                    <p>
                      {isEditable ? (
                        <>
                          Editable until{" "}
                          <span className="font-semibold">
                            {formatDateTime(deadline)}
                          </span>
                          . Date, description, reference and line notes can
                          be changed.
                        </>
                      ) : (
                        editBlockedReason(settings)
                      )}
                    </p>
                  </div>
                </div>
              </Panel>

              <Panel title="Activity" icon={Clock}>
                <ol className="space-y-5 p-5">
                  <TimelineItem
                    label="Submitted"
                    user={getPersonLabel(entry.createdBy)}
                    date={formatDateTime(entry.createdAt)}
                    tone="blue"
                  />
                  <TimelineItem
                    label={
                      isReviewed
                        ? entry.approvalStatus === "rejected"
                          ? "Rejected"
                          : "Approved"
                        : "Awaiting review"
                    }
                    user={isReviewed ? getPersonLabel(reviewer) : null}
                    date={
                      isReviewed
                        ? formatDateTime(
                            entry.approvalDate || entry.rejectionDate,
                          )
                        : null
                    }
                    tone={
                      !isReviewed
                        ? "amber"
                        : entry.approvalStatus === "rejected"
                          ? "rose"
                          : "emerald"
                    }
                    isLast={auditLogs.length === 0}
                  />

                  {/* Change log — one entry per recorded edit, newest first */}
                  {auditLogs.map((log, idx) => {
                    const diff = toDiffRows(log.changes);
                    return (
                      <TimelineItem
                        key={log._id || idx}
                        label={`Edited${
                          diff.length
                            ? ` · ${formatFieldName(diff[0].field)}${
                                diff.length > 1 ? ` +${diff.length - 1}` : ""
                              }`
                            : ""
                        }`}
                        user={getPersonLabel(log.userId) || log.userName}
                        date={formatDateTime(log.timestamp)}
                        tone="slate"
                        isLast={idx === auditLogs.length - 1}
                        diff={diff}
                      />
                    );
                  })}
                </ol>

                {isLoadingLogs && (
                  <p className="px-5 pb-4 text-xs text-slate-400">
                    Loading change history…
                  </p>
                )}
                {!isLoadingLogs && auditLogs.length === 0 && (
                  <p className="px-5 pb-4 text-xs text-slate-400">
                    No edits recorded for this entry.
                  </p>
                )}
              </Panel>
            </div>
          </div>

          <Modal
            isOpen={isEditing}
            onClose={() => !isSaving && setIsEditing(false)}
            title={`Edit ${entry.voucherNumber || "Entry"}`}
            description="Update the voucher details. Amounts and accounts stay as posted."
            size="4xl">
            <DynamicJournalForm
              initialData={entry}
              onSubmit={handleEditSubmit}
              isLoading={isSaving}
            />
          </Modal>
        </>
      )}
    </div>
  );
}

const TONES = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
  amber: "bg-amber-400",
  slate: "bg-slate-400",
};

function TimelineItem({ label, date, user, tone = "slate", isLast, diff }) {
  return (
    <li className="relative flex gap-3">
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute left-1.25 top-4 h-[calc(100%+0.75rem)] w-px bg-slate-200"
        />
      )}
      <span
        aria-hidden="true"
        className={`relative mt-1.5 h-2.75 w-2.75 shrink-0 rounded-full ring-4 ring-white ${TONES[tone]}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {(user || date) && (
          <p className="text-xs text-slate-500">
            {user}
            {user && date && <span className="mx-1.5 text-slate-300">•</span>}
            {date}
          </p>
        )}

        {Array.isArray(diff) && diff.length > 0 && (
          <ul className="mt-2 space-y-1.5 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
            {diff.map((row) => (
              <li key={row.field} className="text-xs leading-snug">
                <span className="font-medium text-slate-600">
                  {formatFieldName(row.field)}
                </span>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 line-through">
                    {formatDiffValue(row.before)}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                    {formatDiffValue(row.after)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
