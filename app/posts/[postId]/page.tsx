'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/config';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; username: string };
}

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  likes: number;
  author: { id: string; username: string };
  comments: Comment[];
}

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { user, likes, setLikes, authFetch } = useAuth();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentContent, setCommentContent] = useState('');
  const [commentErrors, setCommentErrors] = useState<{ field: string; message: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/posts/${postId}`)
      .then((res) => res.json())
      .then((data) => setPost(data.post))
      .catch(() => setError('Failed to load post.'))
      .finally(() => setLoading(false));
  }, [postId]);

  async function toggleLike() {
    if (!user) { router.push('/login'); return; }
    if (!post) return;

    const liked = likes.includes(post.id);
    const path = liked ? `/posts/${post.id}/dislike` : `/posts/${post.id}/like`;
    const res = await authFetch(path, { method: 'POST' });
    if (!res.ok) return;

    setPost((prev) => prev ? { ...prev, likes: liked ? prev.likes - 1 : prev.likes + 1 } : prev);
    setLikes((prev) => liked ? prev.filter((id) => id !== post.id) : [...prev, post.id]);
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!post) return;
    setSubmitting(true);
    setCommentErrors([]);

    const res = await authFetch(`/posts/${post.id}/comments/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentContent }),
    });
    const data = await res.json();

    if (!res.ok) {
      setCommentErrors(data.errors ?? []);
    } else {
      const refreshed = await fetch(`${API_URL}/posts/${postId}`).then((r) => r.json());
      setPost(refreshed.post);
      setCommentContent('');
    }
    setSubmitting(false);
  }

  if (loading) return <p>Loading...</p>;
  if (error || !post) return <p>{error ?? 'Post not found.'}</p>;

  const liked = likes.includes(post.id);

  return (
    <div>
      <a href="/">← Back to feed</a>

      <h1>{post.title}</h1>
      <p>
        by <a href={`/users/${post.author.username}`}>{post.author.username}</a>
        {' · '}
        {new Date(post.createdAt).toLocaleDateString()}
      </p>
      <p>{post.content}</p>
      <p>
        <button onClick={toggleLike}>{liked ? 'Unlike' : 'Like'}</button>
        {' '}{post.likes} {post.likes === 1 ? 'like' : 'likes'}
      </p>

      <hr />

      <h2>Comments ({post.comments.length})</h2>

      {post.comments.length === 0 && <p>No comments yet.</p>}

      {post.comments.map((comment) => (
        <div key={comment.id}>
          <p>
            <a href={`/users/${comment.author.username}`}>{comment.author.username}</a>
            {' · '}
            {new Date(comment.createdAt).toLocaleDateString()}
          </p>
          <p>{comment.content}</p>
          <hr />
        </div>
      ))}

      {user ? (
        <form onSubmit={handleCommentSubmit}>
          <h3>Leave a comment</h3>
          <textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            rows={3}
          />
          {commentErrors.map((err, i) => (
            <p key={i} style={{ color: 'red' }}>{err.field}: {err.message}</p>
          ))}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Posting...' : 'Post comment'}
          </button>
        </form>
      ) : (
        <p><a href="/login">Login</a> to leave a comment.</p>
      )}
    </div>
  );
}
