import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { Check, X, Loader, ChevronDown, Eye, AlertCircle, CheckCircle } from "lucide-react";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import SectionHeader from "../components/common/SectionHeader";

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

  // Check if user is director
  useEffect(() => {
    if (user?.role !== "director") {
      navigate("/dashboard");
      return;
    }
    fetchPendingEntries();
  }, [user, navigate]);

  const fetchPendingEntries = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        "/accounting/journal-entries/pending-approvals",
      );
      setPendingEntries(response?.data?.data || []);
    } catch (error) {
      toast.error("Failed to load pending journal entries");
      console.error(error);
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
      console.error(error);
    } finally {
      setApproving(null);
    }
  };

  const handleRejectSubmit = async (entryId) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

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
      console.error(error);
    } finally {
      setRejecting(null);
    }
  };

  const calculateTotalDebit = (entry) => {
    return (
      entry?.bookEntries?.reduce((sum, be) => sum + (be.debit || 0), 0) || 0
    );
  };

  const calculateTotalCredit = (entry) => {
    return (
      entry?.bookEntries?.reduce((sum, be) => sum + (be.credit || 0), 0) || 0
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <SectionHeader
        icon={CheckCircle}
        title="Journal Entry Approvals"
        description="Review and approve pending journal entries"
        iconBg="bg-red-50"
        iconColor="text-red-600"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="p-6">
            <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">
              Pending Approval
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-900">
              {pendingEntries.length}
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="p-6">
            <p className="text-sm font-medium text-green-600 uppercase tracking-wide">
              Total Debit
            </p>
            <p className="mt-2 text-2xl font-bold text-green-900">
              {formatCurrency(
                pendingEntries.reduce(
                  (sum, e) => sum + calculateTotalDebit(e),
                  0,
                ),
              )}
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="p-6">
            <p className="text-sm font-medium text-orange-600 uppercase tracking-wide">
              Total Credit
            </p>
            <p className="mt-2 text-2xl font-bold text-orange-900">
              {formatCurrency(
                pendingEntries.reduce(
                  (sum, e) => sum + calculateTotalCredit(e),
                  0,
                ),
              )}
            </p>
          </div>
        </Card>
      </div>

      {/* Empty State */}
      {pendingEntries.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <div className="p-12 text-center">
            <Eye className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Pending Approvals
            </h3>
            <p className="text-gray-600">
              All journal entries have been reviewed. Check back later for new
              submissions.
            </p>
          </div>
        </Card>
      ) : (
        /* Entries List */
        <div className="space-y-4">
          {pendingEntries.map((entry) => {
            const isExpanded = expandedId === entry._id;
            const totalDebit = calculateTotalDebit(entry);
            const totalCredit = calculateTotalCredit(entry);
            const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

            return (
              <Card key={entry._id} className="overflow-hidden">
                {/* Entry Header */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-bold text-gray-900">
                          {entry.voucherNumber || "N/A"}
                        </h3>
                        <Badge variant={isBalanced ? "success" : "danger"}>
                          {isBalanced ? "Balanced" : "Unbalanced"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 font-medium">Date</p>
                          <p className="text-gray-900 font-semibold">
                            {formatDate(entry.voucherDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">
                            Created By
                          </p>
                          <p className="text-gray-900 font-semibold">
                            {entry.createdBy?.name || "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">Debit</p>
                          <p className="text-green-600 font-semibold">
                            {formatCurrency(totalDebit)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">Credit</p>
                          <p className="text-blue-600 font-semibold">
                            {formatCurrency(totalCredit)}
                          </p>
                        </div>
                      </div>

                      {entry.description && (
                        <p className="mt-3 text-sm text-gray-700">
                          <strong>Description:</strong> {entry.description}
                        </p>
                      )}
                    </div>

                    {/* Expand Button */}
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : entry._id)
                      }
                      className="ml-4 p-2 hover:bg-gray-200 rounded-lg transition">
                      <ChevronDown
                        size={20}
                        className={`text-gray-600 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Warning if Unbalanced */}
                  {!isBalanced && (
                    <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle
                        size={18}
                        className="text-red-600 flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-semibold text-red-900">
                          Entry is not balanced
                        </p>
                        <p className="text-xs text-red-700">
                          Difference:{" "}
                          {formatCurrency(Math.abs(totalDebit - totalCredit))}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-6 bg-white">
                    {/* Book Entries Table */}
                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                        Line Items
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b-2 border-gray-300">
                              <th className="text-left py-2 px-3 text-gray-700 font-semibold">
                                Account
                              </th>
                              <th className="text-right py-2 px-3 text-gray-700 font-semibold">
                                Debit
                              </th>
                              <th className="text-right py-2 px-3 text-gray-700 font-semibold">
                                Credit
                              </th>
                              <th className="text-left py-2 px-3 text-gray-700 font-semibold">
                                Description
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.bookEntries?.map((be, idx) => (
                              <tr
                                key={idx}
                                className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-3 px-3">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      {be.account?.accountCode}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      {be.account?.accountName}
                                    </p>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {be.debit ? (
                                    <span className="font-semibold text-green-600">
                                      {formatCurrency(be.debit)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {be.credit ? (
                                    <span className="font-semibold text-blue-600">
                                      {formatCurrency(be.credit)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-gray-700">
                                  {be.description || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                              <td className="py-3 px-3">TOTAL</td>
                              <td className="py-3 px-3 text-right text-green-600">
                                {formatCurrency(totalDebit)}
                              </td>
                              <td className="py-3 px-3 text-right text-blue-600">
                                {formatCurrency(totalCredit)}
                              </td>
                              <td className="py-3 px-3"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleApprove(entry._id)}
                        disabled={approving === entry._id || !isBalanced}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition">
                        {approving === entry._id ? (
                          <>
                            <Loader size={18} className="animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <Check size={18} />
                            Approve Entry
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setShowRejectModal(entry._id)}
                        disabled={rejecting === entry._id}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition">
                        {rejecting === entry._id ? (
                          <>
                            <Loader size={18} className="animate-spin" />
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <X size={18} />
                            Reject Entry
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Reject Journal Entry
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows="4"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectionReason("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectSubmit(showRejectModal)}
                  disabled={
                    !rejectionReason.trim() || rejecting === showRejectModal
                  }
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition">
                  {rejecting === showRejectModal
                    ? "Rejecting..."
                    : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
