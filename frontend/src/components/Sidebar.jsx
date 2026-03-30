import { NavLink } from "react-router-dom";
import { menuSections } from "../constants/menuSection";

export default function Sidebar({ user, isOpen = true }) {
  const role = user?.role || "sub-accountant";

  return (
    <aside
      className={`bg-white border-r border-gray-200 min-h-screen transition-all duration-300 ${
        isOpen ? "w-72" : "w-20"
      }`}
    >
      <div className="px-4 py-6 border-b border-gray-200">
        <h1
          className={`text-xl font-bold text-gray-900 transition-all ${
            isOpen ? "block" : "hidden"
          }`}
        >
          Accounting ERP
        </h1>
        {!isOpen && (
          <div className="text-center text-lg font-bold text-blue-600">A</div>
        )}
        {isOpen && (
          <p className="text-sm text-gray-500 mt-1">Financial management system</p>
        )}
      </div>

      <nav className="p-4 space-y-6">
        {menuSections.map((section) => {
          const filteredItems = section.items.filter((item) =>
            item.roles.includes(role)
          );

          if (filteredItems.length === 0) return null;

          return (
            <div key={section.title}>
              {isOpen && (
                <h2 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {section.title}
                </h2>
              )}

              <div className="space-y-1">
                {filteredItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                          isActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        } ${!isOpen ? "justify-center" : ""}`
                      }
                      title={!isOpen ? item.title : ""}
                    >
                      <Icon size={18} />
                      {isOpen && <span>{item.title}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}