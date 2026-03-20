'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Sun, Moon, Home, User, LogOut, LogIn, UserPlus, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, unreadCount, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleLogout() {
    await logout();
    setProfileOpen(false);
    router.push('/');
  }

  const isCreate = pathname === '/posts/new';
  const isNotifications = pathname === '/notifications';
  const isProfile = user ? pathname === `/users/${user.username}` : false;

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[800px] items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link href="/" className="text-lg font-bold text-primary">
          RLine
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {user ? (
            <>
              {/* Create */}
              <Link
                href="/posts/new"
                aria-label="Create post"
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                  isCreate ? 'text-primary' : 'text-foreground hover:text-primary'
                )}
              >
                <Plus className="h-5 w-5" />
              </Link>

              {/* Notification bell */}
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors"
              >
                <Bell className={cn('h-5 w-5', isNotifications ? 'text-primary' : 'text-foreground hover:text-primary')} />
                {unreadCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Avatar + dropdown */}
              <div className="relative ml-1" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white transition-opacity hover:opacity-85',
                    isProfile && 'ring-2 ring-primary ring-offset-2 ring-offset-surface'
                  )}
                >
                  {user.username[0].toUpperCase()}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-10 w-48 rounded-xl border border-border bg-surface shadow-lg">
                    <Link
                      href="/"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-background"
                    >
                      <Home className="h-4 w-4" /> Home
                    </Link>
                    <Link
                      href={`/users/${user.username}`}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-background"
                    >
                      <User className="h-4 w-4" /> Profile
                    </Link>
                    <button
                      onClick={toggleTheme}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-background"
                    >
                      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                    <div className="border-t border-border" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-b-xl px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-background"
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium transition-colors',
                  pathname === '/login' ? 'text-primary' : 'text-foreground hover:text-primary'
                )}
              >
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
              <Link
                href="/register"
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium transition-colors',
                  pathname === '/register' ? 'text-primary' : 'text-foreground hover:text-primary'
                )}
              >
                <UserPlus className="h-4 w-4" /> Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
