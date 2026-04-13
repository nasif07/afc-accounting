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
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/EmptyState";
import { Card, CardContent } from "../components/ui/Card";
import { formatCurrency } from "../utils/currency";
import SectionHeader from "../components/common/SectionHeader";

export default function Receipts() {
  const { user } = useSelector((state) => state.auth);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: allReceipts, isLoading } = useReceiptsAdvanced();

  const receipts =
    statusFilter === "all"
      ? allReceipts
      : allReceipts?.filter((r) => r.approvalStatus === statusFilter);

  const approveMutation = useApproveReceiptAdvanced();
  const rejectMutation = useRejectReceiptAdvanced();
  const deleteMutation = useDeleteReceiptAdvanced();

  const handleApprove = async (id) => {
    if (window.confirm("Confirm receipt approval?")) {
      await approveMutation.mutateAsync(id);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Enter rejection reason:");
    if (reason) await rejectMutation.mutateAsync({ id, reason });
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
        <span className="font-semibold text-neutral-900">
          {formatCurrency(value)}
        </span>
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
            value === "approved"
              ? "success"
              : value === "rejected"
                ? "danger"
                : "warning"
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
          <button
            onClick={() => (window.location.href = `/receipts/${value}`)}
            className="p-2 hover:bg-blue-50 text-blue-600 rounded-full transition-colors"
            title="View Details">
            <Eye size={18} />
          </button>

          {user?.role === "director" && row.approvalStatus === "pending" && (
            <>
              <button
                onClick={() => handleApprove(value)}
                className="p-2 hover:bg-green-50 text-green-600 rounded-full transition-colors"
                title="Approve">
                <CheckCircle size={18} />
              </button>
              <button
                onClick={() => handleReject(value)}
                className="p-2 hover:bg-red-50 text-red-600 rounded-full transition-colors"
                title="Reject">
                <XCircle size={18} />
              </button>
            </>
          )}

          {row.approvalStatus === "pending" && (
            <button
              onClick={() => deleteMutation.mutateAsync(value)}
              className="p-2 hover:bg-neutral-100 text-neutral-400 hover:text-red-600 rounded-full transition-all"
              title="Delete">
              <Trash2 size={18} />
            </button>
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
      value:
        allReceipts?.filter((r) => r.approvalStatus === "pending").length || 0,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Approved",
      value:
        allReceipts?.filter((r) => r.approvalStatus === "approved").length || 0,
      icon: Check,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Rejected",
      value:
        allReceipts?.filter((r) => r.approvalStatus === "rejected").length || 0,
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
        buttonColor="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-100"
        iconBg="bg-red-50"
        iconColor="text-red-600"
      />

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card
            key={i}
            className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6 flex items-center gap-4">
              <div
                className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                  {stat.label}
                </p>
                <p className="text-2xl font-black text-neutral-900">
                  {stat.value}
                </p>
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

        {/* Dynamic Content Area */}
        <div className="p-0">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-neutral-500">
                Syncing ledger...
              </p>
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
    </div>
  );
}
