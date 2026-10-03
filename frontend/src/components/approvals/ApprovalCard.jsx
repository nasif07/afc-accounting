import {
  Calendar,
  User,
  Paperclip,
  FileText,
  ImageIcon,
  Download,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Badge } from "../common";
import RichTextView from "../common/RichTextView";
import { formatDisplayDate } from "../../utils/date";
import { formatBytes, isImageType } from "./attachmentConstraints";

/**
 * One approval request, as a card.
 *
 * Shared by the director's review queue and (potentially) any other list that
 * wants the same anatomy, with the page supplying its own action buttons
 * through `actions` — the card knows how to present a request, not what a
 * particular role is allowed to do with it.
 *
 * The whole card is NOT a single button. It contains attachment buttons, a
 * "read more" affordance and up to three actions, and nesting those inside a
 * clickable parent is both invalid HTML and a reliable way to fire the wrong
 * thing on a mis-click. The title, the chevron and "Read full request" are the
 * explicit ways in.
 */

const STATUS_CONFIG = {
  pending: { label: "Pending", variant: "warning", accent: "bg-amber-400" },
  approved: { label: "Approved", variant: "success", accent: "bg-emerald-500" },
  rejected: { label: "Rejected", variant: "danger", accent: "bg-red-500" },
};

function MetaPill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <Icon size={12} className="shrink-0 text-slate-400" aria-hidden="true" />
      {children}
    </span>
  );
}

export default function ApprovalCard({ approval, onOpen, onOpenAttachment, actions }) {
  const status = STATUS_CONFIG[approval.status] ?? {
    label: approval.status,
    variant: "secondary",
    accent: "bg-slate-300",
  };

  const fileCount = approval.attachments?.length ?? 0;

  return (
    // h-full + flex-col so cards in the same grid row share a height and
    // their action bars line up. Without it each card is only as tall as its
    // own description and the row ends up ragged.
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md">
      {/* Status stripe: the one place the card's state is visible while
          scanning a long list at speed, before any text is read. */}
      <div className={`h-1 ${status.accent}`} />

      {/* flex-1 takes the slack, which is what pushes the actions bar to the
          bottom edge of a card shorter than its neighbour. */}
      <div className="flex-1 p-5">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy-light">
            <FileText size={17} className="text-brand-navy" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  <button
                    type="button"
                    onClick={() => onOpen(approval)}
                    className="rounded text-left transition hover:text-brand-navy hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-light">
                    {approval.title}
                  </button>
                </h3>
                <Badge variant={status.variant} size="sm">
                  {status.label}
                </Badge>
              </div>

              <button
                type="button"
                onClick={() => onOpen(approval)}
                aria-label={`Open ${approval.title}`}
                className="shrink-0 rounded-lg p-1 text-slate-300 transition hover:bg-slate-100 hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-light">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <MetaPill icon={Calendar}>{formatDisplayDate(approval.date)}</MetaPill>
              <span className="text-slate-200" aria-hidden="true">|</span>
              <MetaPill icon={User}>{approval.createdBy?.name || "Unknown"}</MetaPill>
              <span className="text-slate-200" aria-hidden="true">|</span>
              <MetaPill icon={Paperclip}>
                {fileCount} file{fileCount !== 1 ? "s" : ""}
              </MetaPill>
            </div>

            {approval.description && (
              // Capped and faded rather than clamped to a line count: a
              // formatted description can be a heading plus a list, and
              // line-clamp on mixed block content cuts at an arbitrary place
              // with no hint that there is more.
              <div className="mt-3 border-t border-slate-50 pt-3">
                <div className="relative max-h-24 overflow-hidden">
                  <RichTextView html={approval.description} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(approval)}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-navy transition hover:gap-1.5 hover:underline">
                  Read full request
                  <ArrowRight size={12} aria-hidden="true" />
                </button>
              </div>
            )}

            {fileCount > 0 && (
              // One per row. At two-up the card is roughly half the page wide,
              // and a two-column chip list truncates filenames like
              // "WhatsApp Image 2026-05-11 at 6.42.58 PM.jpeg" down to noise.
              <ul className="mt-4 grid gap-2">
                {approval.attachments.map((attachment) => {
                  const Icon = isImageType(attachment.mimeType) ? ImageIcon : FileText;

                  return (
                    <li key={attachment.key}>
                      <button
                        type="button"
                        onClick={() =>
                          // filename/mimeType/size travel with the request so
                          // the lightbox can render its header and pick image
                          // vs. new-tab before the presigned URL comes back.
                          onOpenAttachment({
                            approvalId: approval._id,
                            key: attachment.key,
                            filename: attachment.filename,
                            mimeType: attachment.mimeType,
                            size: attachment.size,
                          })
                        }
                        className="group flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-brand-navy hover:bg-brand-navy-light/40">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                          <Icon size={14} className="text-slate-500" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-slate-700">
                            {attachment.filename}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {formatBytes(attachment.size)}
                          </span>
                        </span>
                        <Download
                          size={14}
                          className="shrink-0 text-slate-300 transition group-hover:text-brand-navy"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          {actions}
        </div>
      )}
    </article>
  );
}
