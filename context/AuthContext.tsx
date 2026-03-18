'use client';

import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { API_URL } from '@/lib/config';

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
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthResult>;
  register: (username: string, email: string, password: string, confirmedPassword: string) => Promise<AuthResult>;
  logout: () => void;
  authFetch: (path: string, options?: RequestInit) => Promise<Response>;
  getToken: () => string | null;
  setLikes: React.Dispatch<React.SetStateAction<string[]>>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function decodeToken(token: string): User {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [likes, setLikes] = useState<string[]>([]);
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

  // On mount, attempt silent refresh to restore session from cookie
  useEffect(() => {
    refresh()
      .then(async (ok) => {
        if (ok && tokenRef.current) {
          const decoded = decodeToken(tokenRef.current);
          const likesRes = await fetch(`${API_URL}/users/${decoded.id}/likes`);
          if (likesRes.ok) {
            const likesData = await likesRes.json();
            setLikes(likesData.map((l: { postId: string }) => l.postId));
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string): Promise<AuthResult> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, errors: data.errors };
    tokenRef.current = data.token;
    setUser(decodeToken(data.token));
    setLikes(data.likes.map((l: { postId: string }) => l.postId));
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
    if (!res.ok) return { success: false, errors: data.errors };
    return { success: true };
  }

  function logout() {
    tokenRef.current = null;
    setUser(null);
    setLikes([]);
  }

  // Attaches Bearer token and retries once with a fresh token on 401/403
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
    <AuthContext.Provider value={{ user, likes, loading, login, register, logout, authFetch, getToken, setLikes }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
