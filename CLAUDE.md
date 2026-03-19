# CLAUDE.md — RLine Frontend

## Project Overview

RLine is a full-featured social media platform built as a portfolio project by Ryan Neeki (sole engineer). This is the **frontend** repository.

- **Live frontend**: https://rline.ryanneeki.xyz
- **Live API**: https://api.rline.ryanneeki.xyz
- **Backend repo**: separate repository (Express 5 / Prisma / PostgreSQL)

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Font | Inter (via `next/font/google`) |
| Icons | lucide-react |
| Utilities | clsx, tailwind-merge |

---

## Running the Project

```bash
npm install     # install deps
npm run dev     # development server (localhost:3000)
npm run build   # production build
npm start       # start production server
```

### Environment Variables

| File | Variable | Value |
|---|---|---|
| `.env.development` | `NEXT_PUBLIC_API_URL` | `http://localhost:4000` |
| `.env.production` | `NEXT_PUBLIC_API_URL` | `https://api.rline.ryanneeki.xyz` |

Both files are committed (no secrets — just API URLs). Consumed via `lib/config.ts`:
```ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL;
```

---

## File Structure

```
app/
├── layout.tsx                    # Root layout: providers, navbar, Inter font, FOUC prevention
├── globals.css                   # Tailwind import, CSS variables, dark mode, toast animation
├── page.tsx                      # Home feed (Global / Following tabs, pagination)
├── login/page.tsx
├── register/page.tsx
├── posts/
│   ├── new/page.tsx              # Create post (auth-guarded)
│   └── [postId]/page.tsx         # Post detail + comments
├── users/[username]/page.tsx     # User profile
└── notifications/page.tsx        # Notifications (auth-guarded)

components/
├── Navbar.tsx                    # Persistent top nav (desktop + mobile hamburger)
├── PostCard.tsx                  # Post preview card
├── Pagination.tsx                # Previous / page numbers / Next
├── Modal.tsx                     # Generic overlay (followers/following lists)
└── ConfirmDialog.tsx             # Destructive action confirmation

context/
├── ThemeContext.tsx               # Dark/light mode (localStorage + system preference)
├── AuthContext.tsx                # Auth state, token, SSE stream, unread count
└── ToastContext.tsx               # Global toast notifications (success / error / info)

lib/
├── config.ts                     # API_URL export
└── utils.ts                      # cn(), formatRelativeTime(), formatAbsoluteDate(), unescapeHtml()
```

---

## Design System

### Color Palette

**Primary — Deep Ruby**
| Token | Hex | Usage |
|---|---|---|
| `primary` | `#BE123C` | Buttons, active links, key accents |
| `primary-hover` | `#9F1239` | Button hover state |
| `primary-light` | `#FFE4E6` | Tinted backgrounds, badges (light mode) |
| `primary-muted` | `#4C0519` | Tinted backgrounds, badges (dark mode) |

**Light Mode**
| Token | Hex |
|---|---|
| `background` | `#FAFAFA` |
| `surface` | `#FFFFFF` |
| `border` | `#E5E7EB` |
| `foreground` | `#111827` |
| `muted` | `#6B7280` |
| `success` | `#16A34A` |
| `destructive` | `#DC2626` |

**Dark Mode**
| Token | Hex |
|---|---|
| `background` | `#0A0A0A` |
| `surface` | `#171717` |
| `border` | `#262626` |
| `foreground` | `#F5F5F5` |
| `muted` | `#A3A3A3` |
| `success` | `#4ADE80` |
| `destructive` | `#F87171` |

Colors are defined as CSS variables in `globals.css` and mapped into Tailwind via `@theme inline`.

### Dark Mode Implementation

- Default: system preference (`prefers-color-scheme`)
- Toggle persisted to `localStorage`
- Strategy: `dark` class on `<html>` via Tailwind's `@custom-variant dark (&:where(.dark, .dark *))`
- FOUC prevented by an inline `<script>` in `<head>` that reads `localStorage` and sets the class before React hydrates
- `<html suppressHydrationWarning>` suppresses the class mismatch warning

---

## Provider Order

```tsx
<ThemeProvider>
  <ToastProvider>       ← must be above AuthProvider so AuthContext can call showToast
    <AuthProvider>
      <Navbar />
      <main>{children}</main>
    </AuthProvider>
  </ToastProvider>
</ThemeProvider>
```

**Critical**: `ToastProvider` must wrap `AuthProvider`. `AuthContext` uses `useToast()` to fire info toasts when SSE events arrive.

---

## AuthContext

Key design decisions:

- **Token in `useRef`** (not state) to avoid closure staleness in `authFetch`
- **Silent refresh on mount**: calls `POST /auth/refresh` with the HTTP-only cookie; sets user + token if successful
- **Likes array**: fetched on login/refresh, kept in sync locally on like/unlike to avoid refetching
- **Global SSE stream**: opened when `user` is set, closed on logout. Manages the navbar unread badge across all pages. Pages do not open their own SSE connections — they watch `sseEventCount` instead.
- **`sseEventCount`**: incremented on every SSE event. Pages like `/notifications` use this as a `useEffect` dependency to refetch.
- **Info toast on SSE**: fires `showToast('Someone liked your post', 'info')` etc., parsed from the `type` field in the SSE payload.

Exported values:
```ts
{ user, likes, unreadCount, sseEventCount, loading,
  login, register, logout, authFetch, getToken, setLikes, resetUnreadCount }
```

---

## Toast System

Three types with auto-dismiss:
| Type | Style | Duration |
|---|---|---|
| `success` | Green (`bg-success text-white`) | 3s |
| `error` | Red (`bg-destructive text-white`) | 4s |
| `info` | Neutral (`bg-foreground text-background`) | 3s |

- Max one toast at a time — new toast replaces current
- Position: top-right on desktop, top-center on mobile
- Slides in from top via `toast-animate` CSS class (defined in `globals.css`)
- Info toasts fired automatically by `AuthContext` on incoming SSE events

---

## Navigation

**Desktop** (≥640px): Logo · Home · Create · Bell (with unread badge) · Avatar dropdown · Theme toggle

The avatar dropdown (shown when logged in) contains:
- Profile link → `/users/[username]`
- Separator
- Logout button

**Mobile** (<640px): Logo · Theme toggle · Hamburger → vertical dropdown with all links + logout

---

## Pages

### Auth (`/login`, `/register`)

- Centered card, max-width 400px
- Client-side validation fires before any API call
- Field errors shown inline below each input
- API errors that don't match a known field (e.g. wrong password) appear in a **general error banner** above the form
- The backend returns `{ success: bool, message: string }` for auth failures (not an `errors` array). `AuthContext` normalizes this into `[{ field: 'general', message: data.message }]` so the banner catches it.

### Home Feed (`/`)

- Global / Following tabs (Following hidden if not logged in)
- Following feed: filters client-side by `followingIds` fetched from `GET /users/:userId/following`
- Client-side pagination: 10 posts per page
- Resets to page 1 on tab switch

### Post Detail (`/posts/[postId]`)

- Full content with HTML entity unescaping
- Relative + absolute timestamp
- Like/unlike inline
- Comment form with char counter (1000 max)
- On comment submit: refetch full post (backend returns no comment object), clear textarea

### Create Post (`/posts/new`)

- Auth-guarded (redirects to `/login`)
- Title (150 max) + content (5000 max) with char counters
- Counter turns `text-destructive` within 20 chars of limit

### User Profile (`/users/[username]`)

- Stats row: Posts · Followers (opens modal) · Following (opens modal)
- Follow/Unfollow button for other users
- Logout button on own profile
- Posts filtered client-side from `GET /posts/all` by `author.id`, paginated 10/page
- Followers/Following modal: fetches list, shows Follow/Unfollow per listed user

### Notifications (`/notifications`)

- Auth-guarded
- Unread notifications: full opacity, `border-l-4 border-l-primary` left accent bar
- Read notifications: reduced opacity
- Calls `resetUnreadCount()` on mount to clear the navbar badge
- Watches `sseEventCount` to refetch when new events arrive (no separate SSE connection on this page)
- Mark single / mark all as read with optimistic updates

---

## Key Conventions

### HTML Unescaping
The backend uses `express-validator`'s `.escape()` on all user content before storing. The frontend must unescape when rendering. Use `unescapeHtml()` from `lib/utils.ts` on all post titles, post content, and comment content.

### API Response Shapes
Confirmed shapes (not always what the docs imply — verify before assuming):
| Endpoint | Shape |
|---|---|
| `GET /posts/all` | `{ success, posts: [...] }` |
| `GET /posts/:id` | `{ success, post: {...} }` |
| `POST /posts/new` | `{ success, message }` — no post object returned |
| `POST /posts/:id/comments/new` | `{ success, message }` — no comment object returned |
| `GET /notifications` | bare array `[...]` |
| `GET /users/username/:username` | `{ user: {...} }` |
| `GET /users/:userId/posts/count` | raw number |
| `GET /users/:userId/follow-counts` | `{ followersCount, followingCount }` |
| `GET /users/:userId/is-following` | raw boolean |
| `POST /auth/login` (failure) | `{ success: false, message: string }` |

### Edit / Delete Not Implemented
Post and comment edit/delete are **out of scope**. The backend CORS config does not allow `PATCH` or `DELETE` from the frontend domain. No UI for these exists.

### Client-Side Pagination
There are no server-side pagination parameters. All posts are fetched at once (`GET /posts/all`) and sliced client-side at 10 per page.

---

## Backend API Reference

All requests to `API_URL`. Protected routes require `Authorization: Bearer <token>`.

### Auth — `/auth/*`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | No | Returns `{ token, likes[] }`, sets refresh cookie |
| POST | `/auth/register` | No | Creates account |
| POST | `/auth/refresh` | Cookie | Returns new access token |

### Posts — `/posts/*`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/posts/all` | No | All posts, newest first |
| GET | `/posts/:postId` | No | Single post with comments |
| POST | `/posts/new` | Yes | Create post; body `{ title, content }` |
| POST | `/posts/:postId/like` | Yes | Like a post |
| POST | `/posts/:postId/dislike` | Yes | Unlike a post (no body needed) |
| POST | `/posts/:postId/comments/new` | Yes | Comment; body `{ content }` |

### Users — `/users/*`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/username/:username` | No | Profile by username |
| GET | `/users/:userId/followers` | No | `[{ id, username }]` |
| GET | `/users/:userId/following` | No | `[{ id, username }]` |
| GET | `/users/:userId/follow-counts` | No | `{ followersCount, followingCount }` |
| GET | `/users/:userId/posts/count` | No | Raw number |
| GET | `/users/:userId/is-following` | Yes | Raw boolean |
| POST | `/users/follow` | Yes | Body `{ followingId }` |
| POST | `/users/unfollow` | Yes | Body `{ followingId }` |

### Notifications — `/notifications/*`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | Yes | All notifications, newest first |
| GET | `/notifications/stream` | Yes | SSE stream (use `fetch` + `ReadableStream`, not `EventSource`) |
| PATCH | `/notifications/read-all` | Yes | Mark all read |
| PATCH | `/notifications/:id/read` | Yes | Mark one read |

**SSE note**: use `fetch()` + `ReadableStream` (not `EventSource`) so the `Authorization: Bearer` header can be sent. Events arrive as `data: {...}\n\n`. The payload contains the raw notification (no joined `actor` or `post` fields) — refetch `GET /notifications` for the full list.
