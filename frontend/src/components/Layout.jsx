import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import Sidebar from "../components/Sidebar";
import { logoutAsync } from "../store/slices/authSlice";
import { selectOrgInfo } from "../store/slices/settingsSlice";
import { menuSections } from "../constants/menuSection";
import Button from "./common/Button";
import TopBarLoader from "./common/TopBarLoader";
import { ContentLoader } from "./common/Loaders";
import { Separator } from "./ui/separator";
import SearchPopover from "./search/SearchPopover";
import { useHotkeys, MOD_LABEL } from "../hooks/useHotkeys";

function usePageTitle() {
  const { pathname } = useLocation();
  for (const section of menuSections) {
    for (const item of section.items) {
      if (item.path === pathname) return item.title;
    }
  }
  return "Dashboard";
}

export default function DashboardLayout() {
  const { user } = useSelector((state) => state.auth);
  const { orgName } = useSelector(selectOrgInfo);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const pageTitle = usePageTitle();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  // Query lives here, not in the popover: from md up the visible input is the
  // header's, so the header has to own the value.
  const [searchQuery, setSearchQuery] = useState("");

  const searchInputRef = useRef(null);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  // Ctrl/Cmd+K works even while a field has focus (that's the point of it —
  // jumping to search from anywhere); bare "/" is suppressed inside inputs by
  // useHotkeys so it can still be typed. Below md the header input is hidden,
  // so the shortcut opens the popover, which carries its own input.
  const focusSearch = useCallback(() => {
    setSearchOpen(true);
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  useHotkeys([
    { combo: "mod+k", allowInInput: true, handler: focusSearch },
    { combo: "/", handler: focusSearch },
  ]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { pathname } = useLocation();
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await dispatch(logoutAsync());
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Self-managing: watches for internal link clicks and clears itself
          once the destination page commits. See TopBarLoader for why this
          can't simply be a Suspense fallback. */}
      <TopBarLoader />

      <Sidebar
        user={user}
        mobileOpen={mobileOpen}
        desktopOpen={desktopOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ${
          desktopOpen ? "lg:ml-64" : "lg:ml-20"
        }`}>

        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 sm:h-16 sm:px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {/* Mobile menu toggle */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar"
              className="lg:hidden">
              <Menu size={20} />
            </Button>

            {/* Desktop sidebar collapse */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDesktopOpen((p) => !p)}
              aria-label={desktopOpen ? "Collapse sidebar" : "Expand sidebar"}
              className="hidden lg:flex">
              {desktopOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </Button>

            <span className="truncate text-sm font-semibold text-slate-800 sm:text-base">
              {pageTitle}
            </span>
          </div>

          {/* Anchor for the search popover — it renders `absolute` from md up,
              so this wrapper must stay `relative`. */}
          <div className="relative md:max-w-md md:flex-1">
            {/* The one and only search input from md up: a real controlled
                field, not a button that opens another one. The popover below
                renders results only (it carries its own input solely for
                mobile, where this field is hidden). */}
            <div className="relative hidden md:block">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchInputRef}
                type="text"
                data-search-trigger
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search entries, students, employees…"
                aria-label="Search"
                aria-expanded={searchOpen}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-16 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy-light"
              />

              {/* Hidden once the field is in use — the hint has done its job
                  by then and would otherwise sit on top of the text. */}
              {!searchOpen && (
                <kbd
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-400 lg:block">
                  {MOD_LABEL} K
                </kbd>
              )}
            </div>

            {/* Below md the input above is hidden — this icon opens the
                popover, which supplies its own input at that breakpoint. */}
            <Button
              size="icon"
              variant="ghost"
              data-search-trigger
              onClick={() => setSearchOpen((open) => !open)}
              aria-label="Open search"
              aria-expanded={searchOpen}
              className="md:hidden">
              <Search size={20} />
            </Button>

            <SearchPopover
              isOpen={searchOpen}
              onClose={closeSearch}
              query={searchQuery}
              onQueryChange={setSearchQuery}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm text-slate-600">
                Welcome, <span className="font-semibold">{user?.name || "User"}</span>
              </p>
              <p className="truncate text-xs text-slate-400">{orgName}</p>
            </div>

            <Separator orientation="vertical" className="hidden h-8 sm:block" />

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              aria-label="Logout"
              icon={LogOut}>
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-6">
          {/* Still needed for a cold load of a deep-linked page (hard refresh
              / first paint), where there is no previous UI for React to hold
              on to and it must show a fallback. On in-app navigation React
              suppresses this in favour of keeping the current page visible —
              TopBarLoader above is what covers that case. */}
          <Suspense fallback={<ContentLoader message="Loading page..." />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
