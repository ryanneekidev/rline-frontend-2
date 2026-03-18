'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/config';

interface ProfileUser {
  id: string;
  username: string;
  joinedAt: string;
  role: string;
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user, authFetch } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followSubmitting, setFollowSubmitting] = useState(false);

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

      const countData = await countRes.json();
      const followCountData = await followCountRes.json();

      setPostCount(countData);
      setFollowerCount(followCountData.followersCount);
      setFollowingCount(followCountData.followingCount);

      if (user && user.username !== username) {
        const isFollowingRes = await authFetch(`/users/${profileData.id}/is-following`);
        const isFollowingData = await isFollowingRes.json();
        setIsFollowing(isFollowingData);
      }

      setLoading(false);
    }

    load().catch(() => { setError('Failed to load profile.'); setLoading(false); });
  }, [username, user]);

  async function toggleFollow() {
    if (!user) { router.push('/login'); return; }
    if (!profile) return;
    setFollowSubmitting(true);

    const path = isFollowing ? '/users/unfollow' : '/users/follow';
    const res = await authFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followingId: profile.id }),
    });

    if (res.ok) {
      setIsFollowing((prev) => !prev);
      setFollowerCount((prev) => prev !== null ? prev + (isFollowing ? -1 : 1) : prev);
    }
    setFollowSubmitting(false);
  }

  if (loading) return <p>Loading...</p>;
  if (error || !profile) return <p>{error ?? 'User not found.'}</p>;

  const isOwnProfile = user?.username === username;

  return (
    <div>
      <a href="/">← Back to feed</a>

      <h1>{profile.username}</h1>
      <p>Role: {profile.role}</p>
      <p>Joined: {new Date(profile.joinedAt).toLocaleDateString()}</p>
      <p>Posts: {postCount ?? '…'}</p>
      <p>Followers: {followerCount ?? '…'} · Following: {followingCount ?? '…'}</p>

      {!isOwnProfile && (
        <button onClick={toggleFollow} disabled={followSubmitting}>
          {followSubmitting ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
        </button>
      )}
    </div>
  );
}
