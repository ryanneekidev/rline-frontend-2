'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/config';

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  likes: number;
  author: { id: string; username: string };
  comments: { id: string }[];
}

export default function Home() {
  const { user, likes, setLikes, logout, loading, authFetch } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/posts/all`)
      .then((res) => res.json())
      .then((data) => setPosts(data.posts))
      .catch(() => setFeedError('Failed to load posts.'))
      .finally(() => setFeedLoading(false));
  }, []);

  async function toggleLike(post: Post) {
    if (!user) {
      router.push('/login');
      return;
    }

    const liked = likes.includes(post.id);
    const path = liked ? `/posts/${post.id}/dislike` : `/posts/${post.id}/like`;
    const res = await authFetch(path, { method: 'POST' });
    if (!res.ok) return;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, likes: liked ? p.likes - 1 : p.likes + 1 } : p
      )
    );
    setLikes((prev) =>
      liked ? prev.filter((id) => id !== post.id) : [...prev, post.id]
    );
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <header>
        <strong>RLine</strong>
        {user ? (
          <span>
            {' '}| Logged in as <a href={`/users/${user.username}`}>{user.username}</a>
            {' '}| <a href="/notifications">Notifications</a>
            {' '}<button onClick={handleLogout}>Logout</button>
          </span>
        ) : (
          <span>
            {' '}| <a href="/login">Login</a> | <a href="/register">Register</a>
          </span>
        )}
      </header>

      {user && <a href="/posts/new">+ New post</a>}

      <hr />

      {feedLoading && <p>Loading posts...</p>}
      {feedError && <p>{feedError}</p>}

      {!feedLoading && !feedError && posts.length === 0 && <p>No posts yet.</p>}

      {posts.map((post) => {
        const liked = likes.includes(post.id);
        return (
          <div key={post.id}>
            <a href={`/posts/${post.id}`}>
              <strong>{post.title}</strong>
            </a>
            <p>
              by <a href={`/users/${post.author.username}`}>{post.author.username}</a>
              {' · '}
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
            <p>
              <button onClick={() => toggleLike(post)}>
                {liked ? 'Unlike' : 'Like'}
              </button>
              {' '}{post.likes} {post.likes === 1 ? 'like' : 'likes'}
              {' · '}
              {post.comments.length} {post.comments.length === 1 ? 'comment' : 'comments'}
            </p>
            <hr />
          </div>
        );
      })}
    </div>
  );
}
