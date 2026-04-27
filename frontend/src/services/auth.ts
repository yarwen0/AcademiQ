import { apiClient } from './apiClient';
import type {
  AuthPayload,
  LoginRequest,
  RegisterRequest,
  RefreshResponse,
  User,
} from '../types';

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthPayload> {
    const { data } = await apiClient.post<AuthPayload>(
      '/api/auth/login',
      credentials,
    );
    return data;
  },

  async register(payload: RegisterRequest): Promise<AuthPayload> {
    const { data } = await apiClient.post<AuthPayload>(
      '/api/auth/register',
      payload,
    );
    return data;
  },

  /**
   * Silent refresh using the httpOnly refresh-token cookie.
   * Returns a new access token + updated user object.
   */
  async refresh(): Promise<AuthPayload> {
    const { data } = await apiClient.post<AuthPayload>('/api/auth/refresh');
    return data;
  },

  async logout(): Promise<void> {
    // Tells the backend to revoke the refresh token stored in the httpOnly cookie.
    await apiClient.post('/api/auth/logout');
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get<User>('/api/auth/me');
    return data;
  },

  async refreshToken(): Promise<RefreshResponse> {
    const { data } = await apiClient.post<RefreshResponse>('/api/auth/refresh');
    return data;
  },
};
