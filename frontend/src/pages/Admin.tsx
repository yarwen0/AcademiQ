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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
          Admin only
        </span>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {(['users', 'flagged'] as AdminTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800',
            ].join(' ')}
          >
            {tab === 'users' ? 'User Management' : 'Flagged Content'}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : activeTab === 'users' ? (
        /* ---- User Management ---- */
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">User</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{u.displayName}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    {u.isBanned ? (
                      <span className="text-red-600 font-medium">Banned</span>
                    ) : (
                      <span className="text-green-600 font-medium">Active</span>
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
            <p className="p-8 text-center text-sm text-slate-400">No users found.</p>
          )}
        </div>
      ) : (
        /* ---- Flagged Content ---- */
        <div className="space-y-3">
          {flagged.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              No flagged content. 🎉
            </div>
          ) : (
            flagged.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-600">
                      {item.type}
                    </span>
                    <span>Reported by {item.reportedBy}</span>
                    <span>·</span>
                    <span>{item.reason}</span>
                  </div>
                  <p className="text-sm text-slate-700">ID: {item.contentId}</p>
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
