import { useRef } from "react";
import { cn } from "../../utils/cn";

/**
 * The All / Pending / Approved / Rejected filter row.
 *
 * A pill group rather than the <Select> the page used before: there are four
 * mutually exclusive options that fit on one line, and the current filter is
 * something you want visible at a glance while scanning a queue rather than
 * collapsed behind a closed dropdown.
 *
 * Each pill wears its status colour when active, matching the badge on the
 * cards below, so the filter and the rows it produces read as the same system.
 * The label is always present — the colour is reinforcement, never the only
 * signal.
 *
 * Keyboard behaviour is implemented, not inherited. `role="radiogroup"` plus
 * `role="radio"` tells a screen reader these are one exclusive choice, but the
 * browser supplies none of the behaviour that claim implies for non-input
 * elements: arrow-key movement and a single tab stop are ours to build. Doing
 * only the roles is worse than using plain buttons — it announces a contract
 * the component then fails to honour.
 */

const OPTIONS = [
  { value: "", label: "All", active: "bg-brand-navy-dark text-white" },
  { value: "pending", label: "Pending", active: "bg-amber-100 text-amber-800 ring-1 ring-amber-300" },
  { value: "approved", label: "Approved", active: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300" },
  { value: "rejected", label: "Rejected", active: "bg-red-100 text-red-800 ring-1 ring-red-300" },
];

const MOVE_KEYS = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

export default function StatusFilterPills({ value = "", onChange, disabled = false, children }) {
  const groupRef = useRef(null);

  const selectedIndex = OPTIONS.findIndex((option) => option.value === value);
  // A value outside the list (a hand-edited URL) must still leave one tab
  // stop, or the group becomes unreachable by keyboard.
  const focusIndex = selectedIndex === -1 ? 0 : selectedIndex;

  const handleKeyDown = (event) => {
    if (disabled) return;

    let next;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = OPTIONS.length - 1;
    else if (MOVE_KEYS[event.key] !== undefined) {
      // Wraps, as the radiogroup pattern specifies.
      next = (focusIndex + MOVE_KEYS[event.key] + OPTIONS.length) % OPTIONS.length;
    } else return;

    // Only now — an unhandled key (Tab, and every shortcut) must keep its
    // default behaviour.
    event.preventDefault();

    onChange(OPTIONS[next].value);
    // Selection follows focus in this pattern, so focus has to move with it or
    // the next arrow press starts from the wrong place.
    groupRef.current?.querySelectorAll('[role="radio"]')[next]?.focus();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label="Filter by status"
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-2">
        {OPTIONS.map((option, index) => {
          const isActive = index === selectedIndex;

          return (
            <button
              key={option.value || "all"}
              type="button"
              role="radio"
              aria-checked={isActive}
              // Roving tabindex: the group is one tab stop, and arrows move
              // within it. Without this all four sit in the tab order and the
              // radiogroup role is a lie.
              tabIndex={index === focusIndex ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-light",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isActive
                  ? option.active
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
              )}>
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Page-specific actions (Refresh, Approve All) sit on the same bar. */}
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
