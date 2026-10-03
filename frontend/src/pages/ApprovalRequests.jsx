import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBlocker } from "react-router";
import { z } from "zod";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Plus,
  Paperclip,
  Trash2,
  FileText,
  Mail,
} from "lucide-react";
import {
  Button,
  Badge,
  Modal,
  Input,
  DatePicker,
  FormField,
  Table,
} from "../components/common";
import RichTextEditor from "../components/common/RichTextEditor";
import SectionHeader from "../components/common/SectionHeader";
import ApprovalStats from "../components/approvals/ApprovalStats";
import StatusFilterPills from "../components/approvals/StatusFilterPills";
import { ErrorState } from "../components/common/Loaders";
import ApprovalFileDropzone from "../components/approvals/ApprovalFileDropzone";
import ApprovalDetailModal from "../components/approvals/ApprovalDetailModal";
import DirectorNotifyPicker from "../components/approvals/DirectorNotifyPicker";
import NotifyDirectorsModal from "../components/approvals/NotifyDirectorsModal";
import { MAX_FILES } from "../components/approvals/attachmentConstraints";
import {
  useApprovals,
  useApprovalStats,
  useCreateApproval,
  useDeleteApproval,
  uploadAttachments,
} from "../hooks/useApprovals";
import { useAttachmentViewer } from "../hooks/useAttachmentViewer";
import AttachmentViewerModal from "../components/approvals/AttachmentViewerModal";
import { usePaginationParams } from "../hooks/usePaginationParams";
import { useQueryModal } from "../hooks/useQueryModal";
import { formatDisplayDate, todayISO } from "../utils/date";
import { getErrorMessage } from "../utils/errors";
import { isRichTextEmpty, htmlToPlainText, toPreview } from "../utils/richText";

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

const DESCRIPTION_MAX = 2000;

// Mirrors createApprovalBody in backend/src/validation/approval.validation.js.
// The attachment rule lives outside this schema because the staged files are
// held in component state (File objects), not in the form payload.
const approvalSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters"),
  // The editor's value is HTML, so both rules run on its plain-text
  // projection — exactly as the server's richText() validator does. Measuring
  // the markup instead would let the same sentence pass or fail depending on
  // whether a word in it happens to be bold.
  description: z
    .string()
    .refine((html) => !isRichTextEmpty(html), "Description is required")
    .refine(
      (html) => htmlToPlainText(html).length <= DESCRIPTION_MAX,
      `Description cannot exceed ${DESCRIPTION_MAX} characters`,
    ),
  date: z.string().min(1, "Date is required"),
});

const INITIAL_FORM = { title: "", description: "", date: todayISO() };

// The submit button lives in the Modal's footer, outside the <form> element,
// so it reaches the form through this id rather than by being nested in it.
const CREATE_FORM_ID = "approval-create-form";

// The query parameter that holds the create modal open. Named here because
// both useQueryModal and the combined post-submit navigation below refer to it.
const CREATE_PARAM = "new";

// ── Component ──────────────────────────────────────────────────────────────

export default function ApprovalRequests() {
  const [statusFilter, setStatusFilter] = useState("");
  const [stagedFiles, setStagedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [notifyTarget, setNotifyTarget] = useState(null);

  // Notification state is separate from the form schema: the recipients are
  // not a property of the request, they are an instruction about what to do
  // once it exists.
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifyDirectors, setNotifyDirectors] = useState([]);

  // Both modals live in the URL — see hooks/useQueryModal.js. `?request=<id>`
  // in particular is what the "Review this request" link in a notification
  // email points at.
  // Cancel is already an explicit "throw this away", so it must not trigger
  // the discard confirmation — that guard exists for the exits the user did
  // NOT choose: Back, a nav link, closing the tab. A ref rather than state
  // because react-router consults the blocker synchronously, during the same
  // event that requests the navigation and before React has re-rendered with
  // any state change Cancel made.
  const bypassGuardRef = useRef(false);

  const createModal = useQueryModal(CREATE_PARAM);
  const detailModal = useQueryModal("request", true);

  const { page, pageSize, setPage, setPageSize, resetPage, patchParams } =
    usePaginationParams(20);

  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      mine: true, // a director opening this page sees their own submissions
      ...(statusFilter && { status: statusFilter }),
    }),
    [page, pageSize, statusFilter],
  );

  const { data, isLoading, isError, error, refetch } = useApprovals(queryParams);
  // mine: true — a director opening this page is looking at their OWN
  // submissions, so the tiles must count the same rows the table below shows
  // rather than the whole organisation's queue.
  const { data: stats, isLoading: statsLoading } = useApprovalStats({ mine: true });
  const createApproval = useCreateApproval();
  const deleteApproval = useDeleteApproval();
  const attachmentViewer = useAttachmentViewer();
  // Pulled out so the columns memo below can depend on the stable callback
  // rather than on the hook's return object, which is new every render.
  const { open: openAttachment } = attachmentViewer;

  const approvals = data?.data ?? [];
  const pagination = data?.pagination;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(approvalSchema), defaultValues: INITIAL_FORM });

  const isSubmitting = uploading || createApproval.isPending;
  // The form holds un-uploaded File objects; losing it means re-picking every
  // attachment, so guard both in-app navigation and a browser-level unload.
  const hasUnsavedWork =
    createModal.isOpen && (isDirty || stagedFiles.length > 0);

  // ── Unsaved-changes guards ───────────────────────────────────────────────

  useEffect(() => {
    if (!hasUnsavedWork || isSubmitting) return;

    const handler = (event) => {
      event.preventDefault();
      // Required by Chrome; the string itself is never displayed any more.
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedWork, isSubmitting]);

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) => {
        if (bypassGuardRef.current) {
          bypassGuardRef.current = false;
          return false;
        }
        if (!hasUnsavedWork || isSubmitting) return false;
        if (currentLocation.pathname !== nextLocation.pathname) return true;

        // Now that the form is a URL modal, Back does not leave the page — it
        // drops `?new=`. Without this the browser's own Back button would
        // silently bin a form full of staged attachments, which is precisely
        // what this guard exists to prevent.
        const wasOpen = new URLSearchParams(currentLocation.search).has("new");
        const willBeOpen = new URLSearchParams(nextLocation.search).has("new");
        return wasOpen && !willBeOpen;
      },
      [hasUnsavedWork, isSubmitting],
    ),
  );

  // ── Form lifecycle ───────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    reset(INITIAL_FORM);
    setStagedFiles([]);
    setUploadProgress({});
    setFileError("");
    setNotifyEnabled(false);
    setNotifyDirectors([]);
  }, [reset]);

  const closeForm = () => {
    if (isSubmitting) return;
    bypassGuardRef.current = true;
    createModal.close();
    resetForm();
  };

  const openForm = () => {
    resetForm();
    createModal.open();
  };

  // Belt and braces: if a close ever happens without the blocker being
  // consulted, the flag must not survive to swallow the next real guard.
  useEffect(() => {
    if (!createModal.isOpen) bypassGuardRef.current = false;
  }, [createModal.isOpen]);

  const handleProgress = useCallback((fileId, percent) => {
    setUploadProgress((prev) => ({ ...prev, [fileId]: percent }));
  }, []);

  const onSubmit = async (values) => {
    if (stagedFiles.length === 0) {
      setFileError("At least one attachment is required");
      return;
    }
    if (notifyEnabled && notifyDirectors.length === 0) {
      toast.error("Select at least one director to email, or turn notification off");
      return;
    }
    setFileError("");

    let attachments;
    try {
      setUploading(true);
      // Files go straight from the browser to Cloudflare R2 via presigned PUT;
      // only the resulting keys are sent to our API below.
      attachments = await uploadAttachments(stagedFiles, {
        onProgress: handleProgress,
      });
    } catch (uploadError) {
      toast.error(getErrorMessage(uploadError, "Failed to upload attachments"));
      return;
    } finally {
      setUploading(false);
    }

    try {
      await createApproval.mutateAsync({
        ...values,
        attachments,
        // Empty unless the accountant opted in — the server treats an absent
        // or empty list as "submit quietly".
        notifyDirectors: notifyEnabled ? notifyDirectors : [],
      });
      bypassGuardRef.current = true;
      // ONE navigation, deliberately — not createModal.close() followed by
      // resetPage(). Those are two separate setSearchParams calls, and
      // react-router resolves each one's `prev` from the render that queued
      // it rather than from the live URL: the second still saw `new=1` and put
      // it straight back, so the modal stayed open after a successful submit.
      patchParams({ [CREATE_PARAM]: null, page: 1 });
      resetForm();
    } catch (submitError) {
      // Map backend per-field issues (errorMiddleware.js `errors[]`) onto the
      // matching inputs instead of dropping them into a generic toast.
      const fieldErrors = submitError?.errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        fieldErrors.forEach(({ field, message }) => {
          if (!field) return;
          if (field.startsWith("attachments")) setFileError(message);
          else setError(field, { type: "server", message });
        });
      }
    }
  };

  const confirmDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (target) {
      await deleteApproval.mutateAsync(target._id).catch(() => {});
      // A deleted request must not leave its modal hanging on the URL.
      if (detailModal.value === target._id) detailModal.close();
    }
  };

  // ── Table ────────────────────────────────────────────────────────────────

  const columns = useMemo(
    () => [
      {
        key: "title",
        label: "Request",
        wrap: true,
        primary: true,
        render: (title, row) => (
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{title}</p>
            {/* Plain text, never the stored HTML: a preview built from markup
                would show tags, and clamping it could cut mid-tag. */}
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
              {toPreview(row.descriptionText, row.description)}
            </p>
          </div>
        ),
      },
      {
        key: "date",
        label: "Date",
        render: (value) => formatDisplayDate(value),
      },
      {
        key: "attachments",
        label: "Files",
        align: "center",
        render: (attachments = []) => (
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <Paperclip size={13} className="text-slate-400" aria-hidden="true" />
            {attachments.length}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (status, row) => {
          const config = STATUS_CONFIG[status] ?? {
            label: status,
            variant: "secondary",
          };
          const notified = (row.notifications ?? []).filter((n) => n.delivered);

          return (
            <div className="flex flex-col items-start gap-1">
              <Badge variant={config.variant} size="sm">
                {config.label}
              </Badge>
              {notified.length > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] text-slate-400"
                  title={notified.map((n) => n.email).join(", ")}>
                  <Mail size={10} aria-hidden="true" />
                  emailed {notified.length}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "_actions",
        label: "",
        align: "right",
        type: "actions",
        render: (_value, row) => (
          // The row itself opens the detail modal, so every control inside it
          // has to stop the click from bubbling up into that handler.
          <div
            className="flex justify-end gap-1"
            onClick={(event) => event.stopPropagation()}>
            {(row.attachments ?? []).map((attachment) => (
              <button
                key={attachment.key}
                type="button"
                title={attachment.filename}
                aria-label={`Open ${attachment.filename}`}
                onClick={() =>
                  openAttachment({
                    approvalId: row._id,
                    key: attachment.key,
                    filename: attachment.filename,
                    mimeType: attachment.mimeType,
                    size: attachment.size,
                  })
                }
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-navy">
                <FileText size={15} />
              </button>
            ))}
            {row.status === "pending" && (
              <>
                <button
                  type="button"
                  title="Email a director about this request"
                  aria-label={`Email a director about ${row.title}`}
                  onClick={() => setNotifyTarget(row)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-brand-navy-light hover:text-brand-navy">
                  <Mail size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${row.title}`}
                  onClick={() => setPendingDelete(row)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        ),
      },
    ],
    // The stable callback, not the hook's return object: that object is new
    // every render, so depending on it rebuilt this column set on every
    // keystroke elsewhere on the page and made the memo do nothing.
    [openAttachment],
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={ClipboardCheck}
        iconBg="bg-brand-navy-light"
        iconColor="text-brand-navy"
        title="Approval Requests"
        description="Submit supporting documents to the director for sign-off."
        buttonText="New Request"
        buttonIcon={Plus}
        onButtonClick={openForm}
      />

      {/* The same KPI row as the director's queue, but read from this user's
          side of it: "awaiting the director" rather than "awaiting you". */}
      <ApprovalStats
        stats={stats}
        loading={statsLoading}
        leadLabel="the director's approval"
      />

      <StatusFilterPills
        value={statusFilter}
        onChange={(next) => {
          setStatusFilter(next);
          resetPage();
        }}
        disabled={isLoading}
      />

      {isError ? (
        <ErrorState
          message={getErrorMessage(error, "Failed to load approval requests")}
          onRetry={refetch}
        />
      ) : (
        <Table
          columns={columns}
          data={approvals}
          rowKey={(row) => row._id}
          loading={isLoading}
          onRowClick={(row) => detailModal.open(row._id)}
          emptyIcon={ClipboardCheck}
          emptyMessage="No approval requests yet"
          emptyDescription="Submit a request with its supporting documents to get started."
          emptyAction={
            <Button icon={Plus} onClick={openForm}>
              New Request
            </Button>
          }
          itemLabel="requests"
          // Server-driven: the API paginates, so the table must not re-slice.
          totalItems={pagination?.total ?? 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          paginationDisabled={isLoading}
        />
      )}

      <AttachmentViewerModal {...attachmentViewer.viewerProps} />

      {/* ── Detail (?request=<id>) ── */}
      {detailModal.isOpen && (
        <ApprovalDetailModal
          approvalId={detailModal.value}
          onClose={detailModal.close}
          renderActions={(approval) =>
            approval.status === "pending" ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  icon={Mail}
                  onClick={() => setNotifyTarget(approval)}>
                  Email a Director
                </Button>
                <Button
                  variant="danger"
                  icon={Trash2}
                  onClick={() => setPendingDelete(approval)}>
                  Delete
                </Button>
              </div>
            ) : null
          }
        />
      )}

      {/* ── Create form (?new=1) ── */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={closeForm}
        title="New Approval Request"
        description="Attach the supporting documents the director needs to review."
        size="2xl"
        footer={
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={isSubmitting}
              onClick={closeForm}>
              Cancel
            </Button>
            {/* form={id} is what connects this to the <form> in the body —
                a submit button outside its form is inert without it. */}
            <Button
              type="submit"
              form={CREATE_FORM_ID}
              fullWidth
              loading={isSubmitting}>
              {uploading ? "Uploading files..." : "Submit for Approval"}
            </Button>
          </div>
        }>
        <form
          id={CREATE_FORM_ID}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4">
          <Input
            label="Title"
            required
            touched={!!errors.title}
            error={errors.title?.message}
            placeholder="e.g. Annual fire-safety inspection invoice"
            {...register("title")}
          />

          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Date"
                required
                value={field.value}
                onChange={field.onChange}
                error={errors.date?.message}
              />
            )}
          />

          {/* Controller, not register(): the editor's value is HTML held in
              ProseMirror's own state, so there is no input element for RHF to
              take a ref to. */}
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <RichTextEditor
                label="Description"
                required
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.description?.message}
                maxLength={DESCRIPTION_MAX}
                disabled={isSubmitting}
                placeholder="Explain what is being requested and why it needs approval."
                hint="Use headings and lists to make a long request quick to scan."
              />
            )}
          />

          <FormField
            label="Attachments"
            required
            hint={`PDF or image files. Up to ${MAX_FILES} files per request.`}>
            <ApprovalFileDropzone
              value={stagedFiles}
              onChange={(files) => {
                setStagedFiles(files);
                setFileError("");
              }}
              progress={uploadProgress}
              uploading={uploading}
              disabled={isSubmitting}
              error={fileError}
            />
          </FormField>

          <FormField label="Notify">
            <DirectorNotifyPicker
              enabled={notifyEnabled}
              onEnabledChange={setNotifyEnabled}
              selected={notifyDirectors}
              onSelectedChange={setNotifyDirectors}
              disabled={isSubmitting}
            />
          </FormField>

        </form>
      </Modal>

      {/* ── Notify a director about an existing request ── */}
      <NotifyDirectorsModal
        approval={notifyTarget}
        onClose={() => setNotifyTarget(null)}
      />

      {/* ── Leave-page confirmation ── */}
      <Modal
        isOpen={blocker.state === "blocked"}
        onClose={() => blocker.reset?.()}
        title="Discard this request?"
        description="Your attachments have not been uploaded yet and will be lost."
        size="sm">
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => blocker.reset?.()}>
            Keep Editing
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              resetForm();
              blocker.proceed?.();
            }}>
            Discard
          </Button>
        </div>
      </Modal>

      {/* ── Delete confirmation ── */}
      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete Approval Request"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" will be withdrawn from the director's queue.`
            : ""
        }
        size="sm">
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            fullWidth
            loading={deleteApproval.isPending}
            onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
