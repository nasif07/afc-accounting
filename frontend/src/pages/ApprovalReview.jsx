import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  RefreshCcw,
  Check,
  X,
  CheckCircle2,
  Eye,
  CheckCheck,
} from "lucide-react";
import { Button, Modal, Textarea, Pagination } from "../components/common";
import SectionHeader from "../components/common/SectionHeader";
import { SectionSkeleton, ErrorState } from "../components/common/Loaders";
import ApprovalCard from "../components/approvals/ApprovalCard";
import ApprovalStats from "../components/approvals/ApprovalStats";
import StatusFilterPills from "../components/approvals/StatusFilterPills";
import ApprovalDetailModal from "../components/approvals/ApprovalDetailModal";
import {
  useApprovals,
  useApprovalStats,
  useApproveApproval,
  useRejectApproval,
  useBulkApproveApprovals,
} from "../hooks/useApprovals";
import { useAttachmentViewer } from "../hooks/useAttachmentViewer";
import AttachmentViewerModal from "../components/approvals/AttachmentViewerModal";
import { usePaginationParams } from "../hooks/usePaginationParams";
import { useQueryModal } from "../hooks/useQueryModal";
import { formatDisplayDate } from "../utils/date";
import { getErrorMessage } from "../utils/errors";

// ── Component ──────────────────────────────────────────────────────────────

export default function ApprovalReview() {
  const [rejectTarget, setRejectTarget] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Defaults to Pending: this is a work queue, and the job it exists for is
  // the requests that still need a decision. The other filters are there to
  // look something up, not to be where you start.
  const [statusFilter, setStatusFilter] = useState("pending");

  // `?request=<id>` — the target of the "Review this request" button in the
  // notification email, so a director can land straight on the request instead
  // of hunting for it in the queue.
  const detailModal = useQueryModal("request", true);

  const { page, pageSize, setPage, setPageSize, resetPage } =
    usePaginationParams(20);

  const queryParams = useMemo(
    () => ({ page, limit: pageSize, ...(statusFilter && { status: statusFilter }) }),
    [page, pageSize, statusFilter],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useApprovals(queryParams);
  const { data: stats, isLoading: statsLoading } = useApprovalStats();

  const approveApproval = useApproveApproval();
  const rejectApproval = useRejectApproval();
  const bulkApprove = useBulkApproveApprovals();
  const attachmentViewer = useAttachmentViewer();

  // Memoised so the identity is stable across renders where the query result
  // did not change — bulkTargets derives from it, and a fresh [] every render
  // would recompute that (and re-render every card) on any unrelated state
  // change, such as typing in the rejection reason.
  const approvals = useMemo(() => data?.data ?? [], [data]);
  const pagination = data?.pagination;

  const busy =
    approveApproval.isPending ||
    rejectApproval.isPending ||
    bulkApprove.isPending;

  // Only pending rows can be bulk-approved. With the All filter active the
  // page also holds decided requests, and sending those would have the server
  // skip them and report a confusing "3 were skipped" against a button the
  // user thought applied to one row.
  const bulkTargets = useMemo(
    () => approvals.filter((approval) => approval.status === "pending"),
    [approvals],
  );

  // Landing on a page that emptied out (everything on it was just approved)
  // would otherwise show a misleading "all caught up" while later pages still
  // hold work.
  useEffect(() => {
    if (!isFetching && approvals.length === 0 && page > 1) {
      setPage(page - 1);
    }
  }, [isFetching, approvals.length, page, setPage]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const confirmApprove = async () => {
    const target = approveTarget;
    setApproveTarget(null);
    if (!target) return;

    await approveApproval.mutateAsync(target._id).catch(() => {});
    // Under the Pending filter a decided request drops out of the list, so
    // leaving its modal open on the URL would strand the director on a record
    // that is no longer part of this screen.
    if (detailModal.value === target._id && statusFilter === "pending") {
      detailModal.close();
    }
  };

  const confirmReject = async () => {
    const reason = rejectionReason.trim();
    if (!reason) return;

    const target = rejectTarget;
    try {
      await rejectApproval.mutateAsync({ id: target._id, rejectionReason: reason });
      setRejectTarget(null);
      setRejectionReason("");
      if (detailModal.value === target._id && statusFilter === "pending") {
        detailModal.close();
      }
    } catch {
      // The hook already surfaced the error; keep the modal open so the
      // director does not lose the reason they just typed.
    }
  };

  const confirmBulkApprove = async () => {
    const ids = bulkTargets.map((approval) => approval._id);
    setShowBulkConfirm(false);
    if (ids.length > 0) await bulkApprove.mutateAsync(ids).catch(() => {});
  };

  const closeRejectModal = () => {
    setRejectTarget(null);
    setRejectionReason("");
  };

  const decisionActions = (approval) =>
    approval.status === "pending" ? (
      <>
        <Button
          variant="outline"
          size="sm"
          icon={Eye}
          onClick={() => detailModal.open(approval._id)}>
          View Details
        </Button>
        <Button
          variant="success"
          size="sm"
          icon={Check}
          disabled={busy}
          loading={
            approveApproval.isPending && approveApproval.variables === approval._id
          }
          onClick={() => setApproveTarget(approval)}
          className="bg-brand-navy hover:bg-brand-navy-dark focus:ring-brand-navy-light disabled:bg-slate-300">
          Approve
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={X}
          disabled={busy}
          onClick={() => setRejectTarget(approval)}>
          Reject
        </Button>
      </>
    ) : (
      <Button
        variant="outline"
        size="sm"
        icon={Eye}
        onClick={() => detailModal.open(approval._id)}>
        View Details
      </Button>
    );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={ClipboardList}
        iconBg="bg-red-50"
        iconColor="text-red-600"
        title="Approval Requests"
        description="Review supporting documents submitted by accountants and sign them off."
        hotkey={false}
      />

      <ApprovalStats stats={stats} loading={statsLoading} leadLabel="your approval" />

      <StatusFilterPills
        value={statusFilter}
        onChange={(next) => {
          setStatusFilter(next);
          resetPage();
        }}
        disabled={isLoading}>
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCcw}
          loading={isFetching}
          onClick={refetch}>
          Refresh
        </Button>
        {bulkTargets.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            icon={CheckCheck}
            loading={bulkApprove.isPending}
            disabled={busy}
            onClick={() => setShowBulkConfirm(true)}>
            Approve All ({bulkTargets.length})
          </Button>
        )}
      </StatusFilterPills>

      {/* ── Content ── */}
      {isError ? (
        <ErrorState
          message={getErrorMessage(error, "Failed to load approval requests")}
          onRetry={refetch}
        />
      ) : isLoading ? (
        // Same grid as the real content, so the layout does not jump when the
        // cards arrive.
        <div className="grid gap-3 xl:grid-cols-2">
          <SectionSkeleton rows={5} />
          <SectionSkeleton rows={4} />
          <SectionSkeleton rows={5} />
          <SectionSkeleton rows={4} />
        </div>
      ) : approvals.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy-light">
            <CheckCircle2 size={26} className="text-brand-navy" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">
            {statusFilter === "pending" ? "All caught up" : "Nothing to show"}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {statusFilter === "pending"
              ? "No approval requests are pending right now."
              : "No requests match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Two-up from xl only. The sidebar already takes 16rem, so at lg a
              two-column grid leaves each card around 360px — narrower than the
              action bar needs, and the description preview stops being
              readable. One column below that is the honest fit. */}
          <div className="grid gap-3 xl:grid-cols-2">
            {approvals.map((approval) => (
              <ApprovalCard
                key={approval._id}
                approval={approval}
                onOpen={(row) => detailModal.open(row._id)}
                onOpenAttachment={attachmentViewer.open}
                actions={decisionActions(approval)}
              />
            ))}
          </div>

          {/* Outside the grid: the pager belongs to the whole list, not to a
              cell in it. */}
          {pagination && pagination.pages > 1 && (
            <Pagination
              currentPage={page}
              totalItems={pagination.total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={isFetching}
              itemLabel="requests"
            />
          )}
        </div>
      )}

      <AttachmentViewerModal {...attachmentViewer.viewerProps} />

      {/* ── Detail (?request=<id>) ── */}
      {detailModal.isOpen && (
        <ApprovalDetailModal
          approvalId={detailModal.value}
          onClose={detailModal.close}
          renderActions={(approval) =>
            approval.status === "pending" ? (
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  icon={X}
                  fullWidth
                  disabled={busy}
                  onClick={() => setRejectTarget(approval)}>
                  Reject
                </Button>
                <Button
                  variant="success"
                  icon={Check}
                  fullWidth
                  disabled={busy}
                  onClick={() => setApproveTarget(approval)}
                  className="bg-brand-navy hover:bg-brand-navy-dark focus:ring-brand-navy-light">
                  Approve
                </Button>
              </div>
            ) : null
          }
        />
      )}

      {/* ── Single approve confirmation ── */}
      <Modal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="Approve Request"
        description={
          approveTarget
            ? `"${approveTarget.title}" will be marked approved and recorded against your name. This cannot be undone.`
            : ""
        }
        size="sm">
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setApproveTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="success"
            fullWidth
            loading={approveApproval.isPending}
            onClick={confirmApprove}
            className="bg-brand-navy hover:bg-brand-navy-dark focus:ring-brand-navy-light">
            Approve
          </Button>
        </div>
      </Modal>

      {/* ── Bulk approve confirmation ── */}
      <Modal
        isOpen={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        title={`Approve ${bulkTargets.length} Request${bulkTargets.length !== 1 ? "s" : ""}?`}
        description="Every pending request shown on this page will be approved and recorded against your name. This cannot be undone."
        size="md">
        <div className="space-y-4">
          <ul className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
            {bulkTargets.map((approval) => (
              <li
                key={approval._id}
                className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-slate-700">
                  {approval.title}
                </span>
                <span className="shrink-0 text-slate-400">
                  {formatDisplayDate(approval.date)}
                </span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-slate-500">
            Requests another director has already actioned are skipped
            automatically and reported back.
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setShowBulkConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              fullWidth
              loading={bulkApprove.isPending}
              onClick={confirmBulkApprove}
              className="bg-brand-navy hover:bg-brand-navy-dark focus:ring-brand-navy-light">
              Approve All
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Reject ── */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={closeRejectModal}
        title="Reject Request"
        description="Explain what is wrong so the accountant can correct and resubmit."
        size="md">
        <div className="space-y-4">
          <Textarea
            label="Rejection Reason"
            required
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. The invoice attached is a quotation, not a final invoice. Please attach the signed invoice."
          />
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={closeRejectModal}>
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={rejectApproval.isPending}
              disabled={!rejectionReason.trim()}
              onClick={confirmReject}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
