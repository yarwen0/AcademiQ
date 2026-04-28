import { Link } from 'react-router-dom';
import type { Thread } from '../types';
import { formatDistanceToNow } from '../utils/time';

interface ThreadCardProps {
  thread: Thread;
}

const flairConfig = {
  answered: { label: 'Answered', className: 'border border-[var(--line)] bg-[#d7e0bd] text-[#38411a]' },
  locked: { label: 'Locked', className: 'border border-[var(--line)] bg-[#e4d4b1] text-[var(--ink-soft)]' },
  pinned: { label: 'Pinned', className: 'border border-[var(--line)] bg-[#cbbda0] text-[var(--line)]' },
};

export function ThreadCard({ thread }: ThreadCardProps) {
  return (
    <article className="retro-card group p-4 transition-transform hover:-translate-y-0.5">
      <div className="flex gap-4">
        {/* Vote count */}
        <div className="retro-panel-muted flex min-w-[54px] flex-col items-center gap-0.5 self-start px-2 py-2">
          <span className="text-lg font-bold leading-none text-[var(--line)]">
            {thread.upvotes}
          </span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">votes</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <Link
            to={`/thread/${thread.id}`}
            className="font-serif text-lg font-bold text-[var(--line)] transition-colors line-clamp-2 group-hover:text-[var(--accent)]"
          >
            {/* React renders text content safely — no sanitization needed for plain text */}
            {thread.title}
          </Link>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-soft)]">
            <span>
              by{' '}
              <Link
                to={`/profile/${thread.authorId}`}
                className="font-semibold text-[var(--line)] hover:text-[var(--accent)]"
              >
                {thread.authorName}
              </Link>
            </span>
            <span>·</span>
            <span>{formatDistanceToNow(thread.createdAt)}</span>
            <span>·</span>
            <span>{thread.commentCount} comments</span>

            {/* Category */}
            <span className="border border-[var(--line)] bg-[rgba(240,227,194,0.78)] px-2 py-0.5 font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
              {thread.category}
            </span>

            {/* Flair */}
            {thread.flair && flairConfig[thread.flair] && (
              <span
                className={`px-2 py-0.5 font-semibold uppercase tracking-[0.12em] ${flairConfig[thread.flair].className}`}
              >
                {flairConfig[thread.flair].label}
              </span>
            )}

            {/* Tags */}
            {thread.tags.map((tag) => (
              <span
                key={tag}
                className="border border-[var(--accent)] bg-[rgba(139,46,26,0.08)] px-2 py-0.5 font-semibold text-[var(--accent)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
