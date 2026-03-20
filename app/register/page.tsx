'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

const USERNAME_MAX = 20;

export default function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmedPassword, setConfirmedPassword] = useState('');
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const knownFields = ['username', 'email', 'password', 'confirmedPassword'];

  function fieldError(field: string) {
    return errors.find((e) => e.field === field)?.message;
  }

  const generalErrors = errors.filter((e) => !knownFields.includes(e.field));

  function counterClass(current: number, max: number) {
    if (current > max) return 'text-destructive';
    if (current >= max - 20) return 'text-destructive';
    return 'text-muted';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation
    const newErrors: { field: string; message: string }[] = [];
    if (!username.trim()) newErrors.push({ field: 'username', message: 'Username is required' });
    else if (username.length < 3) newErrors.push({ field: 'username', message: 'Username must be at least 3 characters' });
    else if (username.length > 20) newErrors.push({ field: 'username', message: 'Username must be at most 20 characters' });
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) newErrors.push({ field: 'username', message: 'Username can only contain letters, numbers, and underscores' });
    if (!email.trim()) newErrors.push({ field: 'email', message: 'Email is required' });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.push({ field: 'email', message: 'Must be a valid email address' });
    if (!password) newErrors.push({ field: 'password', message: 'Password is required' });
    else if (password.length < 8) newErrors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    if (password !== confirmedPassword) newErrors.push({ field: 'confirmedPassword', message: 'Passwords do not match' });
    if (newErrors.length > 0) { setErrors(newErrors); return; }

    setSubmitting(true);
    setErrors([]);
    const result = await register(username, email, password, confirmedPassword);
    if (result.success) {
      showToast('Account created!', 'success');
      router.push('/login');
    } else {
      setErrors(result.errors ?? []);
    }
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-full items-center justify-center py-8">
      <div className="w-full max-w-[400px] rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Create an account</h1>
          <p className="mt-1 text-sm text-muted">Join RLine today</p>
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
            <div className="flex items-center justify-between">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                Username
              </label>
              <span className={`text-xs ${counterClass(username.length, USERNAME_MAX)}`}>
                {username.length} / {USERNAME_MAX}
              </span>
            </div>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              maxLength={USERNAME_MAX}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. john_doe"
            />
            {fieldError('username') && (
              <p className="text-xs text-destructive">{fieldError('username')}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
            />
            {fieldError('email') && (
              <p className="text-xs text-destructive">{fieldError('email')}</p>
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
              autoComplete="new-password"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="At least 8 characters"
            />
            {fieldError('password') && (
              <p className="text-xs text-destructive">{fieldError('password')}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirmedPassword" className="text-sm font-medium text-foreground">
              Confirm password
            </label>
            <input
              id="confirmedPassword"
              type="password"
              value={confirmedPassword}
              onChange={(e) => setConfirmedPassword(e.target.value)}
              autoComplete="new-password"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Repeat your password"
            />
            {fieldError('confirmedPassword') && (
              <p className="text-xs text-destructive">{fieldError('confirmedPassword')}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
