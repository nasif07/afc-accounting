import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";

// Every list endpoint in this app clamps `limit` server-side (100 on
// journal/payroll/pettycash/bank, 200 on the ledger). The UI never offers
// more than 100, so this is a belt-and-braces guard against a hand-typed
// `?limit=` in the URL rather than the source of truth.
export const DEFAULT_MAX_PAGE_SIZE = 100;

/**
 * Keeps `?page=` / `?limit=` in the URL so pagination state survives a
 * refresh, a shared link and the back button. Replaces the per-page
 * `useState` + `Object.fromEntries(searchParams)` copy-paste that used to
 * live in Students/Payroll and nowhere else.
 *
 * @param {number} defaultPageSize page size when `?limit=` is absent
 * @param {{pageKey?: string, limitKey?: string, maxPageSize?: number}} options
 *   `pageKey`/`limitKey` let two independent pagers coexist on one route.
 */
export function usePaginationParams(defaultPageSize = 20, options = {}) {
  const {
    pageKey = "page",
    limitKey = "limit",
    maxPageSize = DEFAULT_MAX_PAGE_SIZE,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  const rawPage = Number.parseInt(searchParams.get(pageKey), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawLimit = Number.parseInt(searchParams.get(limitKey), 10);
  const pageSize =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, maxPageSize)
      : defaultPageSize;

  // react-router's `setSearchParams` is `useCallback(..., [navigate,
  // searchParams])` — its identity changes on every URL change, and its
  // functional form resolves `prev` from the `searchParams` captured in that
  // render rather than from a ref. Holding it behind a ref keeps the setters
  // below identity-stable (so callers can list them in dep arrays without
  // re-running an effect on every page change) while still routing through
  // the newest closure, so `prev` is never a stale snapshot.
  const setSearchParamsRef = useRef(setSearchParams);
  useEffect(() => {
    setSearchParamsRef.current = setSearchParams;
  }, [setSearchParams]);

  // Functional update form so we merge into whatever params are already
  // there (search, filters, report type) instead of clobbering them.
  const patchParams = useCallback((patch) => {
    setSearchParamsRef.current((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      return next;
    });
  }, []);

  const setPage = useCallback(
    (nextPage) => patchParams({ [pageKey]: Math.max(1, Number(nextPage) || 1) }),
    [patchParams, pageKey],
  );

  // Changing page size always returns to page 1 — the old offset is
  // meaningless against the new page boundaries.
  const setPageSize = useCallback(
    (nextSize) =>
      patchParams({
        [limitKey]: Math.min(
          maxPageSize,
          Math.max(1, Number(nextSize) || defaultPageSize),
        ),
        [pageKey]: 1,
      }),
    [patchParams, limitKey, pageKey, maxPageSize, defaultPageSize],
  );

  // For filter/search changes: the current offset no longer applies.
  const resetPage = useCallback(
    () => patchParams({ [pageKey]: 1 }),
    [patchParams, pageKey],
  );

  return { page, pageSize, setPage, setPageSize, resetPage, patchParams };
}

export default usePaginationParams;
