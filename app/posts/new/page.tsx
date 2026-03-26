'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

const TITLE_MAX = 150;
const CONTENT_MAX = 5000;

export default function NewPostPage() {
  const { user, loading, authFetch } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function fieldError(field: string) {
    return errors.find((e) => e.field === field)?.message;
  }

  function counterClass(current: number, max: number) {
    if (current > max || current >= max - 20) return 'text-destructive';
    return 'text-muted';
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: { field: string; message: string }[] = [];
    if (!title.trim()) newErrors.push({ field: 'title', message: 'Title is required' });
    else if (title.length > TITLE_MAX) newErrors.push({ field: 'title', message: `Title must be at most ${TITLE_MAX} characters` });
    if (!content.trim()) newErrors.push({ field: 'content', message: 'Content is required' });
    else if (content.length > CONTENT_MAX) newErrors.push({ field: 'content', message: `Content must be at most ${CONTENT_MAX} characters` });
    if (newErrors.length > 0) { setErrors(newErrors); return; }

    setSubmitting(true);
    setErrors([]);
    let mediaKey: string | undefined;
    if (file) {
      try {
        const keyReq = await authFetch('/upload/presign', { method: 'POST' });
        const keyReqJson = await keyReq.json();

        const presignedUrl = keyReqJson.presignedUrl;
        mediaKey = keyReqJson.key;

        const uploadRes = await fetch(presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!uploadRes.ok) throw new Error('S3 upload failed');
      } catch {
        showToast('Failed to upload image. Please try again.', 'error');
        setSubmitting(false);
        return;
      }
    }

    const res = await authFetch('/posts/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, mediaKey }),
    });
    if (res.ok) {
      showToast('Post created!', 'success');
      router.push('/');
    } else {
      const data = await res.json();
      setErrors(data.errors ?? [{ field: 'title', message: 'Failed to create post' }]);
    }
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-foreground">New Post</h1>

      <div className="rounded-xl border border-border bg-surface p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label htmlFor="title" className="text-sm font-medium text-foreground">Title</label>
              <span className={cn('text-xs', counterClass(title.length, TITLE_MAX))}>
                {title.length} / {TITLE_MAX}
              </span>
            </div>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              placeholder="Give your post a title…"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {fieldError('title') && (
              <p className="text-xs text-destructive">{fieldError('title')}</p>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label htmlFor="content" className="text-sm font-medium text-foreground">Content</label>
              <span className={cn('text-xs', counterClass(content.length, CONTENT_MAX))}>
                {content.length} / {CONTENT_MAX}
              </span>
            </div>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              maxLength={CONTENT_MAX}
              placeholder="Write your post…"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {fieldError('content') && (
              <p className="text-xs text-destructive">{fieldError('content')}</p>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label htmlFor="content" className="text-sm font-medium text-foreground">Media</label>
            </div>
            <input
              type='file'
              name="myImage"
              id="media-upload"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {fieldError('content') && (
              <p className="text-xs text-destructive">{fieldError('content')}</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <Link href="/" className="text-sm text-muted transition-colors hover:text-foreground">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
