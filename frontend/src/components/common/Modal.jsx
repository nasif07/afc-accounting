import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// Every currently-open dialog, innermost last.
//
// Modals nest for real here — the attachment lightbox opens inside the
// approval detail modal — and both used to listen for Escape on window, so one
// press closed the pair. Nothing in the DOM tells a listener whether it is on
// top (the inner dialog is a descendant of the outer one, so z-index and
// event order do not help), hence an explicit stack.
const openDialogs = [];

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const sizes = {
  sm:   "sm:max-w-sm",
  md:   "sm:max-w-md",
  lg:   "sm:max-w-lg",
  xl:   "sm:max-w-xl",
  "2xl":"sm:max-w-2xl",
  "3xl":"sm:max-w-3xl",
  "4xl":"sm:max-w-4xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  // Rendered as a fixed row below the scrolling body. A form whose actions
  // must always be reachable should use this rather than putting a
  // `sticky bottom-0` bar inside `children`: sticky positions against the
  // scrollport, which leaves it floating over the content it is supposed to
  // sit beneath, and any negative margin used to bleed it to the edges also
  // shortens the scroll height so the last of the content cannot be reached.
  footer,
  size = "3xl",
  closeOnBackdrop = true,
  className = "",
}) {
  const dialogRef = useRef(null);
  // Identity for the stack above. An object literal, because two modals opened
  // in the same tick must never compare equal.
  const dialogId = useRef({});

  // Registered before the Escape listener below so the stack is always
  // accurate by the time a key can be pressed.
  useEffect(() => {
    if (!isOpen) return;

    const id = dialogId.current;
    openDialogs.push(id);

    return () => {
      const index = openDialogs.lastIndexOf(id);
      if (index !== -1) openDialogs.splice(index, 1);
    };
  }, [isOpen]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Close on Escape — topmost dialog only.
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e) => {
      if (e.key !== "Escape") return;
      // A nested dialog is open above this one; it owns the key press.
      if (openDialogs[openDialogs.length - 1] !== dialogId.current) return;
      onClose();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Ctrl/Cmd+Enter submits the dialog's form from any field inside it, so a
  // long data-entry form doesn't need a trip to the mouse. Implemented here
  // rather than per form so every modal in the app gets it: requestSubmit()
  // (not submit()) is used deliberately — it still runs the form's own submit
  // handler and native validation exactly as clicking the button would.
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handler = (e) => {
      if (e.key !== "Enter" || !(e.ctrlKey || e.metaKey)) return;
      // A nested dialog (the journal form's confirmation step) renders inside
      // this one's DOM, so without this the outer form would be re-submitted
      // from inside the confirmation.
      if (e.target.closest?.('[role="dialog"]') !== dialog) return;
      const form = dialog.querySelector("form");
      if (!form) return;
      e.preventDefault();
      form.requestSubmit();
    };

    dialog.addEventListener("keydown", handler);
    return () => dialog.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Focus trap: keep keyboard focus inside the modal while it is open
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableEls = [...dialog.querySelectorAll(FOCUSABLE)];
    const first = focusableEls[0];
    const last  = focusableEls[focusableEls.length - 1];

    // Move focus into the modal on open
    first?.focus();

    const handleTab = (e) => {
      if (e.key !== "Tab" || focusableEls.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    dialog.addEventListener("keydown", handleTab);
    return () => dialog.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
        onClick={(e) => e.stopPropagation()}
        className={`relative flex flex-col bg-white shadow-2xl w-full max-h-[92dvh] sm:max-h-[90vh] rounded-2xl ${sizes[size] ?? sizes["3xl"]} overflow-hidden ${className}`}>

        {/* Header */}
        <div className="shrink-0 border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-start justify-between">
          <div>
            <h2 id="modal-title" className="text-xl font-bold text-slate-900">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="mt-1 text-xs text-slate-500">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 hover:bg-white rounded-full transition text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        {/*
          Scrollable content.

          min-h-0 is load-bearing, not decoration: a flex item's default
          `min-height: auto` refuses to shrink below its content, so without it
          this div pushes the dialog past its own max-height instead of
          scrolling inside it — the header scrolls away with the page and the
          footer becomes unreachable.

          flex-auto, NOT flex-1. flex-1 is `flex: 1 1 0%`, and a basis of zero
          means this item contributes nothing to the dialog's auto height —
          the box then sizes itself from the header and footer alone and the
          body is left as dead space. flex-auto keeps the content-derived
          basis, so a short form makes a short dialog and a long one is capped
          and scrolls.

          overscroll-contain stops a scroll that reaches the end of this box
          from chaining out to the page behind the backdrop.
        */}
        <div className="min-h-0 flex-auto overflow-y-auto overscroll-contain p-6">
          {children}
        </div>

        {/* shrink-0 so it keeps its height while the body above absorbs the
            slack — the body is the only part that ever scrolls. */}
        {footer && (
          <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
