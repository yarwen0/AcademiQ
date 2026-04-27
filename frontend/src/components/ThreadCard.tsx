import { Link } from 'react-router-dom';
import type { Thread } from '../types';
import { formatDistanceToNow } from '../utils/time';

interface ThreadCardProps {
  thread: Thread;
}

const flairConfig = {
  answered: { label: 'Answered', className: 'bg-green-100 text-green-700' },
  locked: { label: 'Locked', className: 'bg-slate-100 text-slate-600' },
  pinned: { label: 'Pinned', className: 'bg-indigo-100 text-indigo-700' },
};

export function ThreadCard({ thread }: ThreadCardProps) {
  return (
    <article className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex gap-4">
        {/* Vote count */}
        <div className="flex flex-col items-center gap-0.5 pt-1 min-w-[40px]">
          <span className="text-lg font-bold text-slate-700 leading-none">
            {thread.upvotes}
          </span>
          <span className="text-xs text-slate-400">votes</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <Link
            to={`/thread/${thread.id}`}
            className="text-base font-semibold text-slate-800 hover:text-indigo-600 transition-colors line-clamp-2 group-hover:text-indigo-600"
          >
            {/* React renders text content safely — no sanitization needed for plain text */}
            {thread.title}
          </Link>

          {/* Meta row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>
              by{' '}
              <Link
                to={`/profile/${thread.authorId}`}
                className="font-medium text-slate-700 hover:text-indigo-600"
              >
                {thread.authorName}
              </Link>
            </span>
            <span>·</span>
            <span>{formatDistanceToNow(thread.createdAt)}</span>
            <span>·</span>
            <span>{thread.commentCount} comments</span>

            {/* Category */}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
              {thread.category}
            </span>

            {/* Flair */}
            {thread.flair && flairConfig[thread.flair] && (
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${flairConfig[thread.flair].className}`}
              >
                {flairConfig[thread.flair].label}
              </span>
            )}

            {/* Tags */}
            {thread.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600 font-medium"
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
