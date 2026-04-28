import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usersService } from '../services/users';
import { threadsService } from '../services/threads';
import { validateDisplayName } from '../utils/validation';
import { ThreadCard } from '../components/ThreadCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { RoleBadge } from '../components/RoleBadge';
import type { User, Thread } from '../types';

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser, updateUser } = useAuth();

  const [profile, setProfile] = useState<User | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit display name
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    Promise.all([
      usersService.getProfile(userId),
      threadsService.list({ page: 1, limit: 10 }),
    ])
      .then(([p, t]) => {
        if (!cancelled) {
          setProfile(p);
          // Filter threads by this user (in real app the API would support authorId filter)
          setThreads(t.data.filter((th) => th.authorId === userId));
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load profile.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  const handleSaveName = async () => {
    const result = validateDisplayName(newName);
    if (!result.valid) { setNameError(result.error); return; }

    setIsSaving(true);
    try {
      const updated = await usersService.updateDisplayName(newName);
      setProfile(updated);
      updateUser({ displayName: updated.displayName });
      setEditingName(false);
      setNameError('');
    } catch {
      setNameError('Failed to update name.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-red-600">
        {error ?? 'Profile not found.'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      {/* Profile card */}
      <div className="retro-card p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="retro-avatar flex h-16 w-16 flex-shrink-0 items-center justify-center text-2xl font-bold">
            {profile.displayName[0]?.toUpperCase() ?? '?'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-[var(--line)]">
                {profile.displayName}
              </h1>
              <RoleBadge role={profile.role} />
              {profile.isBanned && (
                <span className="border-2 border-[var(--line)] bg-[#e0b4a8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6b2317]">
                  Banned
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{profile.email}</p>
            <p className="text-sm text-[var(--ink-soft)]">{profile.university}</p>
          </div>
        </div>

        {/* Edit display name (own profile only) */}
        {isOwnProfile && (
          <div className="retro-rule mt-5 pt-5">
            {editingName ? (
              <div className="flex flex-col gap-3">
                <Input
                  label="Display name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  error={nameError}
                />
                <div className="flex gap-2">
                  <Button size="sm" isLoading={isSaving} onClick={handleSaveName}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { setEditingName(false); setNameError(''); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setEditingName(true); setNewName(profile.displayName); }}
              >
                Edit display name
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Posts */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-700">Posts</h2>
        {threads.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">No posts yet.</p>
        ) : (
          <div className="space-y-3">
            {threads.map((t) => (
              <ThreadCard key={t.id} thread={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
