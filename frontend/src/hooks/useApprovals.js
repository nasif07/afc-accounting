import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { approvalAPI } from "../services/apiMethods";
import { uploadToR2 } from "../utils/r2Upload";

// Re-exported: the approvals UI has always imported the uploader from here,
// and the implementation moving to utils/r2Upload.js (so the Settings logo
// uploader can share it) is not a reason to churn those call sites.
export { uploadToR2 };

const APPROVALS_KEY = ["approvals"];

// Same contract as useStudents.js: normalize a thrown axios error into
// { message, errors? } so mutation consumers never reach into err.response.
const normalizeError = (e, fallback) =>
  e.response?.data || { message: e.message || fallback };

// True when the backend returned structured per-field issues
// (errorMiddleware.js's `errors: [{ field, message }]`). The form maps those
// onto fields via setError, so a generic toast on top would be noise.
const hasFieldErrors = (e) => Array.isArray(e.errors) && e.errors.length > 0;

const invalidate = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: APPROVALS_KEY });

// ── Attachment upload ──────────────────────────────────────────────────────

/**
 * Full upload flow for a staged file list: ask the API for presigned URLs,
 * push every file to R2 in parallel, and return the attachment refs the
 * create call expects.
 *
 * Only { key, filename } is returned — size and MIME are deliberately NOT sent
 * back, because the server re-reads the real values from R2 (HeadObject) and
 * would not trust ours anyway.
 */
export async function uploadAttachments(stagedFiles, { onProgress, signal } = {}) {
  const { data } = await approvalAPI.presignUploads(
    stagedFiles.map(({ file }) => ({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    })),
  );

  const uploads = data?.data?.uploads || [];

  await Promise.all(
    uploads.map((upload, index) =>
      uploadToR2({
        uploadUrl: upload.uploadUrl,
        file: stagedFiles[index].file,
        contentType: upload.contentType,
        signal,
        onProgress: (percent) =>
          onProgress?.(stagedFiles[index].id, percent),
      }),
    ),
  );

  return uploads.map((upload) => ({
    key: upload.key,
    filename: upload.filename,
  }));
}

// ── Queries ────────────────────────────────────────────────────────────────

export const useApprovals = (params = {}) =>
  useQuery({
    // params are part of the key so page/status/search changes refetch.
    queryKey: [...APPROVALS_KEY, params],
    queryFn: async () => {
      const response = await approvalAPI.getAll(params);
      return response.data.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (previous) => previous, // smooth pagination transitions
  });

export const useApproval = (id) =>
  useQuery({
    queryKey: [...APPROVALS_KEY, "detail", id],
    queryFn: async () => {
      try {
        const response = await approvalAPI.getById(id);
        return response.data.data;
      } catch (error) {
        throw normalizeError(error, "Failed to load approval request");
      }
    },
    enabled: !!id,
    // A hand-edited or stale `?request=` in the URL is a 404, and retrying it
    // three times only delays telling the user the request is gone.
    retry: false,
  });

/**
 * The directors this user may notify.
 *
 * Cached for the session rather than per-mount: the list changes when someone
 * is promoted or deactivated, which is a once-in-months event, and both the
 * create form and the Notify modal ask for it.
 */
/**
 * Counts for the KPI row. Kept as its own query rather than derived from the
 * list: the list is paginated and filtered, so it can only ever count the page
 * in front of you, and a tile that changes when you switch pages is worse than
 * no tile.
 */
export const useApprovalStats = (params = {}) =>
  useQuery({
    queryKey: [...APPROVALS_KEY, "stats", params],
    queryFn: async () => {
      const response = await approvalAPI.getStats(params);
      return response.data.data;
    },
    staleTime: 30 * 1000,
  });

export const useDirectors = (enabled = true) =>
  useQuery({
    queryKey: ["approvals", "directors"],
    queryFn: async () => {
      const response = await approvalAPI.getDirectors();
      return response.data.data.directors ?? [];
    },
    enabled,
    staleTime: 15 * 60 * 1000,
  });

// ── Mutations ──────────────────────────────────────────────────────────────

export const useCreateApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      try {
        const response = await approvalAPI.create(data);
        return response.data.data;
      } catch (error) {
        throw normalizeError(error, "Failed to submit approval request");
      }
    },
    onSuccess: (result) => {
      invalidate(queryClient);
      toast.success("Approval request submitted");

      // The request itself succeeded — mail is sent after the transaction
      // commits and cannot roll it back — so a delivery failure is reported
      // separately rather than turning the whole submit into an error.
      const notify = result?.notifyResult;
      if (notify?.sent?.length > 0) {
        toast.success(`Emailed ${notify.sent.map((r) => r.name).join(", ")}`);
      }
      if (notify?.failed?.length > 0) {
        toast.error(
          `Request saved, but ${notify.failed
            .map((r) => r.name)
            .join(", ")} could not be emailed — ${notify.failed[0].error}`,
          { duration: 8000 },
        );
      }
    },
    onError: (error) => {
      if (!hasFieldErrors(error)) {
        toast.error(error.message || "Failed to submit approval request");
      }
    },
  });
};

export const useApproveApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      try {
        const response = await approvalAPI.approve(id);
        return response.data.data;
      } catch (error) {
        throw normalizeError(error, "Failed to approve request");
      }
    },
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Request approved");
    },
    onError: (error) => toast.error(error.message || "Failed to approve request"),
  });
};

export const useRejectApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, rejectionReason }) => {
      try {
        const response = await approvalAPI.reject(id, { rejectionReason });
        return response.data.data;
      } catch (error) {
        throw normalizeError(error, "Failed to reject request");
      }
    },
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Request rejected");
    },
    onError: (error) => toast.error(error.message || "Failed to reject request"),
  });
};

/**
 * Bulk approve. The server runs the whole batch in one transaction but skips
 * rows that another director already actioned, so a success response can still
 * carry skips — surfaced here as a warning rather than swallowed.
 */
export const useBulkApproveApprovals = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids) => {
      try {
        const response = await approvalAPI.bulkApprove(ids);
        return response.data.data;
      } catch (error) {
        throw normalizeError(error, "Failed to approve requests");
      }
    },
    onSuccess: (result) => {
      invalidate(queryClient);

      if (result.totalApproved > 0) {
        toast.success(`Approved ${result.totalApproved} request(s)`);
      }
      if (result.totalSkipped > 0) {
        toast.warning(
          `${result.totalSkipped} request(s) were skipped — they had already been actioned.`,
        );
      }
    },
    onError: (error) => toast.error(error.message || "Failed to approve requests"),
  });
};

/**
 * Emails a request to selected directors.
 *
 * Partial delivery is the interesting case and the reason this does not just
 * toast the server's message: SMTP fails per recipient, so "notified 2 of 3"
 * is a real outcome that must not be reported as either success or failure.
 * The names of who could not be reached are what the user needs in order to
 * chase them another way.
 */
export const useNotifyDirectors = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, directorIds }) => {
      try {
        const response = await approvalAPI.notify(id, directorIds);
        return response.data.data;
      } catch (error) {
        throw normalizeError(error, "Failed to send notification");
      }
    },
    onSuccess: (result) => {
      invalidate(queryClient);

      if (result.sent.length > 0) {
        toast.success(
          `Emailed ${result.sent.map((r) => r.name).join(", ")}`,
        );
      }
      if (result.failed.length > 0) {
        toast.error(
          `Could not email ${result.failed.map((r) => r.name).join(", ")} — ${result.failed[0].error}`,
          { duration: 8000 },
        );
      }
      if (result.sent.length === 0 && result.failed.length === 0) {
        toast.warning("No active directors matched your selection");
      }
    },
    onError: (error) => toast.error(error.message || "Failed to send notification"),
  });
};

export const useDeleteApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      try {
        const response = await approvalAPI.delete(id);
        return response.data.data;
      } catch (error) {
        throw normalizeError(error, "Failed to delete request");
      }
    },
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Approval request deleted");
    },
    onError: (error) => toast.error(error.message || "Failed to delete request"),
  });
};
