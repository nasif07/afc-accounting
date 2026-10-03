import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../utils/cn";

// How long a revealed amount stays visible before hiding itself again.
const AUTO_HIDE_MS = 10_000;

// Fixed-width stand-in for the hidden figure. Deliberately not derived from
// the real value's length — a mask that got wider for bigger numbers would
// leak the magnitude it is meant to hide.
const MASK = "••••••";

/**
 * A money figure that starts hidden and reveals on click, then re-hides
 * itself after 10 seconds.
 *
 * Used by KPICard (every currency stat card across the app) and by the Bank &
 * Cash account cards, which render their balance outside KPICard.
 *
 * The timer is restarted on each reveal and cleared on unmount, so a card
 * unmounted mid-countdown (navigating away, a list re-render) can't fire a
 * state update after it's gone.
 */
export default function MaskedAmount({
  children,
  className = "",
  buttonClassName = "",
  label = "amount",
  iconSize = 14,
  autoHideMs = AUTO_HIDE_MS,
}) {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // Scheduling deliberately sits outside the state updater: React invokes
  // updaters twice under StrictMode, which would start two timers and leak
  // the first one.
  const toggle = useCallback(() => {
    clearTimer();

    if (revealed) {
      setRevealed(false);
      return;
    }

    setRevealed(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setRevealed(false);
    }, autoHideMs);
  }, [revealed, autoHideMs, clearTimer]);

  return (
    <div className="flex items-center gap-2">
      <p
        className={cn(className, !revealed && "select-none tracking-widest")}
        // The masked text is meaningless to a screen reader, and the real
        // figure must not be announced while hidden either.
        aria-hidden={!revealed}>
        {revealed ? children : MASK}
      </p>

      <button
        type="button"
        onClick={toggle}
        aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
        aria-pressed={revealed}
        title={revealed ? `Hide ${label}` : `Show ${label} for 10 seconds`}
        className={cn(
          "shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600",
          "focus:outline-none focus:ring-2 focus:ring-slate-200",
          buttonClassName,
        )}>
        {revealed ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
      </button>
    </div>
  );
}
