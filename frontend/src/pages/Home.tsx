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
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Forum</h1>
          <p className="text-sm text-slate-500">{total} threads</p>
        </div>
        {/* A01: "New Post" only shown to authenticated users — backend enforces creation auth */}
        {isAuthenticated && (
          <Link to="/thread/new">
            <Button>+ New Post</Button>
          </Link>
        )}
      </div>

      {/* Search + Sort */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            type="search"
            placeholder="Search threads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm
                       text-slate-800 placeholder-slate-400 focus:border-indigo-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Search threads"
          />
        </div>

        {/* Sort tabs */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                sort === opt.value
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800',
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
              className="h-20 animate-pulse rounded-xl bg-slate-200"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          {error}
        </div>
      ) : threads.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-400">
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
            ← Previous
          </Button>
          <span className="flex items-center px-3 text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
