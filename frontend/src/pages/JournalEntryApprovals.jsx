import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import api from "../services/api";
import { toast } from "sonner";
import {
  Check, X, ChevronDown, AlertCircle, CheckCircle2,
  ClipboardList, RefreshCcw, TrendingUp, TrendingDown,
  FileText, Calendar, User, Clock,
} from "lucide-react";
import { Button, Badge, Modal, Textarea } from "../components/common";
import SectionHeader from "../components/common/SectionHeader";
import { SectionSkeleton } from "../components/common/Loaders";

// ── Constants ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  receipt:         { label: "Receipt",       variant: "info"      },
  payment:         { label: "Payment",       variant: "warning"   },
  "journal-entry": { label: "Journal Entry", variant: "secondary" },
  transfer:        { label: "Transfer",      variant: "primary"   },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const numFmt = (n) =>
  new Intl.NumberFormat("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const fmtCurrency = (n) => `৳ ${numFmt(n)}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

const totalDebit  = (e) => e?.bookEntries?.reduce((s, b) => s + (b.debit  || 0), 0) || 0;
const totalCredit = (e) => e?.bookEntries?.reduce((s, b) => s + (b.credit || 0), 0) || 0;

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <div className={`rounded-lg p-2 ${iconBg}`}>
          <Icon size={15} className={iconColor} />
        </div>
      </div>
      <p className="truncate text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MetaPill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <Icon size={12} className="shrink-0 text-slate-400" aria-hidden="true" />
      {children}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function JournalEntryApprovals() {
  const [pendingEntries,  setPendingEntries]  = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [expandedId,      setExpandedId]      = useState(null);
  const [approving,       setApproving]       = useState(null);
  const [rejecting,       setRejecting]       = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(null);

  const user     = useSelector((s) => s.auth.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== "director") { navigate("/dashboard"); return; }
    fetchPendingEntries();
  }, [user, navigate]);

  const fetchPendingEntries = async () => {
    try {
      setLoading(true);
      const res = await api.get("/accounting/journal-entries/pending-approvals");
      setPendingEntries(res?.data?.data || []);
    } catch {
      toast.error("Failed to load pending journal entries");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (entryId) => {
    try {
      setApproving(entryId);
      await api.patch(`/accounting/journal-entries/${entryId}/approve`);
      toast.success("Journal entry approved");
      fetchPendingEntries();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve entry");
    } finally {
      setApproving(null);
    }
  };

  const handleRejectSubmit = async (entryId) => {
    if (!rejectionReason.trim()) { toast.error("Please provide a rejection reason"); return; }
    try {
      setRejecting(entryId);
      await api.patch(`/accounting/journal-entries/${entryId}/reject`, {
        rejectionReason: rejectionReason.trim(),
      });
      toast.success("Journal entry rejected");
      setShowRejectModal(null);
      setRejectionReason("");
      fetchPendingEntries();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject entry");
    } finally {
      setRejecting(null);
    }
  };

  const closeRejectModal = () => { setShowRejectModal(null); setRejectionReason(""); };

  // Aggregate stats
  const totalPendingDebit  = pendingEntries.reduce((s, e) => s + totalDebit(e),  0);
  const totalPendingCredit = pendingEntries.reduce((s, e) => s + totalCredit(e), 0);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <SectionHeader
        icon={ClipboardList}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        title="Journal Entry Approvals"
        description="Review pending double-entry submissions and post them to the ledger."
        buttonText="Refresh"
        onButtonClick={fetchPendingEntries}
        buttonIcon={RefreshCcw}
        buttonVariant="outline"
        isLoading={loading}
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Awaiting Approval"
          value={loading ? "—" : `${pendingEntries.length} ${pendingEntries.length !== 1 ? "entries" : "entry"}`}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Total Pending Debit"
          value={loading ? "—" : fmtCurrency(totalPendingDebit)}
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Total Pending Credit"
          value={loading ? "—" : fmtCurrency(totalPendingCredit)}
          icon={TrendingDown}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div className="space-y-3">
          <SectionSkeleton rows={5} />
          <SectionSkeleton rows={4} />
          <SectionSkeleton rows={6} />
        </div>
      ) : /* ── Empty state ── */
      pendingEntries.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={26} className="text-emerald-500" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">All caught up</h3>
          <p className="mt-1 text-xs text-slate-400">No journal entries are pending approval right now.</p>
        </div>
      ) : (

        /* ── Entry list ── */
        <div className="space-y-3">
          {pendingEntries.map((entry) => {
            const isExpanded = expandedId === entry._id;
            const tD         = totalDebit(entry);
            const tC         = totalCredit(entry);
            const isBalanced = Math.abs(tD - tC) < 0.01;
            const diff       = Math.abs(tD - tC);
            const typeConf   = TYPE_CONFIG[entry.transactionType] ?? { label: entry.transactionType || "Journal", variant: "secondary" };

            return (
              <div
                key={entry._id}
                className={`overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md ${
                  isBalanced ? "border-slate-200" : "border-rose-200"
                }`}
              >
                {/* ── Top accent bar ── */}
                <div className={`h-1 ${isBalanced ? "bg-emerald-400" : "bg-rose-400"}`} />

                {/* ── Card summary ── */}
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar icon */}
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isBalanced ? "bg-emerald-50" : "bg-rose-50"}`}>
                      <FileText size={17} className={isBalanced ? "text-emerald-600" : "text-rose-500"} aria-hidden="true" />
                    </div>

                    {/* Main details */}
                    <div className="flex-1 min-w-0">
                      {/* Voucher + badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{entry.voucherNumber || "N/A"}</h3>
                        <Badge variant={typeConf.variant} size="sm">{typeConf.label}</Badge>
                        <Badge variant={isBalanced ? "success" : "danger"} size="sm">
                          {isBalanced ? "Balanced" : "Unbalanced"}
                        </Badge>
                      </div>

                      {/* Meta row */}
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <MetaPill icon={Calendar}>{fmtDate(entry.voucherDate)}</MetaPill>
                        <MetaPill icon={User}>{entry.createdBy?.name || "Unknown"}</MetaPill>
                        {entry.referenceNumber && (
                          <MetaPill icon={FileText}>Ref: {entry.referenceNumber}</MetaPill>
                        )}
                      </div>

                      {/* Amounts */}
                      <div className="mt-4 flex flex-wrap items-start gap-6">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Debit</p>
                          <p className="mt-0.5 text-base font-bold text-emerald-700">{fmtCurrency(tD)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Credit</p>
                          <p className="mt-0.5 text-base font-bold text-blue-700">{fmtCurrency(tC)}</p>
                        </div>
                        {!isBalanced && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Difference</p>
                            <p className="mt-0.5 text-base font-bold text-rose-600">{fmtCurrency(diff)}</p>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {entry.description && (
                        <p className="mt-3 border-t border-slate-50 pt-3 text-sm text-slate-500 leading-relaxed">
                          {entry.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Unbalanced alert */}
                  {!isBalanced && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-100 bg-rose-50 px-3.5 py-3">
                      <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-semibold text-rose-800">Approval disabled — entry is not balanced</p>
                        <p className="mt-0.5 text-[11px] text-rose-500">
                          Debit and credit totals must match. Difference is {fmtCurrency(diff)}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Always-visible action footer ── */}
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                  <Button
                    variant="success"
                    size="sm"
                    icon={Check}
                    loading={approving === entry._id}
                    disabled={!isBalanced || !!approving}
                    onClick={() => handleApprove(entry._id)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={X}
                    disabled={!!approving || !!rejecting}
                    onClick={() => setShowRejectModal(entry._id)}
                  >
                    Reject
                  </Button>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry._id)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "Hide line items" : "View line items"}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    {isExpanded ? "Hide details" : `View line items (${entry.bookEntries?.length ?? 0})`}
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                {/* ── Expanded: line items only ── */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {/* Line items table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/80">
                            <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Account
                            </th>
                            <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                              Debit (৳)
                            </th>
                            <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-blue-600">
                              Credit (৳)
                            </th>
                            <th className="hidden px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 sm:table-cell">
                              Narration
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {entry.bookEntries?.map((be, idx) => (
                            <tr key={idx} className="transition-colors hover:bg-slate-50/60">
                              <td className="px-5 py-3.5">
                                <p className="font-semibold text-slate-800">{be.account?.accountName || "—"}</p>
                                <p className="font-mono text-[11px] text-slate-400">{be.account?.accountCode}</p>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                {be.debit
                                  ? <span className="font-semibold text-emerald-700">{numFmt(be.debit)}</span>
                                  : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                {be.credit
                                  ? <span className="font-semibold text-blue-700">{numFmt(be.credit)}</span>
                                  : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="hidden px-5 py-3.5 text-slate-500 sm:table-cell">
                                {be.description || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-200 bg-slate-50">
                            <td className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                              Total
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-bold text-emerald-700">{numFmt(tD)}</td>
                            <td className="px-5 py-3 text-right text-sm font-bold text-blue-700">{numFmt(tC)}</td>
                            <td className="hidden px-5 py-3 sm:table-cell">
                              {isBalanced ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                                  <CheckCircle2 size={12} /> Balanced
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                                  <AlertCircle size={12} /> Off by {fmtCurrency(diff)}
                                </span>
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Reject modal ── */}
      <Modal
        isOpen={!!showRejectModal}
        onClose={closeRejectModal}
        title="Reject Journal Entry"
        description="Provide a clear reason so the accountant can revise and resubmit."
        size="md"
      >
        <div className="space-y-4">
          <Textarea
            label="Rejection Reason"
            required
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Incorrect account — debit should be posted to 5001 (Salaries Expense), not 5002."
          />
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={closeRejectModal}>
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={rejecting === showRejectModal}
              disabled={!rejectionReason.trim()}
              onClick={() => handleRejectSubmit(showRejectModal)}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
