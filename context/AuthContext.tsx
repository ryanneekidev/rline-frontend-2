'use client';

import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { API_URL } from '@/lib/config';
import { useToast } from '@/context/ToastContext';

interface User {
  id: string;
  username: string;
  email: string;
  joinedAt: string;
  role: string;
}

interface AuthError {
  field: string;
  message: string;
}

interface AuthResult {
  success: boolean;
  errors?: AuthError[];
}

interface AuthContextType {
  user: User | null;
  likes: string[];
  unreadCount: number;
  sseEventCount: number;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthResult>;
  register: (username: string, email: string, password: string, confirmedPassword: string) => Promise<AuthResult>;
  logout: () => void;
  authFetch: (path: string, options?: RequestInit) => Promise<Response>;
  getToken: () => string | null;
  setLikes: React.Dispatch<React.SetStateAction<string[]>>;
  resetUnreadCount: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function decodeToken(token: string): User {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [likes, setLikes] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sseEventCount, setSseEventCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  async function refresh(): Promise<boolean> {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json();
    tokenRef.current = data.token;
    setUser(decodeToken(data.token));
    return true;
  }

  // On mount: silent refresh to restore session
  useEffect(() => {
    refresh()
      .then(async (ok) => {
        if (ok && tokenRef.current) {
          const decoded = decodeToken(tokenRef.current);
          const [likesRes, notifRes] = await Promise.all([
            fetch(`${API_URL}/users/${decoded.id}/likes`),
            fetch(`${API_URL}/notifications`, {
              headers: { Authorization: `Bearer ${tokenRef.current}` },
            }),
          ]);
          if (likesRes.ok) {
            const likesData = await likesRes.json();
            setLikes(likesData.map((l: { postId: string }) => l.postId));
          }
          if (notifRes.ok) {
            const notifData = await notifRes.json();
            const count = notifData.filter((n: { read: boolean }) => !n.read).length;
            setUnreadCount(count);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Global SSE stream — opens when logged in, closes on logout
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    async function openStream() {
      const token = tokenRef.current;
      if (!token) return;

      const res = await fetch(`${API_URL}/notifications/stream`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok || !res.body) return;

      reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done || cancelled) break;
        const text = decoder.decode(value);
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.replace('data: ', '').trim());
            setUnreadCount((prev) => prev + 1);
            setSseEventCount((prev) => prev + 1);
            const typeMsg = payload?.type === 'LIKE' ? 'Someone liked your post'
              : payload?.type === 'COMMENT' ? 'Someone commented on your post'
              : payload?.type === 'FOLLOW' ? 'Someone followed you'
              : 'You have a new notification';
            showToast(typeMsg, 'info');
          } catch {}
        }
      }
    }

    openStream();

    return () => {
      cancelled = true;
      reader?.cancel();
    };
  }, [user]);

  async function login(username: string, password: string): Promise<AuthResult> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return {
      success: false,
      errors: data.errors ?? [{ field: 'general', message: data.message ?? 'Login failed. Please try again.' }],
    };
    tokenRef.current = data.token;
    setUser(decodeToken(data.token));
    setLikes(data.likes.map((l: { postId: string }) => l.postId));

    // Fetch initial unread count
    const notifRes = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    if (notifRes.ok) {
      const notifData = await notifRes.json();
      setUnreadCount(notifData.filter((n: { read: boolean }) => !n.read).length);
    }

    return { success: true };
  }

  async function register(
    username: string,
    email: string,
    password: string,
    confirmedPassword: string
  ): Promise<AuthResult> {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, confirmedPassword }),
    });
    const data = await res.json();
    if (!res.ok) return {
      success: false,
      errors: data.errors ?? [{ field: 'general', message: data.message ?? 'Registration failed. Please try again.' }],
    };
    return { success: true };
  }

  function logout() {
    tokenRef.current = null;
    setUser(null);
    setLikes([]);
    setUnreadCount(0);
    setSseEventCount(0);
  }

  function resetUnreadCount() {
    setUnreadCount(0);
  }

  async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    if (tokenRef.current) headers.set('Authorization', `Bearer ${tokenRef.current}`);

    let res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });

    if (res.status === 401 || res.status === 403) {
      const refreshed = await refresh();
      if (refreshed && tokenRef.current) {
        headers.set('Authorization', `Bearer ${tokenRef.current}`);
        res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
      }
    }

    return res;
  }

  function getToken() {
    return tokenRef.current;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        likes,
        unreadCount,
        sseEventCount,
        loading,
        login,
        register,
        logout,
        authFetch,
        getToken,
        setLikes,
        resetUnreadCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
