'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function NewPostPage() {
  const { user, loading, authFetch } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <p>Loading...</p>;
  if (!user) {
    router.push('/login');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const res = await authFetch('/posts/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    const data = await res.json();

    if (!res.ok) {
      setErrors(data.errors ?? []);
      setSubmitting(false);
      return;
    }

    router.push('/');
  }

  return (
    <div>
      <a href="/">← Back to feed</a>
      <h1>New Post</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Title</label>
          <br />
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label htmlFor="content">Content</label>
          <br />
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            style={{ width: '100%' }}
          />
        </div>
        {errors.map((err, i) => (
          <p key={i} style={{ color: 'red' }}>{err.field}: {err.message}</p>
        ))}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Posting...' : 'Create post'}
        </button>
      </form>
    </div>
  );
}
