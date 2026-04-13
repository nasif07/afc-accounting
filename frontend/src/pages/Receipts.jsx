import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  DollarSign,
} from "lucide-react";
import {
  useReceiptsAdvanced,
  useApproveReceiptAdvanced,
  useRejectReceiptAdvanced,
  useDeleteReceiptAdvanced,
} from "../hooks/useReceiptsAdvanced";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/EmptyState";
import { Card, CardContent } from "../components/ui/Card";
import StatusPipeline from "../components/StatusPipeline";
import { formatCurrency } from "../utils/currency";
import SectionHeader from "../components/common/SectionHeader";

export default function Receipts() {
  const { user } = useSelector((state) => state.auth);
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch data
  const { data: allReceipts, isLoading } = useReceiptsAdvanced();

  // Filter receipts
  const receipts =
    statusFilter === "all"
      ? allReceipts
      : allReceipts?.filter((r) => r.approvalStatus === statusFilter);

  // Mutations
  const approveMutation = useApproveReceiptAdvanced();
  const rejectMutation = useRejectReceiptAdvanced();
  const deleteMutation = useDeleteReceiptAdvanced();

  // Handle approve
  const handleApprove = async (id) => {
    if (window.confirm("Approve this receipt?")) {
      await approveMutation.mutateAsync(id);
    }
  };

  // Handle reject
  const handleReject = async (id) => {
    const reason = window.prompt("Enter rejection reason:");
    if (reason) {
      await rejectMutation.mutateAsync({ id, reason });
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this receipt?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  // Table columns
  const columns = [
    { key: "receiptNumber", label: "Receipt #" },
    {
      key: "receiptDate",
      label: "Date",
      render: (value) => new Date(value).toLocaleDateString(),
    },
    { key: "studentName", label: "Student" },
    {
      key: "feeType",
      label: "Fee Type",
      render: (value) => <Badge variant="info">{value || "General"}</Badge>,
    },
    {
      key: "amount",
      label: "Amount",
      render: (value) => formatCurrency(value),
    },
    {
      key: "paymentMode",
      label: "Method",
      render: (value) => <Badge variant="secondary">{value || "Cash"}</Badge>,
    },
    {
      key: "approvalStatus",
      label: "Status",
      render: (value) => (
        <Badge
          variant={
            value === "approved"
              ? "success"
              : value === "rejected"
                ? "danger"
                : "warning"
          }>
          {value || "Pending"}
        </Badge>
      ),
    },
    {
      key: "_id",
      label: "Actions",
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => (window.location.href = `/receipts/${value}`)}
            className="text-blue-600 hover:text-blue-700 transition"
            title="View">
            <Eye size={16} />
          </button>
          {row.approvalStatus === "pending" && (
            <>
              <button
                onClick={() => handleDelete(value)}
                className="text-red-600 hover:text-red-700 transition"
                title="Delete">
                <Trash2 size={16} />
              </button>
            </>
          )}
          {user?.role === "director" && row.approvalStatus === "pending" && (
            <>
              <button
                onClick={() => handleApprove(value)}
                className="text-green-600 hover:text-green-700 transition"
                title="Approve">
                <CheckCircle size={16} />
              </button>
              <button
                onClick={() => handleReject(value)}
                className="text-red-600 hover:text-red-700 transition"
                title="Reject">
                <XCircle size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <SectionHeader
        icon={DollarSign}
        title="Fee Collection"
        description="Manage student fee receipts and payments"
        buttonText="New Receipt"
        // onButtonClick={handleNewReceipt}
        buttonIcon={Plus}
        buttonColor="bg-red-600 hover:bg-red-700" // Alliance Française theme
        iconBg="bg-red-50"
        iconColor="text-red-600"
      />

      {/* Status Pipeline */}
      <Card>
        <CardContent className="pt-6">
          <StatusPipeline status="draft" />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-600 mb-2">Total Receipts</p>
            <p className="text-3xl font-bold text-neutral-900">
              {allReceipts?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-600 mb-2">Pending</p>
            <p className="text-3xl font-bold text-neutral-900">
              {allReceipts?.filter((r) => r.approvalStatus === "pending")
                ?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-600 mb-2">Approved</p>
            <p className="text-3xl font-bold text-neutral-900">
              {allReceipts?.filter((r) => r.approvalStatus === "approved")
                ?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-600 mb-2">Total Amount</p>
            <p className="text-3xl font-bold text-neutral-900">
              {formatCurrency(
                allReceipts?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "approved", "rejected"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "primary" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Receipts Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center">
          <p className="text-neutral-600">Loading receipts...</p>
        </div>
      ) : receipts && receipts.length > 0 ? (
        <Table
          columns={columns}
          data={receipts}
          searchable
          paginated
          pageSize={10}
        />
      ) : (
        <EmptyState
          icon={Plus}
          title="No Receipts"
          description="Start by creating your first receipt."
          action={() => (window.location.href = "/receipts/new")}
          actionLabel="Create Receipt"
        />
      )}
    </div>
  );
}
