import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import Sidebar from "../components/Sidebar";
import { logoutAsync } from "../store/slices/authSlice";
import { selectOrgInfo } from "../store/slices/settingsSlice";
import { menuSections } from "../constants/menuSection";
import Button from "./common/Button";
import { Separator } from "./ui/separator";

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

          {/* Search — UI placeholder only; not wired to a search backend yet */}
          <div className="relative hidden max-w-xs flex-1 md:block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              placeholder="Search…"
              aria-label="Search"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy-light"
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
