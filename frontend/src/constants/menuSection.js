import {
  LayoutDashboard,
  GraduationCap,
  Wallet,
  Briefcase,
  Users,
  FolderTree,
  NotebookText,
  BookOpen,
  Landmark,
  CheckCircle2,
  BarChart3,
  ClipboardList,
  ClipboardCheck,
  FileCheck2,
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
      // A director's two approval queues sit here, immediately under the
      // Dashboard link, rather than being scattered across Accounting and
      // Control. They are the work a director opens the app to do, so they
      // belong at the top with it — and grouping them means the role's daily
      // queue is one glance rather than two hunts down the sidebar.
      //
      // The routes stay on /director/* deliberately: that path is what
      // enforces the role (DirectorLayoutWrapper in Routes.jsx), and it is the
      // target of the deep link in approval notification emails.
      {
        title: "Request Approvals",
        path: "/director/approval-requests",
        icon: FileCheck2,
        roles: ["director"],
      },
      {
        title: "Journal Approvals",
        path: "/director/journal-approvals",
        icon: ClipboardList,
        roles: ["director"],
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
        title: "Employees",
        path: "/dashboard/employees",
        icon: Users,
        roles: ["director", "accountant"],
      },
      {
        title: "Payroll",
        path: "/dashboard/payroll",
        icon: Briefcase,
        roles: ["director", "accountant"],
      },
      {
        title: "Student Collection",
        path: "/dashboard/bank-book",
        icon: NotebookText,
        roles: ["director", "accountant"],
      },
      {
        title: "Petty Cash",
        path: "/dashboard/petty-cash",
        icon: Wallet,
        roles: ["director", "accountant", "sub-accountant"],
      },
      {
        title: "Approval Requests",
        path: "/dashboard/approval-requests",
        icon: ClipboardCheck,
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
        title: "Ledger",
        path: "/dashboard/ledger",
        icon: BookOpen,
        roles: ["director", "accountant"],
      },
      {
        title: "Bank Reconciliation",
        path: "/dashboard/bank-book/reconciliation",
        icon: NotebookText,
        roles: ["director", "accountant"],
      },
      {
        title: "Bank / Cash",
        path: "/dashboard/bank-cash",
        icon: Landmark,
        roles: ["director", "accountant"],
      },

      {
        title: "Reports",
        path: "/dashboard/reports",
        icon: BarChart3,
        roles: ["director", "accountant"],
      },
    ],
  },
  {
    title: "Control",
    items: [
      {
        title: "User Approvals",
        path: "/director/approvals",
        icon: CheckCircle2,
        roles: ["director"],
      },
      {
        title: "Settings",
        path: "/dashboard/settings",
        icon: Settings,
        roles: ["director", "accountant"],
      },
    ],
  },
];
