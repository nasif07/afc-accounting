import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import api from "../services/api";
import { toast } from "sonner";
import { Check, X, UserCheck } from "lucide-react";
import SectionHeader from "../components/common/SectionHeader";
import { Button, Badge, Modal, Textarea } from "../components/common";
import { Card, CardContent } from "../components/common";
import { PageLoader } from "../components/common/Loaders";

export default function DirectorApprovals() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingApprove, setPendingApprove] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actioning, setActioning] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  // No live filters here (fetch only runs on mount + after actions), so the
  // race window is narrow, but this still guards against a rapid double
  // approve/reject firing overlapping refetches out of order.
  const fetchAbortRef = useRef(null);

  useEffect(() => {
    if (user?.role !== "director") {
      navigate("/dashboard");
      return;
    }
    fetchPendingUsers();
    return () => fetchAbortRef.current?.abort();
  }, [user, navigate]);

  const fetchPendingUsers = async () => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      setLoading(true);
      const response = await api.get("/auth/pending", { signal: controller.signal });
      setPendingUsers(response.data || []);
    } catch (err) {
      if (err.code === "ERR_CANCELED") return;
      toast.error("Failed to load pending users");
    } finally {
      if (fetchAbortRef.current === controller) {
        setLoading(false);
      }
    }
  };

  const handleConfirmApprove = async () => {
    const userId = pendingApprove;
    try {
      setActioning(true);
      await api.patch(`/auth/approve/${userId}`);
      toast.success("User approved successfully");
      setPendingApprove(null);
      fetchPendingUsers();
    } catch {
      toast.error("Failed to approve user");
    } finally {
      setActioning(false);
    }
  };

  const closeRejectModal = () => {
    setRejectModal(null);
    setRejectReason("");
  };

  const handleConfirmReject = async () => {
    const userId = rejectModal;
    try {
      setActioning(true);
      await api.patch(`/auth/reject/${userId}`, { reason: rejectReason.trim() });
      toast.success("User rejected");
      closeRejectModal();
      fetchPendingUsers();
    } catch {
      toast.error("Failed to reject user");
    } finally {
      setActioning(false);
    }
  };

  if (loading) return <PageLoader message="Loading pending users…" className="min-h-screen" />;

  const users = pendingUsers.data ?? [];

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={UserCheck}
        title="Pending User Approvals"
        description="Review and approve newly registered users"
        iconBg="bg-red-50"
        iconColor="text-red-600"
      />

      {users.length === 0 ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          No pending users to approve.
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map((pendingUser) => (
            <Card key={pendingUser._id}>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{pendingUser.name}</h3>
                  <p className="text-sm text-slate-600">{pendingUser.email}</p>
                  <div className="mt-1">
                    <Badge variant="warning">{pendingUser.role}</Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => setPendingApprove(pendingUser._id)}>
                    <Check size={16} /> Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRejectModal(pendingUser._id)}>
                    <X size={16} /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve confirmation modal */}
      <Modal
        isOpen={!!pendingApprove}
        onClose={() => setPendingApprove(null)}
        title="Approve User"
        size="sm">
        <p className="text-sm text-slate-600 mb-6">
          Confirm approval of this user? They will gain access to the system immediately.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setPendingApprove(null)}>
            Cancel
          </Button>
          <Button variant="success" fullWidth loading={actioning} onClick={handleConfirmApprove}>
            Approve
          </Button>
        </div>
      </Modal>

      {/* Reject reason modal */}
      <Modal
        isOpen={!!rejectModal}
        onClose={closeRejectModal}
        title="Reject User"
        size="md">
        <div className="space-y-4">
          <Textarea
            label="Rejection Reason (optional)"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection..."
          />
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={closeRejectModal}>
              Cancel
            </Button>
            <Button variant="danger" fullWidth loading={actioning} onClick={handleConfirmReject}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
