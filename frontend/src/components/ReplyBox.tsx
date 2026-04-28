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
      try {
        await clearDraft();
      } catch (draftError) {
        console.error('[ReplyBox] Failed to clear draft after posting:', draftError);
      }
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
    <form onSubmit={handleSubmit} className="retro-card space-y-3 p-4">
      <div className="relative">
        <textarea
          value={isLoadingDraft ? '' : content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a reply..."
          rows={3}
          disabled={isLoadingDraft}
          className="min-h-28 w-full resize-y border-2 border-[var(--line)] bg-[rgba(255,252,242,0.92)] px-3 py-2.5 text-sm
                     text-[var(--ink)] placeholder:text-[rgba(109,90,68,0.75)]
                     focus:outline-none disabled:bg-[rgba(240,227,194,0.6)] disabled:text-[rgba(109,90,68,0.75)]"
          aria-label="Reply text"
        />
        {/* Draft saved indicator */}
        {draftSaved && (
          <span className="absolute bottom-2 right-2 bg-[rgba(248,241,220,0.96)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Draft saved
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-[var(--danger)]">
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
