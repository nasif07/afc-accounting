import { NavLink, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { X } from "lucide-react";
import { menuSections } from "../constants/menuSection";
import logo from "/afc-logo.jpg";

export default function Sidebar({
  user,
  mobileOpen = false,
  desktopOpen = true,
  onClose = () => {},
}) {
  const location = useLocation();
  const role = user?.role || "sub-accountant";

  const authorizedSections = useMemo(() => {
    return menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.roles.includes(role)),
      }))
      .filter((section) => section.items.length > 0);
  }, [role]);

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden ${
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-200 bg-white shadow-xl transition-all duration-300 ease-in-out lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${desktopOpen ? "lg:w-64" : "lg:w-20"} w-[280px]`}
      >
        {/* Logo/Header */}
        <div className="relative flex min-h-[72px] items-center justify-center border-b border-slate-200 px-4 py-4">
          {/* Mobile close */}
          <button
            onClick={onClose}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close sidebar"
            type="button"
          >
            <X size={18} />
          </button>

          {desktopOpen ? (
            <img
              className="h-auto w-28 object-contain"
              src={logo}
              alt="AFC Logo"
            />
          ) : (
            <img
              className="hidden h-10 w-10 rounded-md object-cover lg:block"
              src={logo}
              alt="AFC Logo"
            />
          )}
        </div>

        {/* Navigation */}
        <nav className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {authorizedSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {desktopOpen && (
                <h3 className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {section.title}
                </h3>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        if (window.innerWidth < 1024) {
                          onClose();
                        }
                      }}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                        isActive
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      } ${!desktopOpen ? "lg:justify-center" : ""}`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#DA002E]" />
                      )}

                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2.4 : 2}
                        className={`shrink-0 ${
                          isActive
                            ? "text-slate-900"
                            : "text-slate-400 group-hover:text-slate-700"
                        }`}
                      />

                      {desktopOpen && (
                        <span
                          className={`truncate ${
                            isActive ? "font-semibold" : "font-medium"
                          }`}
                        >
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="border-t border-slate-200 bg-white p-4">
          <div
            className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 ${
              !desktopOpen ? "lg:justify-center" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold uppercase text-slate-700">
              {user?.name?.[0] || "U"}
            </div>

            {desktopOpen && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {user?.name || "System User"}
                </p>
                <p className="truncate text-xs font-medium capitalize text-slate-500">
                  {role.replace("-", " ")}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}