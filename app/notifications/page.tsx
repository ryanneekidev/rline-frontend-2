'use client';

import { useEffect, useState } from 'react';
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

function notificationText(n: Notification): string {
  switch (n.type) {
    case 'LIKE':    return `${n.actor.username} liked your post "${n.post?.title}"`;
    case 'COMMENT': return `${n.actor.username} commented on your post "${n.post?.title}"`;
    case 'FOLLOW':  return `${n.actor.username} followed you`;
  }
}

export default function NotificationsPage() {
  const { user, loading, authFetch, sseEventCount, resetUnreadCount } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [markReadId, setMarkReadId] = useState<string | null>(null);

  async function fetchNotifications() {
    const data = await authFetch('/notifications').then((r) => r.json());
    setNotifications(data);
  }

  // Initial fetch + auth guard
  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }

    fetchNotifications()
      .catch(() => showToast('Failed to load notifications', 'error'))
      .finally(() => setFetchLoading(false));

    resetUnreadCount();
  }, [loading, user]);

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

  if (loading || fetchLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
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
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                'flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-opacity',
                !n.read && 'border-l-4 border-l-primary',
                n.read && 'opacity-50'
              )}
            >
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-sm text-foreground">
                  {n.type !== 'FOLLOW' && n.post ? (
                    <>
                      <Link href={`/users/${n.actor.username}`} className="font-medium hover:text-primary transition-colors">
                        {n.actor.username}
                      </Link>
                      {n.type === 'LIKE' ? ' liked your post ' : ' commented on your post '}
                      <Link href={`/posts/${n.post.id}`} className="font-medium hover:text-primary transition-colors">
                        &ldquo;{n.post.title}&rdquo;
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href={`/users/${n.actor.username}`} className="font-medium hover:text-primary transition-colors">
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
      )}
    </div>
  );
}
