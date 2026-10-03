import { Download, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { Modal, Button } from "../common";
import { formatBytes } from "./attachmentConstraints";

/**
 * Lightbox for an approval attachment.
 *
 * Images render here rather than in a new tab: reviewing a request means
 * looking at a receipt and then deciding, and a new tab throws away the queue,
 * the scroll position and the modal you were reading. Closing this returns you
 * to exactly where you were.
 *
 * PDFs deliberately still open in a new tab. Embedding one would mean an
 * <iframe> or <embed> pointing at the R2 host, which the app's CSP does not
 * allow — `default-src 'self'` covers frame-src, and widening it to admit a
 * third-party origin into a frame is a real concession to make for a preview
 * the browser's own PDF viewer already does better. A top-level navigation is
 * not subject to those directives, so the tab keeps working.
 *
 * The image URL is a short-lived presigned GET, so nothing here is cached and
 * the modal is only ever opened with a URL that was just minted.
 */
export default function AttachmentViewerModal({
  attachment,
  url,
  isLoading = false,
  error = null,
  onClose,
}) {
  const isOpen = !!attachment;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={attachment?.filename || "Attachment"}
      description={
        attachment?.size ? formatBytes(attachment.size) : "Loading attachment…"
      }
      size="4xl">
      <div className="space-y-4">
        <div className="flex min-h-64 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-3">
          {isLoading ? (
            <span className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Loading image…
            </span>
          ) : error ? (
            <span className="flex items-start gap-2 px-4 text-sm text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </span>
          ) : url ? (
            <img
              src={url}
              alt={attachment.filename}
              // Bounded by the viewport, not the natural size: a phone photo of
              // a receipt is several thousand pixels wide and would otherwise
              // blow the modal out and force horizontal scrolling.
              className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
            />
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          {url && (
            <>
              {/* A plain link, not a fetch + blob: the presigned URL already
                  carries a Content-Disposition set by the API, so the browser
                  names the file correctly on its own. */}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <ExternalLink size={14} aria-hidden="true" />
                Open in new tab
              </a>
              <a
                href={url}
                download={attachment.filename}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <Download size={14} aria-hidden="true" />
                Download
              </a>
            </>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
