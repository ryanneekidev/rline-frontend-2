'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { API_URL } from '@/lib/config';
import PostCard, { type Post } from '@/components/PostCard';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 10;
type FeedTab = 'global' | 'following';

export default function Home() {
  const { user, loading, likes, setLikes, authFetch } = useAuth();
  const { showToast } = useToast();

  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);
  const [tab, setTab] = useState<FeedTab>('global');
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Fetch posts
  useEffect(() => {
    setFeedLoading(true);
    fetch(`${API_URL}/posts/all`)
      .then((res) => res.json())
      .then((data) => setPosts(data.posts))
      .catch(() => showToast('Failed to load posts', 'error'))
      .finally(() => setFeedLoading(false));
  }, []);

  // Fetch following list when user is available
  useEffect(() => {
    if (!user) return;
    authFetch(`/users/${user.id}/following`)
      .then((res) => res.json())
      .then((data: { id: string }[]) => setFollowingIds(data.map((u) => u.id)))
      .catch(() => {});
  }, [user]);

  // Reset to page 1 when tab changes
  useEffect(() => {
    setPage(1);
  }, [tab]);

  const displayedPosts =
    tab === 'following' && user
      ? posts.filter((p) => followingIds.includes(p.author.id))
      : posts;

  const totalPages = Math.max(1, Math.ceil(displayedPosts.length / PAGE_SIZE));
  const pagePosts = displayedPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function toggleLike(post: Post) {
    if (!user) { window.location.href = '/login'; return; }
    setLikeLoadingId(post.id);
    const liked = likes.includes(post.id);
    const res = await authFetch(`/posts/${post.id}/${liked ? 'dislike' : 'like'}`, { method: 'POST' });
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) => p.id === post.id ? { ...p, likes: liked ? p.likes - 1 : p.likes + 1 } : p)
      );
      setLikes((prev) => liked ? prev.filter((id) => id !== post.id) : [...prev, post.id]);
    } else {
      showToast('Failed to update like', 'error');
    }
    setLikeLoadingId(null);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-surface border border-border" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Feed tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setTab('global')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'global'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          Global
        </button>
        {user && (
          <button
            onClick={() => setTab('following')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === 'following'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            Following
          </button>
        )}
      </div>

      {/* Post list */}
      {feedLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-surface border border-border" />
          ))}
        </div>
      ) : pagePosts.length === 0 ? (
        <p className="py-12 text-center text-muted">
          {tab === 'following'
            ? 'No posts from people you follow yet.'
            : 'No posts yet. Be the first to post!'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {pagePosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liked={likes.includes(post.id)}
              likeLoading={likeLoadingId === post.id}
              onLike={() => toggleLike(post)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!feedLoading && pagePosts.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
