import { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { settingsAPI } from "../services/apiMethods";
import { uploadToR2 } from "../utils/r2Upload";
import { fetchSettings } from "../store/slices/settingsSlice";

/**
 * Upload / remove the organisation logo.
 *
 * Three steps, the same shape as approval attachments: ask the API for a
 * presigned PUT, send the bytes straight to R2, then hand the key back so the
 * server can verify what actually landed and save it. The bytes never pass
 * through our API, and the key is only ever one the server minted.
 *
 * Not a react-query mutation, unlike hooks/useApprovals.js: the logo lives in
 * the Redux settings slice (every screen reads it from there for the sidebar
 * and report headers), so the authoritative refresh is a re-fetch of settings
 * rather than a query-cache invalidation.
 */
export function useOrgLogo() {
  const dispatch = useDispatch();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [removing, setRemoving] = useState(false);

  const upload = async (file) => {
    setUploading(true);
    setProgress(0);

    try {
      const { data: presigned } = await settingsAPI.presignLogo({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      const { key, uploadUrl, contentType } = presigned.data;

      await uploadToR2({
        uploadUrl,
        file,
        contentType,
        onProgress: setProgress,
      });

      // Only now does the logo actually change: until this call the object is
      // an orphan in the bucket and the org still shows its previous artwork.
      await settingsAPI.setLogo(key);

      // The sidebar, payslip preview and report headers all read the logo from
      // the settings slice, so nothing on screen updates until this lands.
      await dispatch(fetchSettings());
      toast.success("Logo updated");
      return true;
    } catch (error) {
      // uploadToR2 already produces a diagnosed message for the R2 leg
      // (utils/r2Upload.js describeUploadFailure); an axios error from our own
      // API carries the server's message instead.
      const message =
        error.response?.data?.message || error.message || "Failed to update the logo";
      toast.error(message, { duration: 8000 });
      return false;
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await settingsAPI.clearLogo();
      await dispatch(fetchSettings());
      toast.success("Logo removed — reports will use the default artwork");
      return true;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to remove the logo",
      );
      return false;
    } finally {
      setRemoving(false);
    }
  };

  return { upload, remove, uploading, removing, progress };
}

export default useOrgLogo;
