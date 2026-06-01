import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { toast } from "sonner";
import { Check, X, ChevronDown, Eye, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "../components/common";
import Badge from "../components/common/Badge";
import SectionHeader from "../components/common/SectionHeader";
import { Button, Modal, Textarea } from "../components/common";
import { PageLoader } from "../components/common/Loaders";

export default function JournalEntryApprovals() {
  const [pendingEntries, setPendingEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(null);

  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== "director") { navigate("/dashboard"); return; }
    fetchPendingEntries();
  }, [user, navigate]);

  const fetchPendingEntries = async () => {
    try {
      setLoading(true);
      const response = await api.get("/accounting/journal-entries/pending-approvals");
      setPendingEntries(response?.data?.data || []);
    } catch (error) {
      toast.error("Failed to load pending journal entries");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (entryId) => {
    try {
      setApproving(entryId);
      await api.patch(`/accounting/journal-entries/${entryId}/approve`);
      toast.success("Journal entry approved successfully");
      fetchPendingEntries();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to approve entry");
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
      toast.success("Journal entry rejected successfully");
      setShowRejectModal(null);
      setRejectionReason("");
      fetchPendingEntries();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reject entry");
    } finally {
      setRejecting(null);
    }
  };

  const totalDebit  = (e) => e?.bookEntries?.reduce((s, b) => s + (b.debit  || 0), 0) || 0;
  const totalCredit = (e) => e?.bookEntries?.reduce((s, b) => s + (b.credit || 0), 0) || 0;

  const formatCurrency = (amount) =>
    `৳ ${new Intl.NumberFormat("en-BD", { minimumFractionDigits: 2 }).format(amount || 0)}`;

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  if (loading) return <PageLoader message="Loading pending entries…" className="min-h-screen" />;

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={CheckCircle}
        title="Journal Entry Approvals"
        description="Review and approve pending journal entries"
        iconBg="bg-red-50"
        iconColor="text-red-600"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: "Pending Approval", value: pendingEntries.length, color: "from-blue-50 to-blue-100 border-blue-200", textColor: "text-blue-900", labelColor: "text-blue-600" },
          { label: "Total Debit",  value: formatCurrency(pendingEntries.reduce((s, e) => s + totalDebit(e),  0)), color: "from-green-50 to-green-100 border-green-200", textColor: "text-green-900", labelColor: "text-green-600" },
          { label: "Total Credit", value: formatCurrency(pendingEntries.reduce((s, e) => s + totalCredit(e), 0)), color: "from-orange-50 to-orange-100 border-orange-200", textColor: "text-orange-900", labelColor: "text-orange-600" },
        ].map(({ label, value, color, textColor, labelColor }) => (
          <Card key={label} className={`bg-gradient-to-br ${color}`}>
            <CardContent className="p-6">
              <p className={`text-sm font-medium uppercase tracking-wide ${labelColor}`}>{label}</p>
              <p className={`mt-2 text-2xl font-bold ${textColor}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {pendingEntries.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <CardContent className="p-12 text-center">
            <Eye className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No Pending Approvals</h3>
            <p className="text-gray-600">All journal entries have been reviewed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingEntries.map((entry) => {
            const isExpanded = expandedId === entry._id;
            const tD = totalDebit(entry);
            const tC = totalCredit(entry);
            const isBalanced = Math.abs(tD - tC) < 0.01;

            return (
              <Card key={entry._id} className="overflow-hidden">
                {/* Entry header */}
                <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-3 flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-900">{entry.voucherNumber || "N/A"}</h3>
                        <Badge variant={isBalanced ? "success" : "danger"}>
                          {isBalanced ? "Balanced" : "Unbalanced"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                        {[
                          { label: "Date",       val: formatDate(entry.voucherDate),      cls: "text-gray-900" },
                          { label: "Created By", val: entry.createdBy?.name || "Unknown", cls: "text-gray-900" },
                          { label: "Debit",      val: formatCurrency(tD),                 cls: "text-green-600" },
                          { label: "Credit",     val: formatCurrency(tC),                 cls: "text-blue-600"  },
                        ].map(({ label, val, cls }) => (
                          <div key={label}>
                            <p className="font-medium text-gray-600">{label}</p>
                            <p className={`font-semibold ${cls}`}>{val}</p>
                          </div>
                        ))}
                      </div>
                      {entry.description && (
                        <p className="mt-3 text-sm text-gray-700">
                          <strong>Description:</strong> {entry.description}
                        </p>
                      )}
                    </div>

                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setExpandedId(isExpanded ? null : entry._id)}>
                      <ChevronDown
                        size={20}
                        className={`text-gray-600 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </div>

                  {!isBalanced && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                      <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                      <div>
                        <p className="text-sm font-semibold text-red-900">Entry is not balanced</p>
                        <p className="text-xs text-red-700">Difference: {formatCurrency(Math.abs(tD - tC))}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded line items */}
                {isExpanded && (
                  <div className="bg-white p-6">
                    <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-900">Line Items</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-gray-300">
                            {["Account", "Debit", "Credit", "Description"].map((h) => (
                              <th key={h} className={`py-2 px-3 font-semibold text-gray-700 ${h !== "Account" && h !== "Description" ? "text-right" : "text-left"}`}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {entry.bookEntries?.map((be, idx) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="px-3 py-3">
                                <p className="font-semibold text-gray-900">{be.account?.accountCode}</p>
                                <p className="text-xs text-gray-600">{be.account?.accountName}</p>
                              </td>
                              <td className="px-3 py-3 text-right">
                                {be.debit
                                  ? <span className="font-semibold text-green-600">{formatCurrency(be.debit)}</span>
                                  : <span className="text-gray-400">-</span>}
                              </td>
                              <td className="px-3 py-3 text-right">
                                {be.credit
                                  ? <span className="font-semibold text-blue-600">{formatCurrency(be.credit)}</span>
                                  : <span className="text-gray-400">-</span>}
                              </td>
                              <td className="px-3 py-3 text-gray-700">{be.description || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                            <td className="px-3 py-3">TOTAL</td>
                            <td className="px-3 py-3 text-right text-green-600">{formatCurrency(tD)}</td>
                            <td className="px-3 py-3 text-right text-blue-600">{formatCurrency(tC)}</td>
                            <td className="px-3 py-3" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Approve / Reject */}
                    <div className="flex gap-3 border-t border-gray-200 pt-4">
                      <Button
                        variant="success"
                        size="lg"
                        fullWidth
                        onClick={() => handleApprove(entry._id)}
                        loading={approving === entry._id}
                        disabled={!isBalanced}>
                        <Check size={18} /> Approve Entry
                      </Button>
                      <Button
                        variant="danger"
                        size="lg"
                        fullWidth
                        onClick={() => setShowRejectModal(entry._id)}
                        loading={rejecting === entry._id}>
                        <X size={18} /> Reject Entry
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject reason modal */}
      <Modal
        isOpen={!!showRejectModal}
        onClose={() => { setShowRejectModal(null); setRejectionReason(""); }}
        title="Reject Journal Entry"
        size="md">
        <div className="space-y-4">
          <Textarea
            label="Rejection Reason"
            required
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter reason for rejection..."
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => { setShowRejectModal(null); setRejectionReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => handleRejectSubmit(showRejectModal)}
              loading={rejecting === showRejectModal}
              disabled={!rejectionReason.trim()}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
