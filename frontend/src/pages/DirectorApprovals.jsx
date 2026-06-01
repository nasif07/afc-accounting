import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { toast } from "sonner";
import { Check, X, UserCheck } from "lucide-react";
import SectionHeader from "../components/common/SectionHeader";
import { Button, Badge } from "../components/common";
import { Card, CardContent } from "../components/common";
import { PageLoader } from "../components/common/Loaders";

export default function DirectorApprovals() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== "director") {
      navigate("/dashboard");
      return;
    }
    fetchPendingUsers();
  }, [user, navigate]);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/auth/pending");
      setPendingUsers(response.data || []);
    } catch {
      toast.error("Failed to load pending users");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await api.patch(`/auth/approve/${userId}`);
      toast.success("User approved successfully");
      fetchPendingUsers();
    } catch {
      toast.error("Failed to approve user");
    }
  };

  const handleReject = async (userId) => {
    try {
      await api.patch(`/auth/reject/${userId}`);
      toast.success("User rejected");
      fetchPendingUsers();
    } catch {
      toast.error("Failed to reject user");
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
                    onClick={() => handleApprove(pendingUser._id)}>
                    <Check size={16} /> Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleReject(pendingUser._id)}>
                    <X size={16} /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
