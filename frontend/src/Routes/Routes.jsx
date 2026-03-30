import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { useSelector } from "react-redux";
import ErrorBoundary from "../components/ErrorBoundary";
import Layout from "../components/Layout";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Students from "../pages/Students";
import Receipts from "../pages/Receipts";
import Expenses from "../pages/Expenses";
import Payroll from "../pages/Payroll";
import Accounting from "../pages/Accounting";
import Accounts from "../pages/Accounts";
import JournalEntries from "../pages/JournalEntries";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import DirectorApprovals from "../pages/DirectorApprovals";

function RootRedirect() {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
  );
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

function DirectorLayout() {
  return (
    <ProtectedRoute requiredRole="director">
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/login",
    element: <Login />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/register",
    element: <Register />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/",
    element: <ProtectedLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "students",
        element: <Students />,
      },
      {
        path: "receipts",
        element: <Receipts />,
      },
      {
        path: "expenses",
        element: <Expenses />,
      },
      {
        path: "payroll",
        element: <Payroll />,
      },
      {
        path: "accounting",
        element: <Accounting />,
      },
      {
        path: "accounts",
        element: <Accounts />,
      },
      {
        path: "journal-entries",
        element: <JournalEntries />,
      },
      {
        path: "reports",
        element: <Reports />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
    ],
  },
  {
    path: "/approvals",
    element: (
      <ProtectedRoute requiredRole="director">
        <Layout>
          <DirectorApprovals />
        </Layout>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
]);

export default router;