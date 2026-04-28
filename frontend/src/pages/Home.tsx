/**
 * Home page — main forum thread listing.
 *
 * Features:
 *   - Threads list with sort (Latest / Top / Unanswered)
 *   - Search bar with 300ms debounce (useDebounce)
 *   - "New Post" button visible to authenticated students/moderators/admins
 *   - Paginated results
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDebounce } from '../hooks/useDebounce';
import { threadsService } from '../services/threads';
import { ThreadCard } from '../components/ThreadCard';
import { Button } from '../components/Button';
import type { Thread, SortOption } from '../types';
import type { AxiosError } from 'axios';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'top', label: 'Top' },
  { value: 'unanswered', label: 'Unanswered' },
];

export function HomePage() {
  const { isAuthenticated } = useAuth();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortOption>('latest');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search, 300);
  const LIMIT = 20;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    threadsService
      .list({ sort, search: debouncedSearch || undefined, page, limit: LIMIT })
      .then((res) => {
        if (!cancelled) {
          setThreads(res.data);
          setTotal(res.total);
        }
      })
      .catch((err: AxiosError<{ message?: string }>) => {
        if (cancelled) return;
        if (!err.response) {
          setError('Cannot reach the backend API. Make sure the Go server and PostgreSQL are running.');
          return;
        }
        setError(err.response.data?.message ?? 'Failed to load threads. Please refresh.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sort, debouncedSearch, page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="retro-shell mb-6 flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="retro-kicker">Public Bulletin</p>
          <h1 className="retro-title text-3xl">Forum</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">{total} threads in circulation</p>
        </div>
        {/* A01: "New Post" only shown to authenticated users — backend enforces creation auth */}
        {isAuthenticated && (
          <Link to="/thread/new">
            <Button>New Post</Button>
          </Link>
        )}
      </div>

      {/* Search + Sort */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            Find
          </span>
          <input
            type="search"
            placeholder="Search threads, topics, and tags"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-2 border-[var(--line)] bg-[rgba(255,252,242,0.72)] py-2.5 pl-16 pr-3 text-sm
                       text-[var(--ink)] placeholder:text-[rgba(109,90,68,0.75)] focus:outline-none"
            aria-label="Search threads"
          />
        </div>

        {/* Sort tabs */}
        <div className="flex border-2 border-[var(--line)] bg-[rgba(248,241,220,0.8)] p-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={[
                'px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.14em] transition-colors',
                sort === opt.value
                  ? 'bg-[var(--accent)] text-[var(--panel)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--line)]',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Thread list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse border-2 border-[var(--line)] bg-[rgba(240,227,194,0.7)]"
            />
          ))}
        </div>
      ) : error ? (
        <div className="border-2 border-[var(--danger)] bg-[#fbebe6] p-6 text-center text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : threads.length === 0 ? (
        <div className="retro-card p-12 text-center">
          <p className="text-[var(--ink-soft)]">
            {debouncedSearch
              ? 'No threads match your search.'
              : 'No threads yet. Be the first to post!'}
          </p>
          {isAuthenticated && (
            <Link to="/thread/new" className="mt-4 inline-block">
              <Button size="sm">Create the first thread</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
