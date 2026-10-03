const RELOAD_FLAG = "chunk-reload-attempted";

// After a redeploy, an already-open tab still references the previous build's
// hashed chunk files, which no longer exist on the server. The lazy() import
// for the next page then rejects and the route errors out. A single reload
// picks up the new index.html and fixes it, so do that automatically — once,
// guarded by sessionStorage so a genuinely broken chunk can't reload-loop.
export function isChunkLoadError(error) {
  const message = String(error?.message || error || "");
  return (
    error?.name === "ChunkLoadError" ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Unable to preload CSS/i.test(message)
  );
}

export function reloadOnceForChunkError() {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false;
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    // Storage blocked — still worth one reload attempt.
  }
  window.location.reload();
  return true;
}

// Called once the app has run cleanly, so a later deploy can trigger its own
// one-time reload.
export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    // ignore
  }
}
