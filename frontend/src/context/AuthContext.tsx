/**
 * AuthContext — Centralised authentication state for AcademiQ.
 *
 * SECURITY DECISIONS:
 *
 * A02 Cryptographic Failures (OWASP):
 *   - The JWT access token is stored ONLY in this React context (in-memory).
 *   - It is never written to localStorage, sessionStorage, or any cookie.
 *   - When the page is refreshed the access token is gone; a silent refresh call
 *     to /api/auth/refresh uses the httpOnly refresh-token cookie (set by the
 *     backend) to obtain a new access token without any JS-accessible storage.
 *   - This eliminates XSS-based token theft from persistent browser storage.
 *
 * A01 Broken Access Control (OWASP):
 *   - The `user.role` value stored here drives all client-side UI gating.
 *   - The backend must ALWAYS re-validate the role on every protected endpoint.
 *     Client-side role checks are a UX convenience, not a security boundary.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { User, Role } from '../types';
import { authService } from '../services/auth';

// ---- Context Shape ----
interface AuthContextValue {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Returns the in-memory access token — use only inside API service layer. */
  getAccessToken: () => string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Called by the Axios interceptor after a successful silent refresh. */
  setAccessToken: (token: string) => void;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // A02: Access token lives exclusively in a ref — never touches the DOM or Web Storage.
  // A ref survives re-renders without triggering them and is not serialisable.
  const accessTokenRef = useRef<string | null>(null);

  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  const setAccessToken = useCallback((token: string) => {
    accessTokenRef.current = token;
  }, []);

  const updateUser = useCallback((updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : prev));
  }, []);

  // ---- Silent refresh on mount ----
  // On page load, attempt a silent token refresh using the httpOnly cookie.
  // If the cookie is absent or expired the user stays logged out — no error shown.
  useEffect(() => {
    let cancelled = false;

    const attemptSilentRefresh = async () => {
      try {
        const { accessToken, user: freshUser } = await authService.refresh();
        if (!cancelled) {
          accessTokenRef.current = accessToken;
          setUser(freshUser);
        }
      } catch {
        // Refresh failed (no valid cookie) — user is unauthenticated. This is normal.
        if (!cancelled) {
          accessTokenRef.current = null;
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    attemptSilentRefresh();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, user: loggedInUser } = await authService.login({
      email,
      password,
    });
    // A02: Token goes into the ref, never into any Web Storage API.
    accessTokenRef.current = accessToken;
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      // Clear in-memory token regardless of server response.
      accessTokenRef.current = null;
      setUser(null);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    role: user?.role ?? null,
    isAuthenticated: user !== null,
    isLoading,
    getAccessToken,
    login,
    logout,
    setAccessToken,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---- Hook ----
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }
  return ctx;
}
