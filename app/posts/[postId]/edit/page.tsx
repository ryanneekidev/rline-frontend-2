'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { API_URL } from '@/lib/config';
import { cn, unescapeHtml } from '@/lib/utils';
import ConfirmDialog from '@/components/ConfirmDialog';

const TITLE_MAX = 150;
const CONTENT_MAX = 5000;

export default function EditPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const { user, loading, authFetch } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }

    fetch(`${API_URL}/posts/${postId}`)
      .then((res) => res.json())
      .then((data) => {
        const post = data.post;
        if (!post) { router.replace('/'); return; }
        if (post.author.id !== user.id) { router.replace(`/posts/${postId}`); return; }
        setTitle(unescapeHtml(post.title));
        setContent(unescapeHtml(post.content));
      })
      .catch(() => { showToast('Failed to load post', 'error'); router.replace('/'); })
      .finally(() => setPageLoading(false));
  }, [user, loading]);

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
    const res = await authFetch(`/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    if (res.ok) {
      showToast('Post updated', 'success');
      router.push(`/posts/${postId}`);
    } else {
      const data = await res.json();
      setErrors(data.errors ?? [{ field: 'general', message: 'Failed to update post' }]);
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    const res = await authFetch(`/posts/${postId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Post deleted', 'success');
      router.push('/');
    } else {
      showToast('Failed to delete post', 'error');
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading || pageLoading) {
    return (
      <div className="flex animate-pulse flex-col gap-4">
        <div className="h-7 w-32 rounded-lg bg-surface" />
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
          <div className="h-10 rounded-lg bg-background" />
          <div className="h-48 rounded-lg bg-background" />
        </div>
      </div>
    );
  }

  const titleError = errors.find((e) => e.field === 'title')?.message;
  const contentError = errors.find((e) => e.field === 'content')?.message;
  const generalError = errors.find((e) => e.field === 'general')?.message;

  return (
    <>
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete post"
          message="Are you sure you want to delete this post? This cannot be undone."
          confirmLabel="Delete"
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-bold text-foreground">Edit Post</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-6">
          {generalError && (
            <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{generalError}</p>
          )}

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex items-center justify-between">
              <p className="min-h-4 text-xs text-destructive">{titleError ?? ''}</p>
              <span className={cn('text-xs', title.length >= TITLE_MAX - 20 ? 'text-destructive' : 'text-muted')}>
                {title.length} / {TITLE_MAX}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              maxLength={CONTENT_MAX}
              className="resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex items-center justify-between">
              <p className="min-h-4 text-xs text-destructive">{contentError ?? ''}</p>
              <span className={cn('text-xs', content.length >= CONTENT_MAX - 20 ? 'text-destructive' : 'text-muted')}>
                {content.length} / {CONTENT_MAX}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-destructive px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              Delete post
            </button>
            <div className="flex items-center gap-3">
              <Link href={`/posts/${postId}`} className="text-sm text-muted transition-colors hover:text-foreground">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
