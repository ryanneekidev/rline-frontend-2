'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { API_URL } from '@/lib/config';
import { cn, formatRelativeTime, formatAbsoluteDate, unescapeHtml } from '@/lib/utils';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; username: string };
}

interface PostDetail {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  likes: number;
  author: { id: string; username: string };
  comments: Comment[];
}

const COMMENT_MAX = 1000;

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { user, likes, setLikes, authFetch } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentErrors, setCommentErrors] = useState<{ field: string; message: string }[]>([]);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  async function fetchPost() {
    const res = await fetch(`${API_URL}/posts/${postId}`);
    const data = await res.json();
    setPost(data.post);
  }

  useEffect(() => {
    fetchPost()
      .catch(() => showToast('Failed to load post', 'error'))
      .finally(() => setLoading(false));
  }, [postId]);

  async function toggleLike() {
    if (!user) { router.push('/login'); return; }
    if (!post) return;
    setLikeLoading(true);
    const liked = likes.includes(post.id);
    const res = await authFetch(`/posts/${post.id}/${liked ? 'dislike' : 'like'}`, { method: 'POST' });
    if (res.ok) {
      setPost((prev) => prev ? { ...prev, likes: liked ? prev.likes - 1 : prev.likes + 1 } : prev);
      setLikes((prev) => liked ? prev.filter((id) => id !== post.id) : [...prev, post.id]);
    } else {
      showToast('Failed to update like', 'error');
    }
    setLikeLoading(false);
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: { field: string; message: string }[] = [];
    if (!commentContent.trim()) newErrors.push({ field: 'content', message: 'Comment cannot be empty' });
    else if (commentContent.length > COMMENT_MAX) newErrors.push({ field: 'content', message: `Comment must be at most ${COMMENT_MAX} characters` });
    if (newErrors.length > 0) { setCommentErrors(newErrors); return; }

    setCommentSubmitting(true);
    setCommentErrors([]);
    const res = await authFetch(`/posts/${postId}/comments/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentContent }),
    });
    if (res.ok) {
      await fetchPost();
      setCommentContent('');
      showToast('Comment posted', 'success');
    } else {
      const data = await res.json();
      setCommentErrors(data.errors ?? [{ field: 'content', message: 'Failed to post comment' }]);
    }
    setCommentSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-4 w-20 rounded-lg bg-surface" />
        <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4">
          <div className="h-7 w-2/3 rounded-lg bg-background" />
          <div className="h-4 w-1/3 rounded-lg bg-background" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 rounded-lg bg-background" style={{ width: `${95 - i * 8}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Post not found.</p>
        <Link href="/" className="mt-3 inline-block text-sm text-primary hover:underline">← Back to feed</Link>
      </div>
    );
  }

  const liked = likes.includes(post.id);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to feed
      </Link>

      {/* Post */}
      <article className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
        <h1 className="text-xl font-bold text-foreground">{unescapeHtml(post.title)}</h1>

        <p className="text-sm text-muted">
          <Link href={`/users/${post.author.username}`} className="font-medium text-foreground transition-colors hover:text-primary">
            {post.author.username}
          </Link>
          {' · '}
          {formatRelativeTime(post.createdAt)}
          {' '}
          <span>({formatAbsoluteDate(post.createdAt)})</span>
        </p>

        <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
          {unescapeHtml(post.content)}
        </p>

        <div className="border-t border-border pt-3">
          <button
            onClick={toggleLike}
            disabled={likeLoading}
            className={cn(
              'flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50',
              liked ? 'text-primary' : 'text-muted hover:text-primary'
            )}
          >
            <Heart className={cn('h-4 w-4', liked && 'fill-primary')} />
            <span>{post.likes} {post.likes === 1 ? 'like' : 'likes'}</span>
          </button>
        </div>
      </article>

      {/* Comments */}
      <section id="comments" className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">
          Comments ({post.comments.length})
        </h2>

        {post.comments.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">No comments yet. Start the conversation.</p>
        )}

        <div className="flex flex-col gap-3">
          {post.comments.map((comment) => (
            <div key={comment.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
              <p className="text-sm text-muted">
                <Link href={`/users/${comment.author.username}`} className="font-medium text-foreground transition-colors hover:text-primary">
                  {comment.author.username}
                </Link>
                {' · '}
                {formatRelativeTime(comment.createdAt)}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {unescapeHtml(comment.content)}
              </p>
            </div>
          ))}
        </div>

        {/* Comment form */}
        <div className="rounded-xl border border-border bg-surface p-4">
          {user ? (
            <form onSubmit={handleCommentSubmit} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground">Leave a comment</h3>
              <div className="flex flex-col gap-1">
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  rows={4}
                  maxLength={COMMENT_MAX}
                  placeholder="Write your comment…"
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex items-center justify-between">
                  <div>
                    {commentErrors.map((err, i) => (
                      <p key={i} className="text-xs text-destructive">{err.message}</p>
                    ))}
                  </div>
                  <span className={cn('text-xs', commentContent.length >= COMMENT_MAX - 20 ? 'text-destructive' : 'text-muted')}>
                    {commentContent.length} / {COMMENT_MAX}
                  </span>
                </div>
              </div>
              <button
                type="submit"
                disabled={commentSubmitting}
                className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {commentSubmitting ? 'Posting…' : 'Post comment'}
              </button>
            </form>
          ) : (
            <p className="text-center text-sm text-muted">
              <Link href="/login" className="font-medium text-primary hover:underline">Log in</Link>
              {' '}to leave a comment.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
