import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

// Slim indeterminate progress bar shown at the top of the viewport during
// page navigation.
//
// Why this isn't a <Suspense> fallback (the obvious approach, which does NOT
// work here): react-router v7 wraps navigations in React's startTransition.
// During a transition React renders the incoming tree but deliberately does
// not commit a Suspense fallback — it keeps the current page on screen to
// avoid a jarring flash. Measured directly: with an artificial 2.5s delay on
// a route's lazy chunk, the fallback never rendered once.
//
// useNavigation() doesn't work either: it reports the *data router's* state,
// and these routes carry no `loader`, nor do they use react-router's own
// `lazy:` route property (pages are React.lazy components in `element:`), so
// the router considers every navigation instantaneous and stays "idle".
//
// So the pending state has to come from outside the transition. A click is a
// discrete event, so setState from it is urgent and commits immediately —
// that's what puts the bar on screen. It comes back off in an effect keyed to
// the pathname, and effects only run after a commit, which is exactly the
// moment the new page has actually rendered. Together those two bracket the
// real navigation window.
//
// Clicks are picked up by delegation from the app shell rather than by
// wiring a callback into every link, so in-page links (dashboard cards,
// "View Details", etc.) get the same treatment as the sidebar for free.

const MAX_VISIBLE_MS = 15000; // failsafe: never leave the bar stuck on screen

export default function TopBarLoader() {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const timeoutRef = useRef(null);

  // The new page has committed — stop.
  useEffect(() => {
    setIsNavigating(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isNavigating) {
      clearTimeout(timeoutRef.current);
      return undefined;
    }

    timeoutRef.current = setTimeout(() => setIsNavigating(false), MAX_VISIBLE_MS);
    return () => clearTimeout(timeoutRef.current);
  }, [isNavigating]);

  useEffect(() => {
    const onClick = (event) => {
      // Let the browser handle new-tab/modified clicks normally.
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      // Internal route links only — not "#", "mailto:", or absolute URLs.
      if (!href || !href.startsWith("/")) return;

      // Navigating to where we already are commits nothing, so the effect
      // above would never fire to switch this back off.
      if (href === location.pathname) return;

      setIsNavigating(true);
    };

    // Capture phase, deliberately. React attaches its synthetic handlers at
    // the root container, so react-router's <Link>/<NavLink> has already
    // called preventDefault() by the time a bubble-phase listener on document
    // would run — which made an earlier version of this discard every single
    // router link click. Capture runs document -> target, so this sees the
    // click first, while it's still pristine.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [location.pathname]);

  if (!isNavigating) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-100 h-1 overflow-hidden bg-transparent"
      role="progressbar"
      aria-label="Loading page"
      aria-busy="true">
      <div className="animate-topbar-loader h-full rounded-r-full bg-linear-to-r from-brand-navy-light via-brand-navy to-brand-navy-dark shadow-[0_0_8px_rgba(32,60,143,0.6)]" />
    </div>
  );
}
