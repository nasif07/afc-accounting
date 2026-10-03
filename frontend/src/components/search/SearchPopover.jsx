import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  GraduationCap,
  Loader2,
  NotebookText,
  Search,
  Users,
} from "lucide-react";
import { searchAPI } from "../../services/apiMethods";
import { formatCurrency } from "../../utils/currency";
import { formatDisplayDate } from "../../utils/date";

const DEBOUNCE_MS = 300;
// Matches search.validation.js's `q` minimum — below this the backend 400s,
// so there's no point spending a request to find that out.
const MIN_QUERY_LENGTH = 2;

const TYPE_ICONS = {
  journalEntries: NotebookText,
  students: GraduationCap,
  employees: Users,
};

// Where each result type navigates. Only journal entries have a detail route;
// Students and Employees are list-page-plus-modal, so those land on the
// existing list pre-filtered via `?search=` rather than getting a new detail
// view built for them.
const ROUTE_BUILDERS = {
  journalEntries: (result) => `/dashboard/journal-entries/${result.id}`,
  students: (result) =>
    `/dashboard/students?search=${encodeURIComponent(result.searchKey || result.title)}`,
  employees: (result) =>
    `/dashboard/employees?search=${encodeURIComponent(result.searchKey || result.title)}`,
};

const isAbort = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

/**
 * Search results panel, anchored directly beneath the header's search trigger.
 *
 * Renders `absolute`, so the parent element must be `relative` — it is
 * deliberately not a fixed-position overlay: this is a lightweight popover
 * that leaves the page visible and usable behind it, not a modal that dims
 * and locks the whole viewport.
 */
export default function SearchPopover({ isOpen, onClose, query, onQueryChange }) {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  // Distinguishes "haven't searched yet" from "searched, found nothing" — the
  // difference between showing the prompt and showing a no-results message.
  const [hasSearched, setHasSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const panelRef = useRef(null);
  const abortRef = useRef(null);

  // Flattened view of the grouped results — arrow keys move through this,
  // while rendering still walks the groups.
  const flatResults = useMemo(
    () => groups.flatMap((group) => group.results),
    [groups],
  );

  const resetState = useCallback(() => {
    setGroups([]);
    setIsLoading(false);
    setError("");
    setHasSearched(false);
    setActiveIndex(0);
  }, []);

  // Clear results on close so the next open doesn't flash the previous
  // query's hits. The query text itself is owned by Layout (the visible input
  // lives there from md up), so Layout clears that.
  useEffect(() => {
    if (isOpen) {
      // Only the mobile fallback input lives in here; from md up the user is
      // already typing in the header, so stealing focus would be wrong.
      const timer = setTimeout(() => {
        if (window.matchMedia("(max-width: 767px)").matches) {
          inputRef.current?.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
    resetState();
    abortRef.current?.abort();
    abortRef.current = null;
  }, [isOpen, resetState]);

  // Close on outside click. The trigger button lives outside this panel, so
  // it's marked with data-search-trigger and excluded — otherwise clicking it
  // to close would close and immediately reopen.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      if (event.target.closest?.("[data-search-trigger]")) return;
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen, onClose]);

  const openResult = useCallback(
    (result) => {
      const build = ROUTE_BUILDERS[result?.type];
      if (!build) return;
      navigate(build(result));
      onClose();
    },
    [navigate, onClose],
  );

  // All keyboard handling is document-level rather than bound to the panel:
  // from md up the focused element is the header input, which lives outside
  // this component entirely, so a panel-scoped handler would never fire.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (flatResults.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % flatResults.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex(
          (prev) => (prev - 1 + flatResults.length) % flatResults.length,
        );
      } else if (event.key === "Enter") {
        event.preventDefault();
        openResult(flatResults[activeIndex]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, flatResults, activeIndex, openResult]);

  // Debounced, cancellable search.
  useEffect(() => {
    if (!isOpen) return undefined;

    const trimmed = query.trim();

    // Cancel whatever is in flight — this runs on every keystroke, so a
    // superseded request never lands after a newer one and overwrites it.
    abortRef.current?.abort();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      abortRef.current = null;
      setGroups([]);
      setHasSearched(false);
      setIsLoading(false);
      setError("");
      return undefined;
    }

    // Set loading immediately rather than inside the timer, so the panel
    // shows a spinner during the debounce window instead of sitting blank.
    setIsLoading(true);
    setError("");

    const timer = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await searchAPI.global(trimmed, {
          signal: controller.signal,
        });
        const payload = response?.data?.data ?? response?.data;
        setGroups(payload?.groups || []);
        setActiveIndex(0);
        setHasSearched(true);
      } catch (err) {
        // An aborted request isn't a failure — a newer keystroke owns the UI
        // now, so leave loading alone for that request to clear.
        if (isAbort(err)) return;
        setGroups([]);
        setHasSearched(true);
        setError(err?.response?.data?.message || "Search failed");
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
          abortRef.current = null;
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Keep the keyboard-focused row visible when it moves past the fold.
  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!isOpen) return null;

  const trimmed = query.trim();
  const showPrompt = trimmed.length < MIN_QUERY_LENGTH;
  const showNoResults =
    !showPrompt && !isLoading && !error && hasSearched && flatResults.length === 0;

  // Running index across groups so arrow-key position maps onto the rendered
  // rows without flattening the display.
  let renderIndex = -1;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Global search"
      // Below md the trigger is a small icon mid-header, so anchoring the
      // panel to it would push most of the panel off the left edge — it goes
      // viewport-fixed under the header instead. From md up it anchors to the
      // search bar itself. Still inside the header's stacking context either
      // way, so it paints above the page content.
      className="fixed left-3 right-3 top-16 z-50 flex origin-top flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-[popIn_120ms_ease-out] md:absolute md:left-0 md:right-auto md:top-full md:mt-2 md:w-xl lg:w-2xl">
      <style>{`@keyframes popIn{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>

      {/* Mobile-only search input. From md up the header's own input is the
          single source of the query — rendering this one there too would put
          two search boxes on screen at once. */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-3 py-2.5 md:hidden">
        <Search size={16} className="shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search entries, students, employees…"
          aria-label="Search query"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        {isLoading && (
          <Loader2 size={15} className="shrink-0 animate-spin text-blue-500" />
        )}
      </div>

      {/* Results */}
      <div
        ref={listRef}
        className="max-h-[60vh] min-h-24 flex-1 overflow-y-auto p-2 sm:max-h-112">
        {showPrompt && (
          <p className="px-3 py-8 text-center text-xs text-slate-400">
            Type at least {MIN_QUERY_LENGTH} characters to search.
          </p>
        )}

        {!showPrompt && isLoading && flatResults.length === 0 && (
          <div className="space-y-1.5 p-1.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-11 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        )}

        {error && (
          <p className="px-3 py-8 text-center text-xs text-red-600">{error}</p>
        )}

        {showNoResults && (
          <p className="px-3 py-8 text-center text-xs text-slate-400">
            No results for “{trimmed}”.
          </p>
        )}

        {groups.map((group) => {
          const Icon = TYPE_ICONS[group.type] || Search;

          return (
            <section key={group.type} className="mb-1">
              <div className="flex items-center gap-2 px-2.5 pb-1 pt-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {group.label}
                </h3>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                  {group.count}
                </span>
              </div>

              <ul>
                {group.results.map((result) => {
                  renderIndex += 1;
                  const isActive = renderIndex === activeIndex;
                  const index = renderIndex;

                  return (
                    <li key={`${group.type}-${result.id}`}>
                      <button
                        type="button"
                        data-active={isActive}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => openResult(result)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                          isActive ? "bg-blue-50" : "hover:bg-slate-50"
                        }`}>
                        <Icon
                          size={16}
                          className={`shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`}
                        />

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800">
                            {result.title}
                          </span>
                          {result.subtitle && (
                            <span className="block truncate text-xs text-slate-500">
                              {result.subtitle}
                            </span>
                          )}
                        </span>

                        <span className="shrink-0 text-right">
                          {result.amount != null && (
                            <span className="block font-mono text-xs font-bold text-slate-700">
                              {formatCurrency(result.amount)}
                            </span>
                          )}
                          {result.date && (
                            <span className="block text-[10px] text-slate-400">
                              {formatDisplayDate(result.date)}
                            </span>
                          )}
                          {!result.date && result.meta && (
                            <span className="block text-[10px] capitalize text-slate-400">
                              {result.meta}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Keyboard hints */}
      <div className="hidden items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-3 py-1.5 text-[10px] text-slate-400 sm:flex">
        <span>
          <kbd className="rounded border border-slate-200 bg-white px-1">↑</kbd>
          <kbd className="ml-0.5 rounded border border-slate-200 bg-white px-1">↓</kbd>{" "}
          navigate
        </span>
        <span>
          <kbd className="rounded border border-slate-200 bg-white px-1">Enter</kbd>{" "}
          open
        </span>
        <span>
          <kbd className="rounded border border-slate-200 bg-white px-1">Esc</kbd>{" "}
          close
        </span>
      </div>
    </div>
  );
}
