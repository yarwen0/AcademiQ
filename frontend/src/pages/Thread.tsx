/**
 * Thread page — full post view with comments.
 *
 * SECURITY DECISIONS:
 *
 * A03 XSS:
 *   - Thread content and all comment content are sanitized with DOMPurify
 *     before being inserted via dangerouslySetInnerHTML.
 *   - The sanitize() call is placed directly above each dangerouslySetInnerHTML
 *     usage so the pairing is always visible in code review.
 *
 * A01 Broken Access Control:
 *   - Moderator controls (delete, lock, flair) are rendered only when
 *     role === 'moderator' || role === 'admin'.
 *   - Backend must still enforce authorization on these endpoints.
 */

import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useThread } from '../hooks/useThread';
import { threadsService } from '../services/threads';
import { sanitizeHtml } from '../utils/sanitize';
import { formatDate } from '../utils/time';
import { CommentTree } from '../components/CommentTree';
import { ReplyBox } from '../components/ReplyBox';
import { Button } from '../components/Button';
import { RoleBadge } from '../components/RoleBadge';

export function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();

  const {
    thread,
    comments,
    isLoading,
    error,
    refresh,
    voteThread,
    voteComment,
    deleteComment,
  } = useThread(id ?? '');

  const canModerate = role === 'moderator' || role === 'admin';

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-red-600">{error ?? 'Thread not found.'}</p>
      </div>
    );
  }

  const handleLock = async () => {
    await threadsService.lock(thread.id);
    refresh();
  };

  const handleFlair = async (flair: 'answered' | null) => {
    await threadsService.flair(thread.id, flair);
    refresh();
  };

  const handleDelete = async () => {
    await threadsService.delete(thread.id);
    window.history.back();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      {/* Thread header */}
      <article className="retro-card p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-soft)]">
          <span className="border border-[var(--line)] bg-[rgba(240,227,194,0.78)] px-2 py-0.5 font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            {thread.category}
          </span>
          {thread.flair === 'answered' && (
            <span className="border border-[var(--line)] bg-[#d7e0bd] px-2 py-0.5 font-semibold uppercase tracking-[0.12em] text-[#38411a]">
              Answered
            </span>
          )}
          {thread.isLocked && (
            <span className="border border-[var(--line)] bg-[#e4d4b1] px-2 py-0.5 font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
              Locked
            </span>
          )}
        </div>

        <h1 className="mb-3 font-serif text-3xl font-bold text-[var(--line)]">{thread.title}</h1>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-[var(--ink-soft)]">
          <span>
            by <span className="font-semibold text-[var(--line)]">{thread.authorName}</span>
          </span>
          <span>·</span>
          <span>{formatDate(thread.createdAt)}</span>
          {thread.tags.map((tag) => (
            <span key={tag} className="border border-[var(--accent)] bg-[rgba(139,46,26,0.08)] px-2 py-0.5 font-semibold text-[var(--accent)]">
              #{tag}
            </span>
          ))}
        </div>

        {/* Thread body — A03 XSS: sanitized before DOM insertion */}
        <div
          className="retro-prose max-w-none border-2 border-[rgba(59,44,27,0.2)] bg-[rgba(255,252,242,0.62)] p-5"
          // A03 XSS: ALL user-generated content passes through DOMPurify before render.
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(thread.content) }}
        />

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {/* Vote */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <button
              onClick={() => voteThread(1)}
              className="flex items-center gap-1 text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]"
              aria-label="Upvote"
            >
              Upvote {thread.upvotes}
            </button>
            <button
              onClick={() => voteThread(-1)}
              className="flex items-center gap-1 text-[var(--ink-soft)] transition-colors hover:text-[var(--danger)]"
              aria-label="Downvote"
            >
              Downvote {thread.downvotes}
            </button>
          </div>

          {/* A01: Moderator controls — only shown to moderator/admin */}
          {canModerate && (
            <div className="flex flex-wrap items-center gap-2 border-l-2 border-[rgba(59,44,27,0.24)] pl-4">
              <span className="text-xs font-medium text-[var(--gold)]">
                <RoleBadge role={role!} />
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLock}
              >
                {thread.isLocked ? 'Unlock' : 'Lock'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  handleFlair(thread.flair === 'answered' ? null : 'answered')
                }
              >
                {thread.flair === 'answered' ? 'Unflair' : 'Mark Answered'}
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Delete Post
              </Button>
            </div>
          )}
        </div>
      </article>

      {/* Reply box — only if authenticated and thread is not locked */}
      {user && !thread.isLocked && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-700">
            Leave a reply
          </h2>
          <ReplyBox
            threadId={thread.id}
            parentId={null}
            onPosted={refresh}
          />
        </section>
      )}

      {thread.isLocked && (
        <div className="border-2 border-[var(--line)] bg-[rgba(240,227,194,0.8)] p-4 text-center text-sm text-[var(--ink-soft)]">
          This thread is locked. No new replies can be posted.
        </div>
      )}

      {/* Comments */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-700">
          {thread.commentCount} {thread.commentCount === 1 ? 'Comment' : 'Comments'}
        </h2>
        <CommentTree
          comments={comments}
          threadId={thread.id}
          currentUserId={user?.id ?? null}
          currentRole={role}
          isThreadLocked={thread.isLocked}
          onVote={voteComment}
          onDelete={deleteComment}
          onReplyPosted={refresh}
        />
      </section>
    </div>
  );
}
