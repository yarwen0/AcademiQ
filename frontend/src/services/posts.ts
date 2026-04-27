import { apiClient } from './apiClient';
import type { Comment, CreateCommentRequest } from '../types';

export const postsService = {
  async getComments(threadId: string): Promise<Comment[]> {
    const { data } = await apiClient.get<Comment[]>(
      `/api/threads/${threadId}/comments`,
    );
    return data;
  },

  async createComment(payload: CreateCommentRequest): Promise<Comment> {
    const { data } = await apiClient.post<Comment>('/api/comments', payload);
    return data;
  },

  async deleteComment(id: string): Promise<void> {
    await apiClient.delete(`/api/comments/${id}`);
  },

  async voteComment(
    id: string,
    value: 1 | -1 | 0,
  ): Promise<{ upvotes: number; downvotes: number }> {
    const { data } = await apiClient.post<{ upvotes: number; downvotes: number }>(
      `/api/comments/${id}/vote`,
      { value },
    );
    return data;
  },
};
