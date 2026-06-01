import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  DollarSign,
  Clock,
  Check,
  Ban,
  Filter,
} from "lucide-react";
import {
  useReceiptsAdvanced,
  useApproveReceiptAdvanced,
  useRejectReceiptAdvanced,
  useDeleteReceiptAdvanced,
} from "../hooks/useReceiptsAdvanced";
import { Table, Button, Badge, Card, CardContent, Modal, Textarea } from "../components/common";
import { SectionSkeleton } from "../components/common/Loaders";
import EmptyState from "../components/EmptyState";
import { formatCurrency } from "../utils/currency";
import SectionHeader from "../components/common/SectionHeader";

export default function Receipts() {
  const { user } = useSelector((state) => state.auth);
  const [statusFilter, setStatusFilter] = useState("all");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [pendingApprove, setPendingApprove] = useState(null);

  const { data: allReceipts, isLoading } = useReceiptsAdvanced();

  const receipts =
    statusFilter === "all"
      ? allReceipts
      : allReceipts?.filter((r) => r.approvalStatus === statusFilter);

  const approveMutation = useApproveReceiptAdvanced();
  const rejectMutation = useRejectReceiptAdvanced();
  const deleteMutation = useDeleteReceiptAdvanced();

  const handleConfirmApprove = async () => {
    await approveMutation.mutateAsync(pendingApprove);
    setPendingApprove(null);
  };

  const handleConfirmReject = async () => {
    if (rejectReason.trim()) {
      await rejectMutation.mutateAsync({ id: rejectModal, reason: rejectReason.trim() });
    }
    setRejectModal(null);
    setRejectReason("");
  };

  const columns = [
    {
      key: "receiptNumber",
      label: "Receipt Details",
      render: (value, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-neutral-900">{value}</span>
          <span className="text-xs text-neutral-500">{row.studentName}</span>
        </div>
      ),
    },
    {
      key: "receiptDate",
      label: "Date",
      render: (value) => (
        <span className="text-neutral-600 text-sm">
          {new Date(value).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (value) => (
        <span className="font-semibold text-neutral-900">{formatCurrency(value)}</span>
      ),
    },
    {
      key: "paymentMode",
      label: "Payment",
      render: (value) => (
        <div className="flex flex-col">
          <span className="text-sm capitalize">{value || "Cash"}</span>
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">
            Method
          </span>
        </div>
      ),
    },
    {
      key: "approvalStatus",
      label: "Status",
      render: (value) => (
        <Badge
          variant={
            value === "approved" ? "success" : value === "rejected" ? "danger" : "warning"
          }
          className="capitalize px-3 py-1">
          {value || "Pending"}
        </Badge>
      ),
    },
    {
      key: "_id",
      label: "Actions",
      render: (value, row) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`View receipt ${row.receiptNumber}`}
            onClick={() => (window.location.href = `/receipts/${value}`)}>
            <Eye size={16} className="text-blue-600" />
          </Button>

          {user?.role === "director" && row.approvalStatus === "pending" && (
            <>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Approve receipt ${row.receiptNumber}`}
                onClick={() => setPendingApprove(value)}>
                <CheckCircle size={16} className="text-green-600" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Reject receipt ${row.receiptNumber}`}
                onClick={() => { setRejectModal(value); setRejectReason(""); }}>
                <XCircle size={16} className="text-red-600" />
              </Button>
            </>
          )}

          {row.approvalStatus === "pending" && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Delete receipt ${row.receiptNumber}`}
              onClick={() => deleteMutation.mutateAsync(value)}>
              <Trash2 size={16} className="text-neutral-400 hover:text-red-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const stats = [
    {
      label: "Total Volume",
      value: allReceipts?.length || 0,
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Pending Review",
      value: allReceipts?.filter((r) => r.approvalStatus === "pending").length || 0,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Approved",
      value: allReceipts?.filter((r) => r.approvalStatus === "approved").length || 0,
      icon: Check,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Rejected",
      value: allReceipts?.filter((r) => r.approvalStatus === "rejected").length || 0,
      icon: Ban,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={DollarSign}
        title="Fee Management"
        description="Monitor and process student payments and fiscal records"
        buttonText="New Receipt"
        onButtonClick={() => (window.location.href = "/receipts/new")}
        buttonIcon={Plus}
        buttonVariant="primary"
        iconBg="bg-red-50"
        iconColor="text-red-600"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6 flex items-center gap-4">
              <div
                className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                  {stat.label}
                </p>
                <p className="text-2xl font-black text-neutral-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="px-6 py-4 border-b border-neutral-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-neutral-50/30">
          <div className="flex p-1 bg-neutral-100 rounded-xl">
            {["all", "pending", "approved", "rejected"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                  statusFilter === status
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}>
                {status}
              </button>
            ))}
          </div>
          <div className="text-xs font-medium text-neutral-400 flex items-center gap-2">
            <Filter size={14} />
            Showing {receipts?.length || 0} results
          </div>
        </div>

        {/* Content */}
        <div className="p-0">
          {isLoading ? (
            <div className="p-4">
              <SectionSkeleton rows={5} />
            </div>
          ) : receipts && receipts.length > 0 ? (
            <Table
              columns={columns}
              data={receipts}
              searchable
              paginated
              pageSize={10}
              className="border-none"
            />
          ) : (
            <div className="py-20">
              <EmptyState
                icon={Plus}
                title="No Records Found"
                description="We couldn't find any receipts matching your current filter."
                action={() => setStatusFilter("all")}
                actionLabel="Clear Filters"
              />
            </div>
          )}
        </div>
      </div>

      {/* Approve confirmation modal */}
      <Modal
        isOpen={!!pendingApprove}
        onClose={() => setPendingApprove(null)}
        title="Approve Receipt"
        size="sm">
        <p className="text-sm text-slate-600 mb-6">
          Confirm approval of this receipt?
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setPendingApprove(null)}>
            Cancel
          </Button>
          <Button
            variant="success"
            fullWidth
            loading={approveMutation.isPending}
            onClick={handleConfirmApprove}>
            Approve
          </Button>
        </div>
      </Modal>

      {/* Reject reason modal */}
      <Modal
        isOpen={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectReason(""); }}
        title="Reject Receipt"
        size="md">
        <div className="space-y-4">
          <Textarea
            label="Rejection Reason"
            required
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection..."
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => { setRejectModal(null); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={rejectMutation.isPending}
              disabled={!rejectReason.trim()}
              onClick={handleConfirmReject}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
