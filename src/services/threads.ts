import { apiClient } from './apiClient';
import type {
  Thread,
  CreateThreadRequest,
  PaginatedResponse,
  SortOption,
} from '../types';

interface ThreadListParams {
  sort?: SortOption;
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export const threadsService = {
  async list(params: ThreadListParams = {}): Promise<PaginatedResponse<Thread>> {
    const { data } = await apiClient.get<PaginatedResponse<Thread>>(
      '/api/threads',
      { params },
    );
    return data;
  },

  async getById(id: string): Promise<Thread> {
    const { data } = await apiClient.get<Thread>(`/api/threads/${id}`);
    return data;
  },

  async create(payload: CreateThreadRequest): Promise<Thread> {
    const { data } = await apiClient.post<Thread>('/api/threads', payload);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/threads/${id}`);
  },

  async lock(id: string): Promise<Thread> {
    const { data } = await apiClient.patch<Thread>(`/api/threads/${id}/lock`);
    return data;
  },

  async flair(id: string, flair: 'answered' | 'pinned' | null): Promise<Thread> {
    const { data } = await apiClient.patch<Thread>(`/api/threads/${id}/flair`, {
      flair,
    });
    return data;
  },

  async vote(id: string, value: 1 | -1 | 0): Promise<{ upvotes: number }> {
    const { data } = await apiClient.post<{ upvotes: number }>(
      `/api/threads/${id}/vote`,
      { value },
    );
    return data;
  },
};
