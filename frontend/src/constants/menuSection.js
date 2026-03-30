import {
  LayoutDashboard,
  GraduationCap,
  Receipt,
  Wallet,
  Briefcase,
  Users,
  FolderTree,
  NotebookText,
  BookOpen,
  Landmark,
  CheckCircle2,
  BarChart3,
  ShieldCheck,
  ClipboardList,
  Settings,
} from "lucide-react";

/**
 * Menu sections configuration
 * Paths must match the routes defined in Routes.jsx
 * Roles determine which users can see each menu item
 */
export const menuSections = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
        roles: ["director", "accountant", "sub-accountant"],
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Students",
        path: "/dashboard/students",
        icon: GraduationCap,
        roles: ["director", "accountant", "sub-accountant"],
      },
      {
        title: "Receipts",
        path: "/dashboard/receipts",
        icon: Receipt,
        roles: ["director", "accountant", "sub-accountant"],
      },
      {
        title: "Expenses",
        path: "/dashboard/expenses",
        icon: Wallet,
        roles: ["director", "accountant"],
      },
      {
        title: "Payroll",
        path: "/dashboard/payroll",
        icon: Briefcase,
        roles: ["director", "accountant"],
      },
    ],
  },
  {
    title: "Accounting",
    items: [
      {
        title: "Chart of Accounts",
        path: "/dashboard/accounts",
        icon: FolderTree,
        roles: ["director", "accountant"],
      },
      {
        title: "Journal Entries",
        path: "/dashboard/journal-entries",
        icon: NotebookText,
        roles: ["director", "accountant", "sub-accountant"],
      },
      {
        title: "Reports",
        path: "/dashboard/reports",
        icon: BarChart3,
        roles: ["director", "accountant"],
      },
      {
        title: "Approvals",
        path: "/director/approvals",
        icon: CheckCircle2,
        roles: ["director"],
      },
    ],
  },
  {
    title: "Control",
    items: [
      {
        title: "Settings",
        path: "/dashboard/settings",
        icon: Settings,
        roles: ["director", "accountant"],
      },
    ],
  },
];
