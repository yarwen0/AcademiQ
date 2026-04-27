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
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent inline-block" />
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
      <article>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
            {thread.category}
          </span>
          {thread.flair === 'answered' && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700">
              ✓ Answered
            </span>
          )}
          {thread.isLocked && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
              🔒 Locked
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-3">{thread.title}</h1>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-4">
          <span>
            by <span className="font-semibold text-slate-700">{thread.authorName}</span>
          </span>
          <span>·</span>
          <span>{formatDate(thread.createdAt)}</span>
          {thread.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600 font-medium">
              #{tag}
            </span>
          ))}
        </div>

        {/* Thread body — A03 XSS: sanitized before DOM insertion */}
        <div
          className="prose prose-slate max-w-none rounded-xl border border-slate-100 bg-white p-5"
          // A03 XSS: ALL user-generated content passes through DOMPurify before render.
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(thread.content) }}
        />

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {/* Vote */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => voteThread(1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm
                         text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              aria-label="Upvote"
            >
              ▲ {thread.upvotes}
            </button>
            <button
              onClick={() => voteThread(-1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm
                         text-slate-600 hover:border-red-300 hover:text-red-600 transition-colors"
              aria-label="Downvote"
            >
              ▼
            </button>
          </div>

          {/* A01: Moderator controls — only shown to moderator/admin */}
          {canModerate && (
            <div className="flex flex-wrap items-center gap-2 border-l border-slate-200 pl-4">
              <span className="text-xs font-medium text-amber-600">
                <RoleBadge role={role!} />
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLock}
              >
                {thread.isLocked ? '🔓 Unlock' : '🔒 Lock'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  handleFlair(thread.flair === 'answered' ? null : 'answered')
                }
              >
                {thread.flair === 'answered' ? 'Unflair' : '✓ Mark Answered'}
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
          🔒 This thread is locked. No new replies can be posted.
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
