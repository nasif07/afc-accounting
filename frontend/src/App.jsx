import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { getCurrentUser } from "./store/slices/authSlice";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Receipts from "./pages/Receipts";
import Expenses from "./pages/Expenses";
import Payroll from "./pages/Payroll";
import Accounting from "./pages/Accounting";
import JournalEntries from "./pages/JournalEntries";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import DirectorApprovals from "./pages/DirectorApprovals";

export default function App() {
  const dispatch = useDispatch();
  // Destructure 'loading' (or 'status') from your Redux state
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getCurrentUser());
  }, [dispatch]);

  // 1. Prevent redirection while the check is in progress
  if (loading) {
    return <div>Loading...</div>; // Or a nice Spinner component
  }

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <Layout>
                  <Students />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/receipts"
            element={
              <ProtectedRoute>
                <Layout>
                  <Receipts />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <Layout>
                  <Expenses />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payroll"
            element={
              <ProtectedRoute>
                <Layout>
                  <Payroll />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounting"
            element={
              <ProtectedRoute>
                <Layout>
                  <Accounting />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/journal-entries"
            element={
              <ProtectedRoute>
                <Layout>
                  <JournalEntries />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <ProtectedRoute requiredRole="director">
                <Layout>
                  <DirectorApprovals />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <Navigate
                to={isAuthenticated ? "/dashboard" : "/login"}
                replace
              />
            }
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
