'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/config';

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
  const { user, loading, authFetch, getToken } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // Fetch existing notification backlog
  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }

    authFetch('/notifications')
      .then((res) => res.json())
      .then((data) => setNotifications(data))
      .catch(() => setError('Failed to load notifications.'))
      .finally(() => setFetchLoading(false));
  }, [loading, user]);

  // Open SSE stream
  useEffect(() => {
    if (loading || !user) return;

    let cancelled = false;

    async function openStream() {
      const token = getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/notifications/stream`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();

      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done || cancelled) break;

        const text = decoder.decode(value);
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            JSON.parse(line.replace('data: ', '').trim()); // confirm valid SSE event
            // SSE payload lacks joined actor/post — refetch the full list
            const refreshed = await authFetch('/notifications').then((r) => r.json());
            setNotifications(refreshed);
          } catch {}
        }
      }
    }

    openStream();

    return () => {
      cancelled = true;
      readerRef.current?.cancel();
    };
  }, [loading, user]);

  async function markRead(id: string) {
    const res = await authFetch(`/notifications/${id}/read`, { method: 'PATCH' });
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  }

  async function markAllRead() {
    const res = await authFetch('/notifications/read-all', { method: 'PATCH' });
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  if (loading || fetchLoading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <a href="/">← Back to feed</a>
      <h1>Notifications</h1>

      {notifications.length > 0 && (
        <button onClick={markAllRead}>Mark all as read</button>
      )}

      {notifications.length === 0 && <p>No notifications yet.</p>}

      {notifications.map((n) => (
        <div key={n.id} style={{ opacity: n.read ? 0.5 : 1 }}>
          <p>{notificationText(n)}</p>
          <p>{new Date(n.createdAt).toLocaleDateString()}</p>
          {!n.read && (
            <button onClick={() => markRead(n.id)}>Mark as read</button>
          )}
          <hr />
        </div>
      ))}
    </div>
  );
}
