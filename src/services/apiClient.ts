/**
 * Axios API client with JWT refresh interceptor.
 *
 * SECURITY DECISIONS:
 *
 * A02 Cryptographic Failures:
 *   - Bearer token is read from the in-memory AuthContext ref at request time.
 *   - If a 401 is returned, we attempt ONE silent refresh via the httpOnly cookie.
 *   - A failed refresh triggers logout (clears token ref + redirects to /login).
 *   - We use a queue to prevent parallel refresh races: while a refresh is in-flight
 *     all concurrent failing requests are queued and retried on success.
 *
 * A01 Broken Access Control:
 *   - withCredentials: true ensures the httpOnly refresh cookie is sent
 *     for cross-origin requests to the backend API.
 */

import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

// ---- Singleton accessor ----
// We cannot import AuthContext here (circular dep risk), so we use setter functions
// registered by the AuthProvider on mount.
type TokenGetter = () => string | null;
type TokenSetter = (token: string) => void;
type LogoutFn = () => Promise<void>;

let _getToken: TokenGetter = () => null;
let _setToken: TokenSetter = () => undefined;
let _logout: LogoutFn = async () => undefined;

export function registerAuthHandlers(
  getter: TokenGetter,
  setter: TokenSetter,
  logout: LogoutFn,
) {
  _getToken = getter;
  _setToken = setter;
  _logout = logout;
}

// ---- Axios instance ----
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // sends httpOnly refresh-token cookie on every request
  headers: { 'Content-Type': 'application/json' },
});

// ---- Request interceptor: attach Bearer token ----
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = _getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- Refresh queue to prevent parallel refresh races ----
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (token) {
      p.resolve(token);
    } else {
      p.reject(error);
    }
  });
  failedQueue = [];
}

// ---- Response interceptor: handle 401 with one silent refresh attempt ----
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only intercept 401s and only retry once per request.
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't intercept the refresh endpoint itself (prevents infinite loops).
    if (originalRequest.url?.includes('/auth/refresh')) {
      await _logout();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the in-flight refresh resolves.
      return new Promise<unknown>((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => {
            if (originalRequest.headers) {
              (originalRequest.headers as Record<string, string>)[
                'Authorization'
              ] = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Attempt silent refresh — the httpOnly cookie is sent automatically.
      const { data } = await apiClient.post<{ accessToken: string }>(
        '/api/auth/refresh',
      );
      const newToken = data.accessToken;
      _setToken(newToken);

      // Update this request's auth header and retry.
      if (originalRequest.headers) {
        (originalRequest.headers as Record<string, string>)[
          'Authorization'
        ] = `Bearer ${newToken}`;
      }
      processQueue(null, newToken);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await _logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
