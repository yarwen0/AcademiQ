/**
 * Admin dashboard.
 *
 * A01 Broken Access Control (OWASP):
 *   - This page is only reachable via ProtectedRoute with requiredRole="admin".
 *   - Even if a user manually navigates here, ProtectedRoute redirects to /forbidden
 *     before this component mounts.
 *   - All admin API calls carry the JWT which the backend validates against the
 *     admin role claim. Client-side role gating is defence-in-depth only.
 */

import { useEffect, useState } from 'react';
import { usersService } from '../services/users';
import { Button } from '../components/Button';
import { RoleBadge } from '../components/RoleBadge';
import type { User, FlaggedContent } from '../types';

type AdminTab = 'users' | 'flagged';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [flagged, setFlagged] = useState<FlaggedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError('');

    const loads =
      activeTab === 'users'
        ? usersService.listUsers().then((res) => setUsers(res.data))
        : usersService.getFlaggedContent().then(setFlagged);

    loads
      .catch(() => setError('Failed to load data.'))
      .finally(() => setIsLoading(false));
  }, [activeTab]);

  const withAction = async (id: string, fn: () => Promise<unknown>) => {
    setActionLoading(id);
    try {
      await fn();
      // Refresh after action
      if (activeTab === 'users') {
        const res = await usersService.listUsers();
        setUsers(res.data);
      } else {
        const res = await usersService.getFlaggedContent();
        setFlagged(res);
      }
    } catch {
      setError('Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="retro-shell mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="retro-kicker">Control Room</p>
            <h1 className="retro-title text-3xl font-bold">Admin Dashboard</h1>
            <p className="max-w-2xl text-sm text-[var(--ink-soft)]">
              Moderate users, review flagged content, and keep the forum orderly.
            </p>
          </div>
          <span className="border-2 border-[var(--line)] bg-[#e0b4a8] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6b2317]">
            Admin Only
          </span>
        </div>
      </div>

      <div className="mb-6 flex w-fit flex-wrap gap-2">
        {(['users', 'flagged'] as AdminTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'border-2 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition',
              activeTab === tab
                ? 'border-[var(--line)] bg-[var(--accent)] text-[var(--panel)] shadow-[3px_3px_0_rgba(59,44,27,0.18)]'
                : 'border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)] shadow-[3px_3px_0_rgba(59,44,27,0.12)] hover:bg-[var(--paper-strong)] hover:text-[var(--ink)]',
            ].join(' ')}
          >
            {tab === 'users' ? 'User Management' : 'Flagged Content'}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 border-2 border-[var(--danger)] bg-[#fbebe6] p-3 text-sm text-[var(--danger)]"
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : activeTab === 'users' ? (
        /* ---- User Management ---- */
        <div className="retro-card overflow-hidden">
          <div className="border-b-2 border-[rgba(59,44,27,0.24)] bg-[rgba(240,227,194,0.82)] px-4 py-3">
            <p className="retro-kicker">User Registry</p>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b-2 border-[rgba(59,44,27,0.24)] bg-[rgba(255,252,242,0.55)]">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-soft)]">User</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-soft)]">Role</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-soft)]">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-soft)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(59,44,27,0.14)]">
              {users.map((u) => (
                <tr key={u.id} className="bg-[rgba(248,241,220,0.78)] hover:bg-[rgba(255,252,242,0.95)]">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[var(--line)]">{u.displayName}</div>
                    <div className="text-xs text-[var(--ink-soft)]">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    {u.isBanned ? (
                      <span className="font-semibold uppercase tracking-[0.12em] text-[var(--danger)]">Banned</span>
                    ) : (
                      <span className="font-semibold uppercase tracking-[0.12em] text-[var(--olive)]">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {/* Promote to moderator */}
                      {u.role === 'student' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          isLoading={actionLoading === `promote-${u.id}`}
                          onClick={() =>
                            withAction(`promote-${u.id}`, () =>
                              usersService.setRole(u.id, 'moderator'),
                            )
                          }
                        >
                          → Moderator
                        </Button>
                      )}
                      {/* Demote */}
                      {u.role === 'moderator' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          isLoading={actionLoading === `demote-${u.id}`}
                          onClick={() =>
                            withAction(`demote-${u.id}`, () =>
                              usersService.setRole(u.id, 'student'),
                            )
                          }
                        >
                          ← Student
                        </Button>
                      )}
                      {/* Ban / Unban */}
                      {u.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant={u.isBanned ? 'secondary' : 'danger'}
                          isLoading={actionLoading === `ban-${u.id}`}
                          onClick={() =>
                            withAction(`ban-${u.id}`, () =>
                              u.isBanned
                                ? usersService.unbanUser(u.id)
                                : usersService.banUser(u.id),
                            )
                          }
                        >
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="p-8 text-center text-sm text-[var(--ink-soft)]">No users found.</p>
          )}
        </div>
      ) : (
        /* ---- Flagged Content ---- */
        <div className="space-y-3">
          {flagged.length === 0 ? (
            <div className="retro-card p-8 text-center text-sm text-[var(--ink-soft)]">
              No flagged content.
            </div>
          ) : (
            flagged.map((item) => (
              <div
                key={item.id}
                className="retro-card flex items-start justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-soft)]">
                    <span className="border border-[var(--line)] bg-[#ead7ac] px-2 py-0.5 font-semibold uppercase tracking-[0.12em] text-[#6f5316]">
                      {item.type}
                    </span>
                    <span>Reported by {item.reportedBy}</span>
                    <span>·</span>
                    <span>{item.reason}</span>
                  </div>
                  <p className="text-sm text-[var(--ink)]">ID: {item.contentId}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  isLoading={actionLoading === item.id}
                  onClick={() =>
                    withAction(item.id, () => usersService.dismissFlag(item.id))
                  }
                >
                  Dismiss
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
