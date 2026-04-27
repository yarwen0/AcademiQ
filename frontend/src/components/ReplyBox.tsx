/**
 * ReplyBox — Comment/reply editor with draft auto-save.
 *
 * Uses useDraft (sql.js + IndexedDB) to preserve content across reloads.
 * Draft key is namespaced by parentId to avoid collisions.
 */

import { useState } from 'react';
import { useDraft } from '../hooks/useDraft';
import { postsService } from '../services/posts';
import { Button } from './Button';
import { validateCommentContent } from '../utils/validation';

interface ReplyBoxProps {
  threadId: string;
  parentId: string | null;
  onPosted: () => void;
}

export function ReplyBox({ threadId, parentId, onPosted }: ReplyBoxProps) {
  const draftKey = `reply-${threadId}-${parentId ?? 'top'}`;
  const { content, setContent, clearDraft, draftSaved, isLoadingDraft } =
    useDraft(draftKey);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateCommentContent(content);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await postsService.createComment({ threadId, parentId, content });
      await clearDraft();
      onPosted();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to post comment.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="relative">
        <textarea
          value={isLoadingDraft ? '' : content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a reply..."
          rows={3}
          disabled={isLoadingDraft}
          className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm
                     text-slate-800 placeholder-slate-400 focus:border-indigo-500
                     focus:outline-none focus:ring-2 focus:ring-indigo-500
                     disabled:bg-slate-50 disabled:text-slate-400"
          aria-label="Reply text"
        />
        {/* Draft saved indicator */}
        {draftSaved && (
          <span className="absolute bottom-2 right-2 text-xs text-slate-400">
            Draft saved
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="sm" isLoading={isSubmitting}>
          Post Reply
        </Button>
      </div>
    </form>
  );
}
