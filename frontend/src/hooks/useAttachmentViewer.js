import { useCallback, useState } from "react";
import { toast } from "sonner";
import { approvalAPI } from "../services/apiMethods";
import { isImageType } from "../components/approvals/attachmentConstraints";

/**
 * Opens an approval attachment: images in a lightbox, everything else in a
 * new tab.
 *
 * Replaces the old useOpenAttachment, which sent every attachment to a new
 * tab. For an image that is the wrong trade — reviewing a request means
 * looking at a receipt and then deciding, and a new tab discards the queue,
 * the scroll position and any modal that was open behind it.
 *
 * Both paths still mint a fresh presigned GET per view. The URL is the
 * capability (the bucket is private and the link expires in minutes), so it is
 * never cached or reused across opens.
 *
 * Returns `viewerProps` to spread straight onto <AttachmentViewerModal/>, so a
 * page wires this up in two lines rather than juggling four pieces of state.
 */
export function useAttachmentViewer() {
  const [attachment, setAttachment] = useState(null);
  const [url, setUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const close = useCallback(() => {
    setAttachment(null);
    setUrl(null);
    setError(null);
  }, []);

  const open = useCallback(async ({ approvalId, key, filename, mimeType, size }) => {
    // Decided before the request so the lightbox can open immediately with a
    // spinner, instead of the UI sitting inert until the URL comes back.
    const asImage = isImageType(mimeType);

    if (asImage) {
      setAttachment({ filename, mimeType, size });
      setUrl(null);
      setError(null);
      setIsLoading(true);
    }

    try {
      const response = await approvalAPI.getAttachmentUrl(approvalId, key);
      const result = response.data.data;

      if (asImage) {
        setUrl(result.url);
      } else {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } catch (requestError) {
      const message =
        requestError.response?.data?.message || "Failed to open attachment";

      if (asImage) setError(message);
      else toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    open,
    close,
    viewerProps: { attachment, url, isLoading, error, onClose: close },
  };
}

export default useAttachmentViewer;
