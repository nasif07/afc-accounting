import { useCallback, useId, useRef, useState } from "react";
import { UploadCloud, FileText, ImageIcon, X, AlertCircle } from "lucide-react";
import { cn } from "../../utils/cn";
import {
  ACCEPTED_MIME_TYPES,
  ACCEPT_ATTR,
  MAX_FILE_SIZE,
  MAX_FILES,
  formatBytes,
  isImageType,
} from "./attachmentConstraints";

/**
 * Native HTML5 drag-and-drop multi-file picker.
 *
 * Deliberately dependency-free. @dnd-kit (already in the project) is a
 * pointer-based list-reordering library and does not handle OS file drops;
 * react-dropzone would be a new dependency for ~50 lines of DataTransfer
 * handling. The hidden <input type="file"> keeps click-to-browse and keyboard
 * access working, so the drop target is an enhancement rather than the only
 * way in.
 *
 * Files are staged locally and uploaded on submit, not on drop — so removing a
 * file before submitting leaves nothing orphaned in the bucket.
 *
 * Every rule enforced here is re-enforced server-side (approval.service.js
 * verifyAttachments) against Cloudflare's own metadata; this is UX, not
 * security.
 */


/**
 * Validates a candidate list against type, size and the remaining slot count.
 * Returns the accepted files plus a human-readable reason for each rejection,
 * so the user is told what happened instead of files silently vanishing.
 */
const validateFiles = (incoming, existing) => {
  const accepted = [];
  const rejected = [];
  let remaining = MAX_FILES - existing.length;

  for (const file of incoming) {
    if (remaining <= 0) {
      rejected.push(`${file.name}: limit of ${MAX_FILES} files reached`);
      continue;
    }

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      rejected.push(`${file.name}: only PDF, PNG, JPG and WEBP are allowed`);
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      rejected.push(`${file.name}: exceeds the ${formatBytes(MAX_FILE_SIZE)} limit`);
      continue;
    }

    if (file.size === 0) {
      rejected.push(`${file.name}: file is empty`);
      continue;
    }

    // Same name + size + mtime almost certainly means the user dropped the
    // same file twice; the server rejects duplicate keys anyway.
    const duplicate = existing.some(
      (staged) =>
        staged.file.name === file.name &&
        staged.file.size === file.size &&
        staged.file.lastModified === file.lastModified,
    );
    if (duplicate) {
      rejected.push(`${file.name}: already attached`);
      continue;
    }

    accepted.push({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
    });
    remaining -= 1;
  }

  return { accepted, rejected };
};

export default function ApprovalFileDropzone({
  value = [],
  onChange,
  progress = {},
  disabled = false,
  uploading = false,
  error,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [rejections, setRejections] = useState([]);
  const inputRef = useRef(null);
  const inputId = useId();
  // dragenter/dragleave fire for every child element the pointer crosses, so a
  // plain boolean flickers. Counting enters and leaves keeps the highlight
  // stable while the pointer moves over the zone's children.
  const dragDepth = useRef(0);

  const addFiles = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList || []);
      if (incoming.length === 0) return;

      const { accepted, rejected } = validateFiles(incoming, value);
      setRejections(rejected);
      if (accepted.length > 0) onChange([...value, ...accepted]);
    },
    [value, onChange],
  );

  const handleDrop = (event) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    if (disabled) return;
    addFiles(event.dataTransfer?.files);
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const removeFile = (id) => {
    onChange(value.filter((staged) => staged.id !== id));
    setRejections([]);
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const atLimit = value.length >= MAX_FILES;

  return (
    <div className="space-y-3">
      {/* ── Drop zone ── */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={cn(
          "rounded-xl border-2 border-dashed px-6 py-8 text-center transition",
          isDragging
            ? "border-brand-navy bg-brand-navy-light/40"
            : "border-slate-200 bg-slate-50/50",
          error && !isDragging && "border-red-300 bg-red-50/40",
          disabled || atLimit ? "opacity-60" : "hover:border-slate-300",
        )}>
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
          <UploadCloud
            size={20}
            className={isDragging ? "text-brand-navy" : "text-slate-400"}
            aria-hidden="true"
          />
        </div>

        <p className="text-sm font-semibold text-slate-700">
          {atLimit
            ? `Maximum of ${MAX_FILES} files attached`
            : "Drag and drop files here"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          PDF, PNG, JPG or WEBP · up to {formatBytes(MAX_FILE_SIZE)} each ·{" "}
          {value.length}/{MAX_FILES} attached
        </p>

        {/* The visible control is a real button, and the input is only hidden
            visually — so keyboard and screen-reader users get the same path. */}
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || atLimit}
          aria-controls={inputId}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          Browse files
        </button>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="sr-only"
          disabled={disabled || atLimit}
          onChange={(event) => {
            addFiles(event.target.files);
            // Reset so re-selecting the same file after removing it still fires.
            event.target.value = "";
          }}
        />
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      {/* ── Per-file rejection reasons ── */}
      {rejections.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          {rejections.map((reason) => (
            <li
              key={reason}
              className="flex items-start gap-2 text-xs text-amber-800">
              <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              {reason}
            </li>
          ))}
        </ul>
      )}

      {/* ── Staged file list ── */}
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map(({ id, file }) => {
            const percent = progress[id];
            const Icon = isImageType(file.type) ? ImageIcon : FileText;

            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                  <Icon size={15} className="text-slate-500" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>

                  {uploading && percent !== undefined && (
                    <div
                      className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Uploading ${file.name}`}>
                      <div
                        className="h-full rounded-full bg-brand-navy transition-all duration-200"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(id)}
                  disabled={uploading}
                  aria-label={`Remove ${file.name}`}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40">
                  <X size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
