import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Landmark, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../utils/cn";

// Searchable account picker, replacing the native <select> on account fields
// only (status/type/category selects stay native). Built on the same
// ui/popover primitive DatePicker already uses, and mirrors DatePicker's prop
// surface — label, name, value, onChange, required, disabled, error,
// helperText, className — so it drops into both a plain controlled call site
// (BankCash's useState formData) and an RHF <Controller> without either
// needing a different shape.
//
// It deliberately knows NOTHING about which accounts are eligible: every call
// site has its own rule (leaf-only, expense-only, children-of-1002-only,
// same-type-active-only) and they contradict each other, so the already
// filtered array is passed in and rendered as-is.

const accountLabel = (account) =>
  account ? `${account.accountCode} - ${account.accountName}` : "";

// Every token must appear somewhere in "code name", so "5101 rent" and
// "rent 5101" both find the same row.
const matchesSearch = (account, tokens) => {
  if (!tokens.length) return true;
  const haystack =
    `${account.accountCode || ""} ${account.accountName || ""}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
};

export default function AccountCombobox({
  label,
  name,
  value = "",
  onChange,
  onBlur,
  accounts = [],
  required = false,
  disabled = false,
  error = "",
  touched,
  // Error styling without an error message, for call sites that already
  // report the message elsewhere (BookEntryRow's per-row summary banner).
  invalid = false,
  helperText = "",
  className = "",
  placeholder = "Select Account",
  panelTitle = "Select Account",
  // Optional fields pass this to get a row that sets the value back to "" —
  // the native <select> this replaces always rendered a value="" placeholder
  // option, so without it an optional parent account could be set but never
  // un-set. Required fields leave it off.
  clearLabel = "",
  searchPlaceholder = "Search by code or name...",
  emptyMessage = "No accounts match your search.",
  icon: Icon = Landmark,
  ...props
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const listboxId = useId();
  const listRef = useRef(null);
  const searchRef = useRef(null);

  // Select.jsx gates on `touched && error` while DatePicker gates on `error`
  // alone; accept both so either call-site convention behaves as its author
  // expects.
  const hasMessage = Boolean(error) && (touched === undefined || touched);
  const hasError = hasMessage || invalid;

  const safeAccounts = useMemo(
    () => (Array.isArray(accounts) ? accounts.filter((a) => a && a._id) : []),
    [accounts],
  );

  // A row is a "group" if something else in this same list points at it. The
  // backend's leaf-node projection carries no hasChildren flag, and the rule
  // only has meaning relative to the list actually being offered. Group rows
  // stay fully selectable — several call sites legitimately post to a parent
  // account today, and this component must not change what is selectable.
  const parentIds = useMemo(() => {
    const ids = new Set();
    safeAccounts.forEach((account) => {
      const parent = account.parentAccount;
      const parentId =
        typeof parent === "object" && parent !== null ? parent._id : parent;
      if (parentId) ids.add(String(parentId));
    });
    return ids;
  }, [safeAccounts]);

  // The clear row is a synthetic option with _id "", so selection, keyboard
  // navigation and aria-activedescendant all treat it as an ordinary row. It
  // is never filtered out by search — it stays reachable at the top.
  const clearOption = useMemo(
    () =>
      clearLabel
        ? { _id: "", accountCode: "", accountName: clearLabel, __clear: true }
        : null,
    [clearLabel],
  );

  const baseOptions = useMemo(
    () => (clearOption ? [clearOption, ...safeAccounts] : safeAccounts),
    [clearOption, safeAccounts],
  );

  const filtered = useMemo(() => {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matches = safeAccounts.filter((account) =>
      matchesSearch(account, tokens),
    );
    return clearOption ? [clearOption, ...matches] : matches;
  }, [safeAccounts, search, clearOption]);

  const selected = useMemo(
    () => safeAccounts.find((account) => String(account._id) === String(value)),
    [safeAccounts, value],
  );

  // Opening lands the highlight on the current selection rather than the top
  // of the list, so Enter straight after opening is a no-op instead of a
  // silent change.
  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) {
      // Indexed against the unfiltered list on purpose: search is being reset
      // to "" in this same batch, so the list this index will address on the
      // next render is safeAccounts, not the stale `filtered` in scope here.
      setSearch("");
      const index = baseOptions.findIndex(
        (account) => String(account._id) === String(value),
      );
      setActiveIndex(index >= 0 ? index : 0);
    } else {
      // Closing without picking leaves `value` untouched by design.
      onBlur?.();
    }
  };

  const commit = (account) => {
    if (!account) return;
    onChange?.(account._id);
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!filtered.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex(
        (prev) => (prev + step + filtered.length) % filtered.length,
      );
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : filtered.length - 1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      commit(filtered[activeIndex]);
    }
  };

  // Typing filters the list, which can strand the highlight past the end.
  useEffect(() => {
    setActiveIndex((prev) =>
      prev > filtered.length - 1 ? Math.max(filtered.length - 1, 0) : prev,
    );
  }, [filtered.length]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={name}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={cn(
              "flex w-full min-h-11 items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-left text-sm transition focus:outline-none focus:ring-4",
              "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
              selected ? "text-slate-900" : "text-slate-400",
              hasError
                ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                : "border-slate-300 focus:border-slate-800 focus:ring-slate-100",
            )}
            {...props}>
            {Icon && (
              <Icon size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
            )}
            <span className="flex-1 truncate">
              {selected ? accountLabel(selected) : placeholder}
            </span>
            <ChevronDown
              size={16}
              className="shrink-0 text-slate-400"
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          // Radix would otherwise focus the panel container; send it to the
          // search box so the user can type immediately on open.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            searchRef.current?.focus();
          }}
          className="w-(--radix-popover-trigger-width) min-w-64 gap-0 p-0">
          <div className="border-b border-slate-200 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {panelTitle}
            </p>
          </div>

          <div className="border-b border-slate-200 p-2">
            <div className="relative group">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900"
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listboxId}
                aria-activedescendant={
                  filtered[activeIndex]
                    ? `${listboxId}-${filtered[activeIndex]._id}`
                    : undefined
                }
                aria-label={searchPlaceholder}
                autoComplete="off"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm transition-all placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-50"
              />
            </div>
          </div>

          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={panelTitle}
            className="max-h-64 overflow-y-auto p-1">
            {!filtered.some((option) => !option.__clear) && (
              <li
                role="presentation"
                className="px-3 py-6 text-center text-sm text-slate-500">
                {emptyMessage}
              </li>
            )}

            {filtered.map((account, index) => {
              const isSelected = String(account._id) === String(value);
              const isActive = index === activeIndex;
              const isGroup = parentIds.has(String(account._id));

              return (
                // role="option" sits directly on the <li> so it stays an
                // immediate child of role="listbox". Options are not tab
                // stops by design — focus stays in the search input and
                // aria-activedescendant points at the highlighted row.
                <li
                  key={account._id}
                  id={`${listboxId}-${account._id}`}
                  role="option"
                  aria-selected={isSelected}
                  data-active={isActive}
                  // Keyboard focus stays in the search input, so the mouse
                  // drives the highlight to keep the two in sync.
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(account)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    isActive ? "bg-slate-100" : "bg-transparent",
                    isSelected ? "text-slate-900" : "text-slate-700",
                  )}>
                  {!account.__clear && (
                    <span className="shrink-0 font-mono text-[11px] text-slate-500">
                      {account.accountCode}
                    </span>
                  )}
                  <span
                    className={cn(
                      "flex-1 truncate",
                      account.__clear
                        ? "font-medium text-slate-500"
                        : isGroup
                          ? "font-bold text-slate-900"
                          : "font-medium",
                    )}>
                    {account.accountName}
                  </span>
                  {isGroup && (
                    <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      Group
                    </span>
                  )}
                  {isSelected && (
                    <Check
                      size={15}
                      className="shrink-0 text-slate-900"
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>

      {hasMessage && (
        <p className="mt-1 text-xs text-red-600 sm:text-sm">{error}</p>
      )}
      {helperText && !hasMessage && (
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{helperText}</p>
      )}
    </div>
  );
}
