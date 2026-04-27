/**
 * App.tsx — Root component: router configuration + provider tree.
 *
 * Route structure:
 *   Public:
 *     /              Home (thread list)
 *     /login         Login page
 *     /register      Register page
 *     /forbidden     403 page
 *     *              404 page
 *
 *   Protected (any authenticated user):
 *     /thread/new        Create new thread
 *     /thread/:id        Thread view
 *     /profile/:userId   User profile
 *
 *   Admin-only:
 *     /admin             Admin dashboard
 *
 * A01 Broken Access Control: ProtectedRoute wraps all authenticated and
 * role-gated routes. Unauthenticated users are redirected to /login.
 * Insufficient-role users are redirected to /forbidden.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { registerAuthHandlers } from './services/apiClient';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';

// Pages
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { ThreadPage } from './pages/Thread';
import { NewThreadPage } from './pages/NewThread';
import { ProfilePage } from './pages/Profile';
import { AdminPage } from './pages/Admin';
import { ForbiddenPage } from './pages/Forbidden';
import { NotFoundPage } from './pages/NotFound';

/**
 * AuthRegistrar bridges AuthContext into the Axios client.
 * It registers the token getter/setter/logout so the interceptor can
 * read/update the in-memory token without creating a circular import.
 */
function AuthRegistrar() {
  const { getAccessToken, setAccessToken, logout } = useAuthContext();

  useEffect(() => {
    registerAuthHandlers(getAccessToken, setAccessToken, logout);
  }, [getAccessToken, setAccessToken, logout]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <AuthRegistrar />
      <Navbar />
      <main>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          {/* Protected: any authenticated user */}
          <Route element={<ProtectedRoute />}>
            <Route path="/thread/new" element={<NewThreadPage />} />
            <Route path="/thread/:id" element={<ThreadPage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
          </Route>

          {/* Admin-only routes */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
