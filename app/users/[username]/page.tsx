'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { API_URL } from '@/lib/config';
import { formatAbsoluteDate } from '@/lib/utils';
import PostCard, { type Post } from '@/components/PostCard';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';

interface ProfileUser {
  id: string;
  username: string;
  joinedAt: string;
  role: string;
}

interface FollowUser {
  id: string;
  username: string;
}

const PAGE_SIZE = 10;

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user, likes, setLikes, authFetch, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Modals
  const [modal, setModal] = useState<'followers' | 'following' | null>(null);
  const [modalUsers, setModalUsers] = useState<FollowUser[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalFollowingIds, setModalFollowingIds] = useState<string[]>([]);
  const [modalFollowLoading, setModalFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const userRes = await fetch(`${API_URL}/users/username/${username}`);
      if (!userRes.ok) { setError('User not found.'); setLoading(false); return; }
      const userData = await userRes.json();
      const profileData: ProfileUser = userData.user;
      setProfile(profileData);

      const [countRes, followCountRes] = await Promise.all([
        fetch(`${API_URL}/users/${profileData.id}/posts/count`),
        fetch(`${API_URL}/users/${profileData.id}/follow-counts`),
      ]);
      setPostCount(await countRes.json());
      const followCountData = await followCountRes.json();
      setFollowerCount(followCountData.followersCount);
      setFollowingCount(followCountData.followingCount);

      if (user && user.username !== username) {
        const isFollowingRes = await authFetch(`/users/${profileData.id}/is-following`);
        setIsFollowing(await isFollowingRes.json());
      }

      setLoading(false);
    }
    load().catch(() => { setError('Failed to load profile.'); setLoading(false); });
  }, [username, user]);

  // Fetch user's posts
  useEffect(() => {
    if (!profile) return;
    setPostsLoading(true);
    fetch(`${API_URL}/posts/all`)
      .then((res) => res.json())
      .then((data) => {
        const userPosts = (data.posts as Post[]).filter((p) => p.author.id === profile.id);
        setPosts(userPosts);
      })
      .catch(() => showToast('Failed to load posts', 'error'))
      .finally(() => setPostsLoading(false));
  }, [profile]);

  function handleLogout() {
    logout();
    router.push('/');
  }

  async function toggleFollow() {
    if (!user) { router.push('/login'); return; }
    if (!profile) return;
    setFollowLoading(true);
    const path = isFollowing ? '/users/unfollow' : '/users/follow';
    const res = await authFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followingId: profile.id }),
    });
    if (res.ok) {
      setIsFollowing((prev) => !prev);
      setFollowerCount((prev) => prev !== null ? prev + (isFollowing ? -1 : 1) : prev);
      showToast(isFollowing ? 'Unfollowed' : `Following ${profile.username}`, 'success');
    } else {
      showToast('Failed to update follow', 'error');
    }
    setFollowLoading(false);
  }

  async function openModal(type: 'followers' | 'following') {
    if (!profile) return;
    setModal(type);
    setModalLoading(true);
    const path = type === 'followers'
      ? `/users/${profile.id}/followers`
      : `/users/${profile.id}/following`;
    const res = await fetch(`${API_URL}${path}`);
    const data = await res.json();
    setModalUsers(data);

    // Fetch current user's following list for follow/unfollow buttons in modal
    if (user) {
      const followingRes = await authFetch(`/users/${user.id}/following`);
      const followingData: FollowUser[] = await followingRes.json();
      setModalFollowingIds(followingData.map((u) => u.id));
    }
    setModalLoading(false);
  }

  async function toggleModalFollow(targetId: string) {
    if (!user) return;
    setModalFollowLoading(targetId);
    const isFollowingTarget = modalFollowingIds.includes(targetId);
    const path = isFollowingTarget ? '/users/unfollow' : '/users/follow';
    const res = await authFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followingId: targetId }),
    });
    if (res.ok) {
      setModalFollowingIds((prev) =>
        isFollowingTarget ? prev.filter((id) => id !== targetId) : [...prev, targetId]
      );
    }
    setModalFollowLoading(null);
  }

  async function toggleLike(post: Post) {
    if (!user) { router.push('/login'); return; }
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

  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const pagePosts = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isOwn = user?.username === username;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-background" />
            <div className="flex flex-col gap-2">
              <div className="h-6 w-32 rounded-lg bg-background" />
              <div className="h-4 w-48 rounded-lg bg-background" />
            </div>
          </div>
          <div className="h-4 w-64 rounded-lg bg-background" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted">{error ?? 'User not found.'}</p>
        <Link href="/" className="mt-3 inline-block text-sm text-primary hover:underline">← Back to feed</Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Profile header */}
        <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
                {profile.username[0].toUpperCase()}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{profile.username}</h1>
                  {profile.role !== 'USER' && (
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary dark:bg-primary-muted">
                      {profile.role}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted">Member since {formatAbsoluteDate(profile.joinedAt)}</p>
              </div>
            </div>

            {/* Follow / own profile actions */}
            {!isOwn && user && (
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {followLoading ? '…' : isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
            {isOwn && (
              <button
                onClick={handleLogout}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-background"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 border-t border-border pt-4 text-sm">
            <span className="text-foreground">
              <span className="font-semibold">{postCount ?? '…'}</span>{' '}
              <span className="text-muted">{postCount === 1 ? 'post' : 'posts'}</span>
            </span>
            <button
              onClick={() => openModal('followers')}
              className="text-foreground transition-colors hover:text-primary"
            >
              <span className="font-semibold">{followerCount ?? '…'}</span>{' '}
              <span className="text-muted">{followerCount === 1 ? 'follower' : 'followers'}</span>
            </button>
            <button
              onClick={() => openModal('following')}
              className="text-foreground transition-colors hover:text-primary"
            >
              <span className="font-semibold">{followingCount ?? '…'}</span>{' '}
              <span className="text-muted">following</span>
            </button>
          </div>
        </div>

        {/* Posts */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">Posts</h2>
          {postsLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-surface" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No posts yet.</p>
          ) : (
            <>
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
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      {/* Followers / Following modal */}
      {modal && (
        <Modal
          title={modal === 'followers' ? 'Followers' : 'Following'}
          onClose={() => setModal(null)}
        >
          {modalLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-background" />
              ))}
            </div>
          ) : modalUsers.length === 0 ? (
            <p className="text-center text-sm text-muted py-4">
              {modal === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {modalUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3">
                  <Link
                    href={`/users/${u.username}`}
                    onClick={() => setModal(null)}
                    className="text-sm font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {u.username}
                  </Link>
                  {user && user.id !== u.id && (
                    <button
                      onClick={() => toggleModalFollow(u.id)}
                      disabled={modalFollowLoading === u.id}
                      className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      {modalFollowLoading === u.id
                        ? '…'
                        : modalFollowingIds.includes(u.id) ? 'Unfollow' : 'Follow'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
