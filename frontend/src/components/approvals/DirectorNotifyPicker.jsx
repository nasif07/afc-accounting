import { useEffect, useRef } from "react";
import { Mail, MailWarning, Users } from "lucide-react";
import { cn } from "../../utils/cn";
import { useDirectors } from "../../hooks/useApprovals";

/**
 * Pick which directors get emailed about a request.
 *
 * Used in two places with the same contract: inside the New Request form
 * (where notification is opt-in and off by default) and inside the standalone
 * Notify modal (where it is the entire point, so `alwaysOn`).
 *
 * Notification is off by default deliberately. Submitting a request already
 * puts it in the director's queue — email is an escalation, and a form that
 * mails three people because the accountant did not notice a pre-ticked box is
 * how people learn to ignore the mail.
 *
 * Laid out as the conventional parent checkbox with a conditionally revealed
 * group of child checkboxes indented beneath it. The recipients used to be
 * full-width selection cards carrying their own borders and fills, which gave
 * them the same visual weight as the "Email the director" box directly above,
 * so a director read as a sibling of the master switch rather than something
 * inside it. They also drew their own tick from an sr-only input while the
 * master used a native checkbox, putting two different renderings of one
 * control in adjacent rows. One native checkbox everywhere, plus an indent
 * rule on the revealed region, says "these belong to that" without either.
 */

function DirectorRow({ director, checked, disabled, onToggle, lastNotifiedAt }) {
  return (
    <li>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition hover:bg-slate-50",
          disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
        )}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={() => onToggle(director._id)}
          className="h-4 w-4 shrink-0 rounded border-slate-300 text-brand-navy focus:ring-brand-navy-light"
        />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-800">
            {director.name}
          </span>
          <span className="block truncate text-xs text-slate-500">
            {director.email}
          </span>
        </span>

        {lastNotifiedAt && (
          <span className="shrink-0 text-[10px] font-medium text-slate-400">
            notified {lastNotifiedAt}
          </span>
        )}
      </label>
    </li>
  );
}

export default function DirectorNotifyPicker({
  enabled,
  onEnabledChange,
  selected = [],
  onSelectedChange,
  disabled = false,
  alwaysOn = false,
  notifiedAtByDirector = {},
}) {
  const active = alwaysOn || enabled;
  // Only fetched once the section is actually in use — an accountant who never
  // notifies anyone should not be issuing this request on every form open.
  const { data: directors = [], isLoading, isError } = useDirectors(active);

  // Ticking the box reveals the list at the very bottom of a form that is
  // already taller than the modal, so without this the user sees nothing
  // happen and reasonably concludes the control is broken. Runs when the rows
  // actually exist, not when `active` flips — the list is fetched, so at flip
  // time there is still only a "Loading…" line to scroll to.
  const listRef = useRef(null);
  useEffect(() => {
    if (alwaysOn || !active || directors.length === 0) return;
    // "nearest" scrolls the modal's own scroll box by the minimum needed and
    // leaves the page behind the backdrop alone; "smooth" would fight a user
    // who is already scrolling.
    listRef.current?.scrollIntoView({ block: "nearest" });
  }, [alwaysOn, active, directors.length]);

  const toggle = (id) =>
    onSelectedChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );

  return (
    <div className="space-y-3">
      {!alwaysOn && (
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={enabled}
            disabled={disabled}
            onChange={(event) => {
              onEnabledChange(event.target.checked);
              // Clearing on un-tick keeps the payload honest: a hidden section
              // must not still be carrying recipients when the form submits.
              if (!event.target.checked) onSelectedChange([]);
            }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-navy focus:ring-brand-navy-light"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <Mail size={14} className="text-slate-400" aria-hidden="true" />
              Email the director
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Sends a notification with a link straight to this request. The
              request reaches the director&rsquo;s queue either way.
            </span>
          </span>
        </label>
      )}

      {active && (
        <div
          ref={listRef}
          className={cn(
            "space-y-2",
            // The indent rule is what marks this region as revealed BY the
            // checkbox above it. In `alwaysOn` the picker is the whole modal
            // and has no parent to hang off, so it stays flush.
            !alwaysOn && "ml-2 border-l-2 border-slate-200 pl-4",
          )}>
          {isLoading ? (
            <p className="px-2 text-xs text-slate-400">Loading directors…</p>
          ) : isError ? (
            <p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <MailWarning size={13} aria-hidden="true" />
              Could not load the director list. The request can still be
              submitted without notifying anyone.
            </p>
          ) : directors.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Users size={13} aria-hidden="true" />
              No active directors to notify.
            </p>
          ) : (
            <fieldset>
              {/* The rows are one multi-select group and have to announce as
                  one. The parent checkbox already names it on screen, so the
                  legend carries that name for a screen reader without
                  repeating it visually. */}
              <legend className="sr-only">Directors to email about this request</legend>

              {/*
                Deliberately NOT its own scroll container. An organisation has
                a handful of directors, and a nested scrollable box inside an
                already-scrollable modal means the wheel does different things
                depending on which pixel the pointer is over — the list eats
                the gesture, then stops, and the modal appears frozen. Letting
                the list flow keeps the modal the single scroll region.
              */}
              <ul className="space-y-0.5">
                {directors.map((director) => (
                  <DirectorRow
                    key={director._id}
                    director={director}
                    checked={selected.includes(director._id)}
                    disabled={disabled}
                    onToggle={toggle}
                    lastNotifiedAt={notifiedAtByDirector[director._id]}
                  />
                ))}
              </ul>

              {selected.length === 0 && (
                <p className="mt-2 px-2 text-xs text-amber-700">
                  Select at least one director to email.
                </p>
              )}
            </fieldset>
          )}
        </div>
      )}
    </div>
  );
}
