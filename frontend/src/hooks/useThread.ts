import { useCallback, useEffect, useState } from 'react';
import { threadsService } from '../services/threads';
import { postsService } from '../services/posts';
import type { Thread, Comment } from '../types';

interface UseThreadReturn {
  thread: Thread | null;
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  voteThread: (value: 1 | -1 | 0) => Promise<void>;
  voteComment: (commentId: string, value: 1 | -1 | 0) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}

export function useThread(threadId: string): UseThreadReturn {
  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      threadsService.getById(threadId),
      postsService.getComments(threadId),
    ])
      .then(([t, c]) => {
        if (!cancelled) {
          setThread(t);
          setComments(c);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load thread.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [threadId, refreshCount]);

  const refresh = useCallback(() => setRefreshCount((n) => n + 1), []);

  const voteThread = useCallback(
    async (value: 1 | -1 | 0) => {
      const { upvotes, downvotes } = await threadsService.vote(threadId, value);
      setThread((prev) => (prev ? { ...prev, upvotes, downvotes } : prev));
    },
    [threadId],
  );

  const voteComment = useCallback(
    async (commentId: string, value: 1 | -1 | 0) => {
      const { upvotes, downvotes } = await postsService.voteComment(
        commentId,
        value,
      );
      setComments((prev) =>
        updateCommentInTree(prev, commentId, { upvotes, downvotes }),
      );
    },
    [],
  );

  const deleteComment = useCallback(async (commentId: string) => {
    await postsService.deleteComment(commentId);
    setComments((prev) => removeCommentFromTree(prev, commentId));
  }, []);

  return { thread, comments, isLoading, error, refresh, voteThread, voteComment, deleteComment };
}

// ---- Tree helpers ----

function updateCommentInTree(
  comments: Comment[],
  id: string,
  patch: Partial<Comment>,
): Comment[] {
  return comments.map((c) => {
    if (c.id === id) return { ...c, ...patch };
    if (c.children.length > 0) {
      return { ...c, children: updateCommentInTree(c.children, id, patch) };
    }
    return c;
  });
}

function removeCommentFromTree(comments: Comment[], id: string): Comment[] {
  return comments
    .filter((c) => c.id !== id)
    .map((c) => ({
      ...c,
      children: c.children.length > 0 ? removeCommentFromTree(c.children, id) : [],
    }));
}
