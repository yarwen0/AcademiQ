/**
 * ProtectedRoute — Role-based route guard.
 *
 * A01 Broken Access Control (OWASP):
 *   - Checks AuthContext for authentication state before rendering a route.
 *   - Optionally checks that the user's role meets a minimum requirement.
 *   - Redirects unauthenticated users to /login.
 *   - Redirects authenticated-but-insufficiently-privileged users to /forbidden.
 *   - The backend MUST also validate the JWT role claim on every protected endpoint.
 *     This client-side check is a UX guardrail, not a security boundary.
 *
 * IMPORTANT: Never remove these checks under the assumption that the UI itself
 * is a security control — it is not. Always pair with server-side authorization.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';

const ROLE_ORDER: Record<Role, number> = {
  student: 0,
  moderator: 1,
  admin: 2,
};

interface ProtectedRouteProps {
  /** Minimum role required. Defaults to any authenticated user. */
  requiredRole?: Role;
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  // Show nothing while we attempt a silent token refresh on page load.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  // Not authenticated → redirect to login, preserving intended destination.
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but insufficient role → forbidden.
  if (requiredRole && role) {
    const userLevel = ROLE_ORDER[role];
    const requiredLevel = ROLE_ORDER[requiredRole];
    if (userLevel < requiredLevel) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return <Outlet />;
}
