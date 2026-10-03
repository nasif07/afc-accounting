import { useCallback } from "react";
import { useSearchParams } from "react-router";

/**
 * Keeps a modal's open/closed state in the URL query string.
 *
 * The same argument usePaginationParams.js makes for `?page=`: state a user can
 * see is state they expect to survive. A modal driven from `useState` breaks a
 * refresh, cannot be linked, and turns the browser Back button into "leave the
 * page" when the user meant "close the dialog". Putting it in the query fixes
 * all three at once, and it is what lets a notification email deep-link
 * straight to one request (`?request=<id>`) instead of dropping the director on
 * a list they then have to search.
 *
 * Two shapes, because modals come in two kinds:
 *   useQueryModal("new")            → a flag modal;  ?new=1
 *   useQueryModal("request", true)  → carries a value; ?request=<id>
 *
 * Closing uses `replace` so a modal opened and dismissed does not leave a dead
 * step in the history stack — Back from a closed modal returns to the previous
 * page, not to the modal reopening.
 *
 * CAUTION: do not pair open()/close() with another search-param write in the
 * same tick. react-router resolves a functional `setSearchParams` update
 * against the params captured in the render that queued it, not against the
 * live URL, so two writes in one event handler do not compose — the second
 * silently reinstates whatever the first removed. Where both have to change
 * together, make one call: usePaginationParams' `patchParams` merges an
 * arbitrary set of keys into a single navigation.
 *
 * @param {string}  key       the query parameter name
 * @param {boolean} hasValue  true when the param carries an id rather than a flag
 */
export function useQueryModal(key, hasValue = false) {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(key);
  const isOpen = hasValue ? !!raw : raw === "1" || raw === "true";
  const value = hasValue ? raw : null;

  // Merges into the existing params rather than replacing them, so opening a
  // modal never discards the page's `?page=`/`?limit=`/filter state.
  const open = useCallback(
    (nextValue) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(key, hasValue ? String(nextValue) : "1");
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams, key, hasValue],
  );

  const close = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(key);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams, key]);

  return { isOpen, value, open, close };
}

export default useQueryModal;
