import { useEffect, useRef } from "react";

// One keyboard-shortcut primitive for the whole app, so every binding agrees
// on the same two rules: `mod` is Ctrl on Windows/Linux and Cmd on macOS, and
// a bare key never fires while the user is typing.
//
// Usage:
//   useHotkeys([
//     { combo: "mod+k", allowInInput: true, handler: focusSearch },
//     { combo: "alt+n", handler: openCreateModal },
//   ]);

const isMac =
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad/i.test(navigator.userAgent || "");

export const MOD_LABEL = isMac ? "⌘" : "Ctrl";

const isTypingTarget = (target) => {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

const parseCombo = (combo) => {
  const parts = String(combo)
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    key: parts[parts.length - 1],
    mod: parts.includes("mod"),
    alt: parts.includes("alt"),
    shift: parts.includes("shift"),
  };
};

const matchesCombo = (event, spec) => {
  const mod = event.ctrlKey || event.metaKey;
  if (spec.mod !== mod) return false;
  if (spec.alt !== event.altKey) return false;
  // Shift is only compared when the binding asks for it — on many layouts a
  // punctuation key such as "/" or "?" is itself produced with Shift.
  if (spec.shift && !event.shiftKey) return false;

  if (String(event.key).toLowerCase() === spec.key) return true;

  // Alt+letter emits an accented character on several keyboard layouts
  // (Alt+n → "˜" on a US-Mac layout, for instance), so fall back to the
  // physical key for single-letter bindings.
  if (spec.key.length === 1 && /[a-z]/.test(spec.key)) {
    return event.code === `Key${spec.key.toUpperCase()}`;
  }

  return false;
};

/**
 * @param {Array<{combo: string, handler: (event: KeyboardEvent) => void,
 *   allowInInput?: boolean, enabled?: boolean}>} bindings
 * @param {{enabled?: boolean}} options
 */
export function useHotkeys(bindings, { enabled = true } = {}) {
  // Held in a ref so a handler that closes over fresh state doesn't force the
  // listener to be torn down and re-added on every render.
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event) => {
      const typing = isTypingTarget(event.target);

      for (const binding of bindingsRef.current) {
        if (!binding || binding.enabled === false) continue;

        const spec = parseCombo(binding.combo);
        if (!matchesCombo(event, spec)) continue;

        // A bare key (no modifier) would otherwise swallow the character the
        // user is typing into a field.
        const bare = !spec.mod && !spec.alt;
        if (typing && bare && !binding.allowInInput) continue;

        event.preventDefault();
        binding.handler(event);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

export default useHotkeys;
