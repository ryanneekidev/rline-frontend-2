'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  if (loading) return <p>Loading...</p>;

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div>
      {user ? (
        <>
          <p>Logged in as <strong>{user.username}</strong> ({user.role})</p>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <p>Not logged in</p>
          <a href="/login">Login</a>
          {' | '}
          <a href="/register">Register</a>
        </>
      )}
    </div>
  );
}
