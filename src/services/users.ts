import { apiClient } from './apiClient';
import type { User, Role, FlaggedContent, PaginatedResponse } from '../types';

export const usersService = {
  async getProfile(userId: string): Promise<User> {
    const { data } = await apiClient.get<User>(`/api/users/${userId}`);
    return data;
  },

  async updateDisplayName(displayName: string): Promise<User> {
    const { data } = await apiClient.patch<User>('/api/users/me', {
      displayName,
    });
    return data;
  },

  // ---- Admin-only endpoints ----
  async listUsers(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<User>> {
    const { data } = await apiClient.get<PaginatedResponse<User>>(
      '/api/admin/users',
      { params },
    );
    return data;
  },

  async setRole(userId: string, role: Role): Promise<User> {
    const { data } = await apiClient.patch<User>(
      `/api/admin/users/${userId}/role`,
      { role },
    );
    return data;
  },

  async banUser(userId: string): Promise<User> {
    const { data } = await apiClient.patch<User>(
      `/api/admin/users/${userId}/ban`,
    );
    return data;
  },

  async unbanUser(userId: string): Promise<User> {
    const { data } = await apiClient.patch<User>(
      `/api/admin/users/${userId}/unban`,
    );
    return data;
  },

  async getFlaggedContent(): Promise<FlaggedContent[]> {
    const { data } = await apiClient.get<FlaggedContent[]>(
      '/api/admin/flagged',
    );
    return data;
  },

  async dismissFlag(flagId: string): Promise<void> {
    await apiClient.delete(`/api/admin/flagged/${flagId}`);
  },
};
