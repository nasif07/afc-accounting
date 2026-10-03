/**
 * Direct-to-R2 browser upload.
 *
 * Extracted from hooks/useApprovals.js so approval attachments and the
 * organisation logo share one implementation. They had drifted apart once
 * already: the logo had no uploader at all, and the attachment path carried
 * the only working knowledge of how these requests fail.
 *
 * The contract everywhere: the API mints a presigned PUT, the browser sends
 * the bytes straight to Cloudflare, and the server re-reads what actually
 * landed (HeadObject) before persisting anything. Nothing here is trusted.
 */

/**
 * Works out why a direct-to-R2 upload was blocked, so the error names a cause
 * the user can act on.
 *
 * The XHR that failed knows nothing: status 0, no headers, no body — R2 sends
 * no CORS headers on its error responses, so the browser refuses to show us
 * one. But the two realistic causes are distinguishable by a second request. A
 * no-cors fetch is exempt from CORS entirely: the response is opaque and
 * useless, yet the request still has to leave the machine. So:
 *
 *   probe throws    → something between the browser and Cloudflare dropped it
 *                     (ad/privacy blocker, corporate proxy, TLS interception,
 *                     DNS filtering, or simply offline). No bucket setting can
 *                     cause or fix this.
 *   probe succeeds  → the host is reachable and R2 refused the PUT itself: the
 *                     bucket's CORS policy does not cover this origin, or the
 *                     presigned URL expired or failed its signature check.
 *
 * Telling those apart matters. The message this replaces asserted a CORS
 * misconfiguration every time, which sent people to the Cloudflare dashboard
 * to fix a policy that was already correct.
 */
export async function describeUploadFailure(uploadUrl, filename) {
  const origin = new URL(uploadUrl).origin;

  // Bounded: this runs while the user watches a failed upload, and an
  // unreachable host would otherwise hang until the browser's own timeout.
  const timeout = new Promise((_, rejectTimeout) =>
    setTimeout(() => rejectTimeout(new Error("timed out")), 5000),
  );

  try {
    await Promise.race([
      fetch(origin, { method: "GET", mode: "no-cors", cache: "no-store" }),
      timeout,
    ]);
  } catch {
    return `Could not upload "${filename}". Your browser could not reach the storage service at all — this is usually an ad or privacy blocker, a VPN or corporate proxy, or no internet connection. It is not a problem with the file or with the server.`;
  }

  return `Could not upload "${filename}". The storage service is reachable but refused the upload. Either this site's address (${window.location.origin}) is missing from the R2 bucket's CORS policy, or the upload link expired before the transfer finished.`;
}

/**
 * PUTs one file straight to Cloudflare R2 using a presigned URL.
 *
 * Uses XMLHttpRequest rather than the app's axios instance for two reasons:
 * the request must NOT carry the app's cookies or base URL to a third-party
 * host, and XHR exposes upload progress events, which fetch() does not.
 *
 * The Content-Type header must match what the URL was signed for exactly, or
 * R2 rejects the PUT — that pinning is what makes direct upload safe.
 */
export function uploadToR2({ uploadUrl, file, contentType, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", contentType || file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Upload failed for "${file.name}" (${xhr.status})`));
      }
    };

    // status 0 means the browser refused to hand us the response, not that the
    // transfer failed — see describeUploadFailure for how the real cause is
    // recovered instead of guessed at.
    xhr.onerror = () => {
      describeUploadFailure(uploadUrl, file.name).then((message) =>
        reject(new Error(message)),
      );
    };

    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));

    signal?.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(file);
  });
}
