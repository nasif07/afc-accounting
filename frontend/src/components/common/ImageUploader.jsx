import { useCallback, useId, useRef, useState } from "react";
import { UploadCloud, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Single-image picker with drag-and-drop, live preview and upload progress.
 *
 * Deliberately not a second copy of ApprovalFileDropzone: that one stages a
 * *list* of files and defers every upload to form submit, because an approval
 * request and its attachments have to be created in one transaction. A logo
 * has none of those constraints — it is one image, it replaces whatever was
 * there, and it commits on its own. Sharing a component between the two would
 * mean a multi-file staging model carried by a control that can only ever
 * hold one thing.
 *
 * What the two DO share is the transport (utils/r2Upload.js), which is the
 * part that was worth de-duplicating.
 *
 * Validation here is UX only — the server re-enforces type and size against
 * Cloudflare's own metadata before the key is ever persisted.
 */

const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function ImageUploader({
  currentUrl,
  accept = ["image/png", "image/jpeg", "image/webp"],
  maxSize = 2 * 1024 * 1024,
  uploading = false,
  progress = null,
  disabled = false,
  onSelect,
  onRemove,
  hint,
  emptyLabel = "Drag an image here, or browse",
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  // Object URL of the pending file, so the preview updates the instant one is
  // chosen rather than after the round trip.
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);
  const inputId = useId();
  // dragenter/dragleave fire for every child the pointer crosses, so a plain
  // boolean flickers; counting keeps the highlight stable.
  const dragDepth = useRef(0);

  const accepted = useCallback(
    (file) => {
      if (!accept.includes(file.type)) {
        return `${file.name}: must be a ${accept
          .map((type) => type.replace("image/", "").toUpperCase())
          .join(", ")} image`;
      }
      if (file.size > maxSize) {
        return `${file.name}: exceeds the ${formatBytes(maxSize)} limit`;
      }
      if (file.size === 0) return `${file.name}: file is empty`;
      return null;
    },
    [accept, maxSize],
  );

  const take = useCallback(
    (fileList) => {
      // Single-image control: if several are dropped, the first is the one the
      // user most likely meant, and silently taking all of them is worse.
      const file = fileList?.[0];
      if (!file) return;

      const reason = accepted(file);
      if (reason) {
        setError(reason);
        return;
      }

      setError("");
      setPreview((previous) => {
        // Object URLs are held by the document until explicitly revoked, so a
        // user trying several logos would otherwise leak one blob per attempt.
        if (previous) URL.revokeObjectURL(previous);
        return URL.createObjectURL(file);
      });
      onSelect?.(file);
    },
    [accepted, onSelect],
  );

  const shown = preview || currentUrl;
  const busy = uploading || disabled;

  return (
    <div className="space-y-2">
      <div
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setIsDragging(false);
          if (!busy) take(event.dataTransfer?.files);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => {
          event.preventDefault();
          if (busy) return;
          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setIsDragging(false);
        }}
        className={cn(
          "flex items-center gap-4 rounded-xl border-2 border-dashed px-4 py-4 transition",
          isDragging
            ? "border-brand-navy bg-brand-navy-light/40"
            : "border-slate-200 bg-slate-50/50",
          error && !isDragging && "border-red-300 bg-red-50/40",
          busy ? "opacity-70" : "hover:border-slate-300",
        )}>
        {/* ── Preview ── */}
        <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
          {shown ? (
            <img
              src={shown}
              alt="Logo preview"
              className="max-h-full max-w-full object-contain p-1"
              // A stored logo that 404s (deleted object, or the org is still
              // on the bundled artwork) should fall back to the placeholder
              // rather than showing a broken-image icon.
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <UploadCloud size={20} className="text-slate-300" aria-hidden="true" />
          )}
        </div>

        {/* ── Controls ── */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-700">{emptyLabel}</p>
          {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => !busy && inputRef.current?.click()}
              disabled={busy}
              aria-controls={inputId}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              {uploading ? (
                <>
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  {progress !== null ? `Uploading ${progress}%` : "Uploading…"}
                </>
              ) : (
                "Choose image"
              )}
            </button>

            {currentUrl && onRemove && (
              <button
                type="button"
                onClick={() => {
                  setPreview((previous) => {
                    if (previous) URL.revokeObjectURL(previous);
                    return null;
                  });
                  setError("");
                  onRemove();
                }}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50">
                <Trash2 size={12} aria-hidden="true" />
                Remove
              </button>
            )}
          </div>

          {/* The visible control is a real button and the input is only
              visually hidden, so keyboard and screen-reader users get the
              same path rather than a drop target they cannot use. */}
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={accept.join(",")}
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              take(event.target.files);
              // Reset so re-picking the same file after removing it still fires.
              event.target.value = "";
            }}
          />
        </div>
      </div>

      {uploading && progress !== null && (
        <div className="h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-navy transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="flex items-start gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
