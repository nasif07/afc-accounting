import { Navigate } from "react-router";
import { useSelector } from "react-redux";

/**
 * Wraps public-only pages (login, register).
 * Authenticated users are redirected to /dashboard immediately.
 * No loading check needed — AppInitializer blocks rendering until
 * getCurrentUser resolves, so isAuthenticated is always settled here.
 */
export default function PublicRoute({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
