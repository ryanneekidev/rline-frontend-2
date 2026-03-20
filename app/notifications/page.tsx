'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW';
  read: boolean;
  createdAt: string;
  actor: { username: string };
  post?: { title: string; id: string } | null;
}

const GROUP_ORDER = ['Today', 'Yesterday', 'Last 7 days', 'Earlier'] as const;
type GroupLabel = (typeof GROUP_ORDER)[number];

function getTimeGroup(dateStr: string): GroupLabel {
  const now = new Date();
  const date = new Date(dateStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  if (date >= todayStart) return 'Today';
  if (date >= yesterdayStart) return 'Yesterday';
  if (date >= weekStart) return 'Last 7 days';
  return 'Earlier';
}

export default function NotificationsPage() {
  const { user, loading, authFetch, sseEventCount, resetUnreadCount } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [markReadId, setMarkReadId] = useState<string | null>(null);

  // Refs so the unmount cleanup always has the latest versions
  const authFetchRef = useRef(authFetch);
  const resetUnreadCountRef = useRef(resetUnreadCount);
  const hasUnreadRef = useRef(false);
  authFetchRef.current = authFetch;
  resetUnreadCountRef.current = resetUnreadCount;
  // Updated synchronously on every render — reflects current notifications state
  hasUnreadRef.current = notifications.some((n) => !n.read);

  async function fetchNotifications() {
    const data = await authFetch('/notifications').then((r) => r.json());
    setNotifications(data);
  }

  // Initial fetch + auth guard + clear badge on enter
  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }

    fetchNotifications()
      .catch(() => showToast('Failed to load notifications', 'error'))
      .finally(() => setFetchLoading(false));

    resetUnreadCount();
  }, [loading, user]);

  // Auto-mark all as read when leaving the page.
  // hasUnreadRef guards against React StrictMode's fake unmount firing this
  // before the fetch has resolved (at that point notifications is still [] so
  // hasUnreadRef.current is false and the call is skipped).
  useEffect(() => {
    return () => {
      if (!hasUnreadRef.current) return;
      authFetchRef.current('/notifications/read-all', { method: 'PATCH' }).catch(() => {});
      resetUnreadCountRef.current();
    };
  }, []);

  // Refetch when a new SSE event arrives
  useEffect(() => {
    if (!user || sseEventCount === 0) return;
    fetchNotifications().catch(() => {});
  }, [sseEventCount]);

  async function markRead(id: string) {
    setMarkReadId(id);
    const res = await authFetch(`/notifications/${id}/read`, { method: 'PATCH' });
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } else {
      showToast('Failed to mark as read', 'error');
    }
    setMarkReadId(null);
  }

  async function markAllRead() {
    setMarkAllLoading(true);
    const res = await authFetch('/notifications/read-all', { method: 'PATCH' });
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast('All notifications marked as read', 'success');
    } else {
      showToast('Failed to mark all as read', 'error');
    }
    setMarkAllLoading(false);
  }

  const hasUnread = notifications.some((n) => !n.read);

  const grouped = GROUP_ORDER.reduce<{ label: GroupLabel; items: Notification[] }[]>(
    (acc, label) => {
      const items = notifications.filter((n) => getTimeGroup(n.createdAt) === label);
      if (items.length > 0) acc.push({ label, items });
      return acc;
    },
    []
  );

  if (loading || fetchLoading) {
    return (
      <div className="flex animate-pulse flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-36 rounded-lg bg-surface" />
          <div className="h-8 w-36 rounded-lg bg-surface" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl border border-border bg-surface" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        {hasUnread && (
          <button
            onClick={markAllRead}
            disabled={markAllLoading}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {markAllLoading ? 'Marking…' : 'Mark all as read'}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">You&apos;re all caught up.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(({ label, items }) => (
            <div key={label} className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</h2>
              {items.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-opacity',
                    !n.read && 'border-l-4 border-l-primary',
                    n.read && 'opacity-50'
                  )}
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-sm text-foreground">
                      {n.type !== 'FOLLOW' && n.post ? (
                        <>
                          <Link href={`/users/${n.actor.username}`} className="font-medium transition-colors hover:text-primary">
                            {n.actor.username}
                          </Link>
                          {n.type === 'LIKE' ? ' liked your post ' : ' commented on your post '}
                          <Link href={`/posts/${n.post.id}`} className="font-medium transition-colors hover:text-primary">
                            &ldquo;{n.post.title}&rdquo;
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link href={`/users/${n.actor.username}`} className="font-medium transition-colors hover:text-primary">
                            {n.actor.username}
                          </Link>
                          {' followed you'}
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted">{formatRelativeTime(n.createdAt)}</p>
                  </div>

                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      disabled={markReadId === n.id}
                      className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      {markReadId === n.id ? '…' : 'Mark as read'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
