'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const knownFields = ['username', 'password'];

  function fieldError(field: string) {
    return errors.find((e) => e.field === field)?.message;
  }

  const generalErrors = errors.filter((e) => !knownFields.includes(e.field));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation
    const newErrors: { field: string; message: string }[] = [];
    if (!username.trim()) newErrors.push({ field: 'username', message: 'Username is required' });
    if (!password) newErrors.push({ field: 'password', message: 'Password is required' });
    if (newErrors.length > 0) { setErrors(newErrors); return; }

    setSubmitting(true);
    setErrors([]);
    const result = await login(username, password);
    if (result.success) {
      showToast('Logged in successfully', 'success');
      router.push('/');
    } else {
      setErrors(result.errors ?? []);
    }
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">
      <div className="w-full max-w-[400px] rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Log in to your RLine account</p>
        </div>

        {generalErrors.length > 0 && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            {generalErrors.map((e, i) => (
              <p key={i} className="text-sm text-destructive">{e.message}</p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="username" className="text-sm font-medium text-foreground">
              Username
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your username"
            />
            {fieldError('username') && (
              <p className="text-xs text-destructive">{fieldError('username')}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your password"
            />
            {fieldError('password') && (
              <p className="text-xs text-destructive">{fieldError('password')}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
