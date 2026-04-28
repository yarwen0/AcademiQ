/**
 * CommentTree — Recursive nested comment renderer.
 *
 * A03 XSS (OWASP):
 *   - Comment content comes from user input stored on the server.
 *   - ALL content is sanitized with DOMPurify before insertion via dangerouslySetInnerHTML.
 *   - Max render depth = 3; beyond that a "View more" link is shown to avoid deep nesting.
 *
 * A01 Broken Access Control:
 *   - Delete button is conditionally rendered only if role is 'moderator' or 'admin'.
 *   - Backend must still enforce this; UI hiding is a UX measure only.
 */

import { useState } from 'react';
import type { Comment, Role } from '../types';
import { sanitizeHtml } from '../utils/sanitize';
import { formatDistanceToNow } from '../utils/time';
import { Button } from './Button';
import { ReplyBox } from './ReplyBox';

const MAX_DEPTH = 3;

interface CommentNodeProps {
  comment: Comment;
  depth: number;
  threadId: string;
  currentUserId: string | null;
  currentRole: Role | null;
  isThreadLocked: boolean;
  onVote: (commentId: string, value: 1 | -1 | 0) => void;
  onDelete: (commentId: string) => void;
  onReplyPosted: () => void;
}

function CommentNode({
  comment,
  depth,
  threadId,
  currentUserId,
  currentRole,
  isThreadLocked,
  onVote,
  onDelete,
  onReplyPosted,
}: CommentNodeProps) {
  const [showReply, setShowReply] = useState(false);
  const [showChildren, setShowChildren] = useState(true);

  const canModerate =
    currentRole === 'moderator' || currentRole === 'admin';
  const canReply = !!currentUserId && !isThreadLocked && depth < MAX_DEPTH;

  return (
    <div
      className={`flex gap-3 ${depth > 0 ? 'border-l-2 border-[rgba(59,44,27,0.18)] pl-4' : ''}`}
    >
      {/* Avatar placeholder */}
      <div className="retro-avatar mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center text-xs font-semibold">
        {comment.authorName[0]?.toUpperCase() ?? '?'}
      </div>

      <div className="retro-panel-muted flex-1 min-w-0 p-3">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-soft)]">
          <span className="font-semibold text-[var(--line)]">{comment.authorName}</span>
          <span>·</span>
          <span>{formatDistanceToNow(comment.createdAt)}</span>
        </div>

        {/* Body — A03 XSS: sanitized before DOM insertion */}
        <div
          className="retro-prose mt-1 max-w-none text-sm"
          // A03 XSS: ALL user content is passed through DOMPurify sanitizer.
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(comment.content) }}
        />

        {/* Actions */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          {/* Upvote */}
          <button
            onClick={() => onVote(comment.id, comment.upvotes > 0 ? 0 : 1)}
            className="flex items-center gap-1 text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]"
            aria-label="Upvote comment"
          >
            Upvote {comment.upvotes}
          </button>

          {/* Downvote */}
          <button
            onClick={() => onVote(comment.id, comment.downvotes > 0 ? 0 : -1)}
            className="flex items-center gap-1 text-[var(--ink-soft)] transition-colors hover:text-[var(--danger)]"
            aria-label="Downvote comment"
          >
            Downvote {comment.downvotes}
          </button>

          {/* Reply */}
          {canReply && (
            <button
              onClick={() => setShowReply((s) => !s)}
              className="text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]"
            >
              {showReply ? 'Cancel' : 'Reply'}
            </button>
          )}

          {/* Moderator: delete */}
          {/* A01: visible only to moderator/admin — backend enforces actual deletion auth */}
          {canModerate && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-[rgba(109,90,68,0.7)] transition-colors hover:text-[var(--danger)]"
            >
              Delete
            </button>
          )}
        </div>

        {/* Inline reply box */}
        {showReply && (
          <div className="mt-3">
            <ReplyBox
              threadId={threadId}
              parentId={comment.id}
              onPosted={() => {
                setShowReply(false);
                onReplyPosted();
              }}
            />
          </div>
        )}

        {/* Children */}
        {comment.children.length > 0 && (
          <div className="mt-3 space-y-3">
            {depth < MAX_DEPTH ? (
              <>
                {showChildren &&
                  comment.children.map((child) => (
                    <CommentNode
                      key={child.id}
                      comment={child}
                      depth={depth + 1}
                      threadId={threadId}
                      currentUserId={currentUserId}
                      currentRole={currentRole}
                      isThreadLocked={isThreadLocked}
                      onVote={onVote}
                      onDelete={onDelete}
                      onReplyPosted={onReplyPosted}
                    />
                  ))}
                <button
                  onClick={() => setShowChildren((s) => !s)}
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)] hover:underline"
                >
                  {showChildren
                    ? 'Collapse replies'
                    : `View ${comment.children.length} replies`}
                </button>
              </>
            ) : (
              /* Max depth reached — prompt user to view in a new context rather than rendering deeper */
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChildren((s) => !s)}
              >
                {showChildren
                  ? 'Collapse'
                  : `Continue thread (${comment.children.length} replies)`}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Top-level tree ----
interface CommentTreeProps {
  comments: Comment[];
  threadId: string;
  currentUserId: string | null;
  currentRole: Role | null;
  isThreadLocked: boolean;
  onVote: (commentId: string, value: 1 | -1 | 0) => void;
  onDelete: (commentId: string) => void;
  onReplyPosted: () => void;
}

export function CommentTree({
  comments,
  threadId,
  currentUserId,
  currentRole,
  isThreadLocked,
  onVote,
  onDelete,
  onReplyPosted,
}: CommentTreeProps) {
  if (comments.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--ink-soft)]">
        No comments yet. Be the first to reply!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentNode
          key={comment.id}
          comment={comment}
          depth={0}
          threadId={threadId}
          currentUserId={currentUserId}
          currentRole={currentRole}
          isThreadLocked={isThreadLocked}
          onVote={onVote}
          onDelete={onDelete}
          onReplyPosted={onReplyPosted}
        />
      ))}
    </div>
  );
}
