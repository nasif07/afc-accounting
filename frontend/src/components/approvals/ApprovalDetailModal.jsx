import {
  Calendar,
  User,
  Paperclip,
  FileText,
  ImageIcon,
  MailCheck,
  MailX,
  AlertCircle,
} from "lucide-react";
import { Modal, Badge } from "../common";
import RichTextView from "../common/RichTextView";
import { SectionSkeleton } from "../common/Loaders";
import { useApproval } from "../../hooks/useApprovals";
import { useAttachmentViewer } from "../../hooks/useAttachmentViewer";
import AttachmentViewerModal from "./AttachmentViewerModal";
import { formatDisplayDate } from "../../utils/date";
import { getErrorMessage } from "../../utils/errors";
import { formatBytes, isImageType } from "./attachmentConstraints";

/**
 * The full read view of one approval request, opened from `?request=<id>`.
 *
 * Fetches by id rather than taking a row object as a prop, because the id can
 * arrive from outside this page's data: a link in a notification email, a
 * bookmark, or a refresh on page 4 of the list. Anything that reads the row
 * from the current page's cache would show a blank modal in exactly those
 * cases, which are the ones the URL-driven modal exists to serve.
 *
 * Page-specific actions (approve/reject for a director, notify/delete for the
 * accountant who raised it) come in through `renderActions` so this component
 * stays a viewer and both pages keep their own permissions logic.
 */

const STATUS_CONFIG = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

function MetaPill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <Icon size={12} className="shrink-0 text-slate-400" aria-hidden="true" />
      {children}
    </span>
  );
}

/** The per-recipient delivery log. Only rendered when something was sent. */
function NotificationLog({ notifications = [] }) {
  if (notifications.length === 0) return null;

  return (
    <section>
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        Email notifications
      </h4>
      <ul className="space-y-1.5">
        {notifications.map((entry, index) => (
          <li
            key={`${entry.email}-${entry.sentAt}-${index}`}
            className="flex items-start gap-2 text-xs">
            {entry.delivered ? (
              <MailCheck
                size={13}
                className="mt-0.5 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
            ) : (
              <MailX
                size={13}
                className="mt-0.5 shrink-0 text-red-500"
                aria-hidden="true"
              />
            )}
            <span className="min-w-0">
              <span className="text-slate-700">{entry.email}</span>
              <span className="text-slate-400">
                {" · "}
                {formatDisplayDate(entry.sentAt)}
              </span>
              {/* The failure reason is the whole value of logging a failed
                  send — without it the row just says "something went wrong". */}
              {!entry.delivered && entry.error && (
                <span className="block text-red-600">{entry.error}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ApprovalDetailModal({
  approvalId,
  onClose,
  renderActions,
}) {
  const { data: approval, isLoading, isError, error } = useApproval(approvalId);
  const attachmentViewer = useAttachmentViewer();

  const status = STATUS_CONFIG[approval?.status] ?? {
    label: approval?.status,
    variant: "secondary",
  };

  return (
    <Modal
      isOpen={!!approvalId}
      onClose={onClose}
      title={approval?.title || "Approval Request"}
      description={
        approval
          ? `Submitted by ${approval.createdBy?.name || "Unknown"}`
          : "Loading request…"
      }
      size="2xl">
      {isLoading ? (
        <SectionSkeleton rows={6} />
      ) : isError ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {getErrorMessage(error, "Failed to load this request")}
            </p>
            <p className="mt-0.5 text-xs text-red-600">
              The link may point at a request that was deleted or that you
              cannot access.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Header meta ── */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={status.variant} size="sm">
              {status.label}
            </Badge>
            <MetaPill icon={Calendar}>
              {formatDisplayDate(approval.date)}
            </MetaPill>
            <MetaPill icon={User}>
              {approval.createdBy?.name || "Unknown"}
            </MetaPill>
            <MetaPill icon={Paperclip}>
              {approval.attachments?.length ?? 0} file
              {(approval.attachments?.length ?? 0) !== 1 ? "s" : ""}
            </MetaPill>
          </div>

          {/* ── Decision banner ── */}
          {approval.status === "approved" && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Approved by{" "}
              <strong>{approval.approvedBy?.name || "a director"}</strong> on{" "}
              {formatDisplayDate(approval.approvedAt)}.
            </p>
          )}
          {approval.status === "rejected" && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-800">
                Rejected by{" "}
                <strong>{approval.rejectedBy?.name || "a director"}</strong> on{" "}
                {formatDisplayDate(approval.rejectedAt)}.
              </p>
              {approval.rejectionReason && (
                <p className="mt-1.5 text-sm text-red-700">
                  {approval.rejectionReason}
                </p>
              )}
            </div>
          )}

          {/* ── Description ── */}
          <section>
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Description
            </h4>
            <RichTextView
              html={approval.description}
              emptyText="No description was provided."
            />
          </section>

          {/* ── Attachments ── */}
          {approval.attachments?.length > 0 && (
            <section>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Attachments
              </h4>
              <ul className="grid gap-2 sm:grid-cols-2">
                {approval.attachments.map((attachment) => {
                  const Icon = isImageType(attachment.mimeType)
                    ? ImageIcon
                    : FileText;

                  return (
                    <li key={attachment.key}>
                      <button
                        type="button"
                        onClick={() =>
                          attachmentViewer.open({
                            approvalId: approval._id,
                            key: attachment.key,
                            filename: attachment.filename,
                            mimeType: attachment.mimeType,
                            size: attachment.size,
                          })
                        }
                        className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-brand-navy hover:bg-brand-navy-light/40">
                        <Icon
                          size={15}
                          className="shrink-0 text-slate-500"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-slate-700">
                            {attachment.filename}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {formatBytes(attachment.size)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <NotificationLog notifications={approval.notifications} />

          {renderActions && (
            <div className="border-t border-slate-100 pt-4">
              {renderActions(approval)}
            </div>
          )}
        </div>
      )}

      <AttachmentViewerModal {...attachmentViewer.viewerProps} />
    </Modal>
  );
}
