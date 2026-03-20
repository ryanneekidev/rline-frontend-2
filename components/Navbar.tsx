'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Sun, Moon, Menu, X, Home, PenSquare, User, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

function NavLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 text-sm font-medium transition-colors',
        active ? 'text-primary' : 'text-foreground hover:text-primary'
      )}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary-light text-primary dark:bg-primary-muted'
          : 'text-foreground hover:bg-background hover:text-primary'
      )}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, unreadCount, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleLogout() {
    logout();
    setProfileOpen(false);
    closeMenu();
    router.push('/');
  }

  const isHome = pathname === '/';
  const isCreate = pathname === '/posts/new';
  const isProfile = user ? pathname === `/users/${user.username}` : false;
  const isNotifications = pathname === '/notifications';

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[800px] items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link href="/" className="text-lg font-bold text-primary">
          RLine
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 sm:flex">
          <NavLink href="/" active={isHome}><Home className="h-4 w-4" /> Home</NavLink>
          <NavLink href="/posts/new" active={isCreate}><PenSquare className="h-4 w-4" /> Create</NavLink>

          {user ? (
            <>
              {/* Notification bell */}
              <Link href="/notifications" className="relative">
                <Bell className={cn('h-5 w-5 transition-colors', isNotifications ? 'text-primary' : 'text-foreground hover:text-primary')} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile avatar dropdown */}
              <div className="relative" ref={profileRef}>
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
                  <div className="absolute right-0 top-10 w-44 rounded-xl border border-border bg-surface shadow-lg">
                    <Link
                      href={`/users/${user.username}`}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-background"
                    >
                      <User className="h-4 w-4" /> Profile
                    </Link>
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
              <NavLink href="/login" active={pathname === '/login'}><LogIn className="h-4 w-4" /> Sign in</NavLink>
              <NavLink href="/register" active={pathname === '/register'}><UserPlus className="h-4 w-4" /> Sign up</NavLink>
            </>
          )}

          <button
            onClick={toggleTheme}
            className="text-foreground transition-colors hover:text-primary"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex items-center gap-3 sm:hidden">
          <button
            onClick={toggleTheme}
            className="text-foreground transition-colors hover:text-primary"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="text-foreground transition-colors hover:text-primary"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 top-16 z-30" onClick={closeMenu} />
          <div className="absolute left-0 right-0 z-40 border-b border-border bg-surface px-4 py-3 sm:hidden">
            <div className="flex flex-col gap-1">
              <MobileNavLink href="/" active={isHome} onClick={closeMenu}>
                <Home className="h-4 w-4" /> Home
              </MobileNavLink>
              <MobileNavLink href="/posts/new" active={isCreate} onClick={closeMenu}>
                <PenSquare className="h-4 w-4" /> Create
              </MobileNavLink>
              {user ? (
                <>
                  <MobileNavLink href={`/users/${user.username}`} active={isProfile} onClick={closeMenu}>
                    <User className="h-4 w-4" /> Profile
                  </MobileNavLink>
                  <MobileNavLink href="/notifications" active={isNotifications} onClick={closeMenu}>
                    <Bell className="h-4 w-4" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </MobileNavLink>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-background"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              ) : (
                <>
                  <MobileNavLink href="/login" active={pathname === '/login'} onClick={closeMenu}>
                    <LogIn className="h-4 w-4" /> Sign in
                  </MobileNavLink>
                  <MobileNavLink href="/register" active={pathname === '/register'} onClick={closeMenu}>
                    <UserPlus className="h-4 w-4" /> Sign up
                  </MobileNavLink>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
