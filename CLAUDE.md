# CLAUDE.md — RLine

## Project Overview

RLine is a full-featured social media platform backend built as a portfolio star project by Ryan Neeki (sole engineer). The name is a portmanteau of "Line" (the popular Asian messenger app) and the first letter of the author's name.

- **Live API**: https://api.rline.ryanneeki.xyz/
- **Frontend domain**: https://rline.ryanneeki.xyz

All responses are JSON. Protected endpoints require a `Bearer <token>` in the `Authorization` header.

---

## Frontend Specs

The frontend lives in a separate repository at the frontend domain above. Stack: **Next.js**, **Tailwind CSS**, **shadcn/ui**.

### Barebones Spec (Testing)

Goal: verify every backend endpoint works end-to-end through a real UI. No styling polish required — functional is enough.

**Auth**
- Login page
- Register page
- Logout button
- Silent token refresh

**Feed**
- Home page listing all posts with author, like count, comment count
- Like / unlike a post inline

**Posts**
- Create post form
- Post detail page with comments

**Comments**
- View comments on post detail page
- Submit a comment

**User Profile**
- Profile page: username, join date, post count, follower/following counts
- Follow / unfollow button

**Notifications**
- Notification list page
- Mark single / all as read
- Real-time SSE stream connected on login

---

### Full Product Spec

Everything in the barebones spec, plus the detailed frontend spec below.

---

## Frontend — Full Product Spec

### Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Font | Inter (Google Fonts) |

---

### Design System

#### Color Palette

**Primary — Deep Ruby**
| Token | Hex | Usage |
|---|---|---|
| `primary` | `#BE123C` | Buttons, active links, key accents |
| `primary-hover` | `#9F1239` | Button hover/active state |
| `primary-light` | `#FFE4E6` | Subtle tinted backgrounds, badges (light mode) |
| `primary-muted` | `#4C0519` | Subtle tinted backgrounds, badges (dark mode) |

**Light Mode**
| Token | Hex | Usage |
|---|---|---|
| `bg` | `#FAFAFA` | Page background |
| `surface` | `#FFFFFF` | Cards, modals, inputs |
| `border` | `#E5E7EB` | Card borders, dividers, input outlines |
| `text` | `#111827` | Primary text |
| `text-secondary` | `#6B7280` | Timestamps, metadata, placeholders |
| `success` | `#16A34A` | Success toasts, confirmation states |
| `error` | `#DC2626` | Error messages, destructive actions |

**Dark Mode**
| Token | Hex | Usage |
|---|---|---|
| `bg` | `#0A0A0A` | Page background |
| `surface` | `#171717` | Cards, modals, inputs |
| `border` | `#262626` | Card borders, dividers, input outlines |
| `text` | `#F5F5F5` | Primary text |
| `text-secondary` | `#A3A3A3` | Timestamps, metadata, placeholders |
| `success` | `#4ADE80` | Success toasts |
| `error` | `#F87171` | Error messages |

#### Typography

Font: **Inter** — loaded via `next/font/google`.

| Token | Size | Weight | Usage |
|---|---|---|---|
| `text-2xl` | 30px | 700 | Hero/display text (login heading) |
| `text-xl` | 24px | 700 | Page headings (profile name, page title) |
| `text-lg` | 18px | 600 | Card titles, section headings |
| `text-base` | 16px | 400 | Body text, post content, inputs |
| `text-sm` | 14px | 400 | Metadata, timestamps, labels |
| `text-xs` | 12px | 400 | Character counters, badges |

#### Spacing & Layout

- **Content width**: max 800px, horizontally centered
- **Content padding**: 16px horizontal on mobile, 24px on tablet+
- **Card padding**: 16px all sides
- **Card border radius**: 12px
- **Card gap**: 12px between cards in a list

#### Responsive Breakpoints

| Name | Width | Layout changes |
|---|---|---|
| Mobile | < 640px | Single column, hamburger nav |
| Tablet | 640px – 1024px | Single column, full navbar |
| Desktop | > 1024px | Single column, full navbar |

---

### Dark / Light Mode

- Default: **system preference** (`prefers-color-scheme`)
- User can manually toggle — preference persisted to `localStorage`
- Toggle button lives in the navbar (sun/moon icon)
- Implemented via Tailwind's `class` dark mode strategy — `dark` class on `<html>`

---

### Navigation

**Navbar** — persistent across all pages.

**Desktop layout** (tablet and above):
```
[ RLine ]  ←————————————————————→  [ Home ] [ Create ] [ Profile ] [ 🔔 3 ] [ ☀/🌙 ]
```
- Logo: bold "RLine" in `primary` color, links to `/`
- Links: Home (`/`), Create (`/posts/new`), Profile (`/users/[username]`)
- Notification bell: icon + unread count badge in `primary`. Links to `/notifications`. Badge hidden when count is 0
- Dark mode toggle: sun/moon icon on far right
- If not logged in: Login and Register links instead of Profile and bell

**Mobile layout** (< 640px):
```
[ RLine ]  ←————————————————————→  [ ☀/🌙 ] [ ☰ ]
```
- Logo on far left, dark mode toggle + hamburger on far right
- Hamburger opens a dropdown with all links stacked vertically
- Dropdown closes on link click or outside tap

**Active route highlighting:**
- Current page nav link styled with `primary` color + bottom underline
- On mobile dropdown: active link has `primary-light` (light) / `primary-muted` (dark) background

---

### Cross-Cutting Concerns

#### Loading States
- **Full page load**: skeleton layout matching page structure
- **Buttons**: disabled + loading label (e.g. "Posting…", "Following…") while request in flight
- **Inline actions** (like, follow): button disabled during request

#### Empty States
| Context | Message |
|---|---|
| Feed | "No posts yet. Be the first to post!" |
| Comments | "No comments yet. Start the conversation." |
| Notifications | "You're all caught up." |
| Followers list | "No followers yet." |
| Following list | "Not following anyone yet." |
| User's posts on profile | "No posts yet." |

#### Toast Notifications
- Position: top-right on desktop, top-center on mobile
- **Success** (green): auto-dismisses after 3s
- **Error** (red): auto-dismisses after 4s
- Max one toast visible at a time — new toast replaces current
- Slides in from top, fades out on dismiss

Success toasts fired on: login, register, post created, post updated, post deleted, comment posted, comment deleted, follow, unfollow, mark notification(s) as read.
Error toasts fired on: failed like/unlike, failed follow/unfollow, network errors on non-form operations.

#### Form Validation (client-side before submit)

| Form | Rules |
|---|---|
| Login | Username required; password required |
| Register | Username 3–20 chars, alphanumeric + underscores; email valid format; password min 8 chars; confirm password must match |
| Create / Edit Post | Title required, max 150 chars; content required, max 5000 chars |
| Create / Edit Comment | Content required, max 1000 chars |

- Errors shown inline below the relevant field in `error` color
- Character counters shown below fields with limits: format `42 / 150`
- Counter turns `error` color within 20 characters of the limit and when over

#### Post Content Display
- Backend HTML-escapes post/comment content before storing (via `express-validator`'s `.escape()`)
- Frontend must **unescape** HTML entities when rendering (e.g. `&amp;` → `&`, `&lt;` → `<`)
- Content rendered as plain text — no raw HTML injection

#### Timestamps
- **Card / list view**: relative time only (e.g. "3 hours ago")
- **Detail view**: relative time + absolute date in parentheses (e.g. "3 hours ago (March 19, 2026)")

#### Auth Guards
- Protected pages (`/posts/new`, `/notifications`) redirect unauthenticated users to `/login`
- After login, redirect back to the originally requested page, not always `/`
- If silent refresh fails on page load, user is treated as logged out with no forced redirect

---

### Pages

#### `/login` — Login
- Layout: centered card, max-width 400px
- Heading: "Welcome back" (`text-2xl`)
- Subheading: "Log in to your RLine account" (`text-secondary`)
- Fields: username, password
- Submit button: full width, `primary`
- Link: "Don't have an account? Register" → `/register`
- On success: toast "Logged in successfully", redirect to previous page or `/`

#### `/register` — Register
- Layout: centered card, max-width 400px
- Heading: "Create an account" (`text-2xl`)
- Subheading: "Join RLine today" (`text-secondary`)
- Fields: username (counter `0 / 20`), email, password, confirm password
- Submit button: full width, `primary`
- Link: "Already have an account? Login" → `/login`
- On success: toast "Account created!", redirect to `/login`

#### `/` — Home Feed
- Feed toggle: "Global" / "Following" tabs below navbar. Following tab hidden if not logged in
- Global: all posts. Following: filtered client-side by the user's following list
- Following list fetched on mount via `GET /users/:userId/following` if logged in
- Post cards (see Post Card component)
- Pagination: 10 posts per page, client-side. Previous / page numbers / Next controls at bottom
- Feed re-fetches on mount

#### Post Card Component
- Title (`text-lg`), links to `/posts/[postId]`
- Author (linked to `/users/[username]`) · relative timestamp
- Content preview: first 200 chars, truncated with "…"
- Action bar: Like button (heart icon + count, filled/primary when liked) · Comment button (speech bubble + count, links to `/posts/[postId]#comments`)
- If own post: Edit button → `/posts/[postId]/edit`, Delete button → confirmation dialog

#### `/posts/new` — Create Post
- Auth-guarded
- Heading: "New Post"
- Fields: title (counter `0 / 150`), content textarea 8 rows (counter `0 / 5000`)
- Submit: "Post" (`primary`), Cancel link → `/`
- On success: toast "Post created!", redirect to `/`

#### `/posts/[postId]/edit` — Edit Post
- Auth + ownership guarded (redirect to post detail if not author)
- Same layout as Create Post, pre-filled with current data
- Save button: "Save changes". Cancel link → `/posts/[postId]`
- Delete button: destructive, outlined in `error` color, opens confirmation dialog
- On save: toast "Post updated", redirect to `/posts/[postId]`
- On delete: toast "Post deleted", redirect to `/`

#### `/posts/[postId]` — Post Detail
- Back link: "← Back to feed"
- Title (`text-xl`), author (linked), relative timestamp (absolute date in parentheses)
- Full content (HTML-unescaped, plain text)
- Like button + count
- If own post: Edit button → `/posts/[postId]/edit`, Delete button → confirmation dialog
- Comments section (`#comments`): heading "Comments (N)"
- Each comment: author (linked), relative timestamp, content. If own comment: inline Edit + Delete
- Comment form (or "Login to comment" link if not authenticated): textarea (counter `0 / 1000`), "Post comment" button
- On comment submit: refetch post, clear textarea, toast "Comment posted"
- On comment edit: inline textarea replaces text, Save/Cancel buttons
- On comment delete: refetch post, toast "Comment deleted"

#### `/users/[username]` — User Profile
- Profile header: username (`text-xl`), role badge (ADMIN/OWNER only), "Member since [date]"
- Stats row: Posts · Followers · Following (follower/following counts are links that open a modal)
- If other user: Follow/Unfollow button (`primary`). If own profile: placeholder "Edit profile" button
- Posts tab: all posts by this user via Post Card, filtered client-side from `GET /posts/all` by `authorId`. Paginated 10 per page
- Followers/Following modal: list of usernames (linked), each with Follow/Unfollow if logged in and not own profile
- On follow/unfollow: optimistic count update, success toast

#### `/notifications` — Notifications
- Auth-guarded
- Heading: "Notifications"
- "Mark all as read" button (only if unread notifications exist)
- Each notification: unread indicator (left `primary` border), notification text, relative timestamp, "Mark as read" button (unread only)
- Unread items: full opacity. Read items: reduced opacity
- Empty state: "You're all caught up."
- SSE stream opened on mount, refetches full list on each event
- On mark all read: optimistic update, toast "All notifications marked as read"

#### Notification Bell (Navbar)
- Badge: unread count, `primary` background, white `text-xs`
- Badge hidden when count is 0
- Unread count derived from `GET /notifications` on mount (count unread items)
- SSE stream (opened globally in `AuthContext` on login) increments badge in real time
- Navigates to `/notifications` on click

---

### Component Inventory

| Component | Description |
|---|---|
| `Navbar` | Persistent top nav with mobile hamburger |
| `PostCard` | Post preview card used in feed and profile |
| `CommentItem` | Single comment with inline edit/delete |
| `Toast` / `ToastProvider` | Global auto-dismissing notification banner |
| `Pagination` | Previous / page numbers / Next controls |
| `Modal` | Generic overlay for confirmations and lists |
| `ConfirmDialog` | "Are you sure?" modal for destructive actions |
| `Avatar` | Initials-based user avatar (no image upload in scope) |
| `Badge` | Small label for role, unread count |
| `Skeleton` | Loading placeholder matching content shape |
| `DarkModeToggle` | Sun/moon icon button, reads/writes `localStorage` |
| `CharCounter` | Live character count display for inputs |

---

### Out of Scope

- Image uploads (avatars, post images)
- Post status (NORMAL vs. ADMIN) — backend supports it, no UI needed
- Admin/owner-specific views
- Search
- Direct messages

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| ORM | Prisma (`@prisma/client` ^6) |
| Database | PostgreSQL |
| Auth | JSON Web Tokens (`jsonwebtoken`) + HTTP-only cookies for refresh |
| Password hashing | `bcryptjs` |
| Validation | `express-validator` |
| Rate limiting | `express-rate-limit` |
| Dev server | `nodemon` |
| Config | `dotenv` |
| Other | `cors`, `cookie-parser` |

---

## Environment Variables

Create a `.env` file at the project root (never commit it — it's in `.gitignore`):

```
NODE_ENV=development           # "development" or "production"
PORT=4000
DATABASE_URL=                  # PostgreSQL connection string for Prisma
ACCESS_TOKEN_SECRET=           # Secret for signing access JWTs
REFRESH_TOKEN_SECRET=          # Secret for signing refresh JWTs
ACCESS_TOKEN_VALIDITY=         # e.g. "15m"
REFRESH_TOKEN_VALIDITY=        # e.g. "7d"
REFRESH_TOKEN_MAX_AGE=         # Refresh cookie lifetime in milliseconds (e.g. 604800000 for 7 days) — must match REFRESH_TOKEN_VALIDITY. Used to calculate the cookie expires date.
BRAND=RLine                    # Used as cookie name prefix: ${BRAND}RefreshToken
WELCOME_MESSAGE=               # Returned by GET /
```

---

## Running the Project

```bash
npm install               # install deps
npm run dev               # start with nodemon (watch mode)
npm start                 # start without watch
npm run seed              # deploy migrations to production DB (prisma migrate deploy)
npm run devseed           # run dev migrations (prisma migrate dev)
npx prisma migrate reset  # drop DB and replay all migrations from scratch (dev only)
```

### Docker

```bash
docker-compose up --build   # build and start all services
docker-compose up           # start without rebuilding
docker-compose down         # stop all services
```

The `docker-compose.yml` runs PostgreSQL and the backend together. The backend loads all env vars from `.env` via `env_file`, with `DATABASE_URL` and `NODE_ENV` overridden inline to point at the containerised database. Always rebuild the image (`--build` or `--no-cache`) after installing new packages.

---

## Architecture: Service-Controller-Repository (SCR) Pattern

The codebase follows a fully layered SCR pattern. Each domain has four files: a router, a controller, a service, and a repository.

```
src/
├── app.js                          # Express app entry point + global error handler
├── db.js                           # Shared Prisma client singleton
├── middleware/
│   ├── auth.js                     # JWT auth middleware (attaches req.user)
│   ├── rateLimiter.js              # Per-route rate limiters for auth endpoints
│   └── validators/
│       ├── validate.js             # Shared helper — reads validation results, returns 400 on failure
│       ├── auth.validators.js      # Validation + sanitization chains for login and register
│       └── posts.validators.js     # Validation + sanitization chains for createPost and createComment
├── utils/
│   └── messages.js                 # Centralized error/success message strings
├── routers/
│   ├── authentication/authentication.route.js
│   ├── posts/posts.route.js
│   ├── users/users.route.js
│   └── notifications/notifications.route.js
├── controllers/
│   ├── authentication/authentication.controller.js
│   ├── posts/posts.controller.js
│   ├── users/users.controller.js
│   └── notifications/notifications.controller.js
├── services/
│   ├── authentication/authentication.service.js
│   ├── posts/posts.service.js
│   ├── users/users.service.js
│   └── notifications/notifications.service.js
└── repositories/
    ├── posts/posts.repository.js
    ├── users/user.repository.js
    └── notifications/notifications.repository.js
```

**Layer responsibilities:**
- **Router**: defines routes, applies middleware (rate limiter → validators → auth), delegates to controller
- **Controller**: extracts request data, calls service, maps result flags to HTTP status codes, sends response
- **Service**: business logic, orchestrates repository calls, returns `{ success, ...data }` objects (never touches `req`/`res`)
- **Repository**: all Prisma/database calls, no business logic

**Request flow for a protected, validated route:**
```
Request → Rate limiter → Validator chains → validate() → auth middleware → Controller → Service → Repository
```

---

## Database Schema (Prisma)

Located at `prisma/schema.prisma`. Database: PostgreSQL.

### Models

**User**
- `id` (UUID), `username` (unique), `email` (unique), `password` (hashed), `role` (enum), `joinedAt`
- Relations: `posts[]`, `comments[]`, `like[]`, `followers[]`, `following[]`

**Post**
- `id` (UUID), `title`, `content`, `createdAt`, `authorId` (→ User), `postStatus` (enum), `likes` (int count)
- Relations: `comments[]`, `like[]`
- `Post.likes` is kept in sync via `prisma.$transaction` whenever a like is created or deleted

**Comment**
- `id` (UUID), `content`, `createdAt`, `authorId` (→ User), `parentPostId` (→ Post)

**Like**
- `id` (UUID), `userId` (→ User), `postId` (→ Post), `createdAt`
- Unique constraint: `[userId, postId]` — a user can only like a post once

**Follow**
- `id` (UUID), `followerId` (→ User), `followingId` (→ User), `createdAt`
- Unique constraint: `[followerId, followingId]`
- Indexed on both `followerId` and `followingId`

**Notification**
- `id` (UUID), `recipientId` (→ User), `actorId` (→ User), `type` (NotificationType enum), `postId` (nullable → Post), `read` (bool), `createdAt`
- `postId` is null for FOLLOW notifications, set for LIKE and COMMENT
- Indexed on `recipientId`

### Cascade Delete Behaviour

All foreign keys use `onDelete: Cascade`. Deleting a user removes all their posts, comments, likes, and follows. Deleting a post removes all its comments and likes.

### Enums

```prisma
enum Role             { USER, ADMIN, OWNER }
enum Status           { NORMAL, ADMIN }           // post status
enum NotificationType { LIKE, COMMENT, FOLLOW }
```

### Migrations

```
prisma/migrations/
├── 20250516074611_initial/                # Initial schema
├── 20251202050012_add_follow_system/      # Added Follow model
├── 20260317030433_remove_follow_userid/   # Removed spurious Follow.userId field
├── 20260317051622_cascade_deletes/        # Cascade deletes on all FK relations + Like unique constraint
└── 20260318003657_add_notifications/      # Added Notification model and NotificationType enum
```

---

## API Routes

All routes are mounted with a prefix in `src/app.js`.

### Authentication — `/auth/*`

| Method | Path | Auth | Rate limit | Description |
|---|---|---|---|---|
| POST | `/auth/login` | No | 10 / 15 min | Login; returns access token + likes array, sets refresh cookie |
| POST | `/auth/register` | No | 5 / hour | Register new user |
| POST | `/auth/refresh` | Cookie | 30 / 15 min | Exchange refresh token for new access token |

**Login response** includes `token` (access JWT) and `likes` (array of user's Like records).
**Refresh token** is stored in an HTTP-only cookie named `${BRAND}RefreshToken` (e.g. `RLineRefreshToken`).

### Posts — `/posts/*`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/posts/all` | No | Get all posts (newest first), includes author and comments with authors |
| GET | `/posts/:postId` | No | Get single post by ID, includes author and comments with authors |
| POST | `/posts/:postId/like` | Yes | Like a post |
| POST | `/posts/:postId/dislike` | Yes | Remove the authenticated user's like from a post — no body required |
| POST | `/posts/:postId/comments/new` | Yes | Create a comment; body: `{ content }` |
| POST | `/posts/new` | Yes | Create a post; body: `{ title, content, postStatus? }` |

### Notifications — `/notifications/*`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | Yes | Get all notifications for the authenticated user (newest first), includes actor username and post title |
| GET | `/notifications/stream` | Yes | SSE stream — persistent connection, pushes new notifications in real time |
| PATCH | `/notifications/read-all` | Yes | Mark all notifications as read |
| PATCH | `/notifications/:notificationId/read` | Yes | Mark a single notification as read (ownership enforced — 403 if not yours) |

Notifications are created server-side as side effects of other actions — there is no POST endpoint. Triggers:
- `likePost` → LIKE notification to post author
- `createComment` → COMMENT notification to post author
- `followUser` → FOLLOW notification to followed user

The stream uses `fetch()` + `ReadableStream` on the frontend (not `EventSource`) so the standard `Authorization: Bearer <token>` header works. The typical flow is: open the stream on login for real-time pushes, and call `GET /notifications` once on page load to fetch the existing backlog.

**Why not `EventSource`**: the browser's built-in `EventSource` API does not support custom headers, making it impossible to pass the `Authorization: Bearer <token>` header. Passing the token as a query param was rejected as a security concern (tokens appear in server logs, browser history, proxy logs). The `fetch()` + `ReadableStream` approach gives full header control at the cost of manual reconnection logic on the frontend.

**Frontend SSE pattern:**
```js
const response = await fetch(`${API_URL}/notifications/stream`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
});
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    // text arrives as "data: {...}\n\n" — parse accordingly
    const json = JSON.parse(text.replace('data: ', '').trim());
    // handle notification...
}
```

On reconnect (connection dropped or token expired), call `POST /auth/refresh` first if the token has expired, then re-open the stream with the new token.

### Users — `/users/*`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/username/:username` | No | Get user profile by username (no password) |
| GET | `/users/:userId/likes` | No | Get all likes for a user |
| GET | `/users/:userId/followers` | No | Get follower list `[{ id, username }]` |
| GET | `/users/:userId/following` | No | Get following list `[{ id, username }]` |
| GET | `/users/:userId/is-following` | Yes | Check if authenticated user follows `:userId` |
| GET | `/users/:userId/follow-counts` | No | Get follower and following counts |
| GET | `/users/:userId/posts/count` | No | Get number of posts by user |
| POST | `/users/follow` | Yes | Follow a user; body: `{ followingId }` |
| POST | `/users/unfollow` | Yes | Unfollow a user; body: `{ followingId }` |

---

## Middleware

### Auth (`src/middleware/auth.js`)
Validates `Authorization: Bearer <token>` header, verifies the JWT, attaches decoded payload to `req.user`.
- Returns `401` if token is missing
- Returns `403` if token is invalid or expired

The decoded `req.user` object contains: `id`, `username`, `email`, `joinedAt`, `role`.

### Rate Limiter (`src/middleware/rateLimiter.js`)
Three named limiters exported and applied individually per auth route. Responses include standard `RateLimit-*` headers.

| Limiter | Limit | Window |
|---|---|---|
| `loginLimiter` | 10 requests | 15 minutes |
| `registerLimiter` | 5 requests | 1 hour |
| `refreshLimiter` | 30 requests | 15 minutes |

### Validators (`src/middleware/validators/`)
Built with `express-validator`. Each validator array includes sanitization (trim, escape, normalizeEmail) and validation rules, followed by the shared `validate` helper which short-circuits with a structured `400` response if any rule fails.

**Validation rules:**
- **Login**: username required + trimmed; password required
- **Register**: username 3–20 chars, alphanumeric + underscores; email valid format, normalized; password min 8 chars; confirmedPassword required
- **Create post**: title required, max 150 chars, escaped; content required, max 5000 chars, escaped
- **Create comment**: content required, max 1000 chars, escaped

**400 error response shape:**
```json
{
  "success": false,
  "errors": [
    { "field": "email", "message": "Must be a valid email address" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

---

## CORS Configuration

- **Development** (`NODE_ENV=development`): allows `http://localhost:3000`
- **Production**: allows `https://rline.ryanneeki.xyz`
- Credentials (`credentials: true`) are enabled to support the refresh token cookie cross-origin.

---

## Key Conventions

- **Service return shape**: all service functions return plain objects `{ success: boolean, ...payload }`. Controllers check `result.success` and additional flags (`notFound`, `unauthorized`, `alreadyLiked`, `badRequest`) to pick the correct HTTP status.
- **No `req`/`res` in services or repositories**: HTTP concerns are strictly in controllers.
- **Prisma singleton**: all repositories import the shared client from `src/db.js`. Never instantiate `new PrismaClient()` in a repository.
- **Prisma transactions**: like/dislike operations use `prisma.$transaction` to atomically update both the `Like` table and the `Post.likes` counter.
- **Dislike lookup**: the dislike endpoint takes no body — the server finds the like record using `getExistingLike(userId, postId)` via the `@@unique([userId, postId])` constraint. Ownership is implicit.
- **Password stripping**: `getUserByUsername` in the users service strips the `password` field before returning profile data.
- **Self-follow guard**: `usersService.followUser` returns `{ success: false, badRequest: true }` if `followerId === followingId`.
- **Error messages**: centralized in `src/utils/messages.js` as `errorMessages` and `successMessages` objects.
- **User-generated content**: post titles, content, and comment content are HTML-escaped via `express-validator`'s `.escape()` before being stored.
- **Cookie expiry**: the refresh token cookie uses `expires` (a `Date` object) as required by Express 5 / cookie package v0.7. The value is computed from `REFRESH_TOKEN_MAX_AGE` (milliseconds) at login time.
- **Notification self-guard**: `notificationsService.createNotification` silently no-ops if `recipientId === actorId`. This means liking/commenting on your own post or following yourself (already blocked upstream) never creates a notification.
- **Notification failures are non-fatal**: `createNotification` catches and logs its own errors without rethrowing — a failed notification never causes the parent action (like, comment, follow) to fail.
- **SSE client store**: open SSE connections are tracked in an in-memory `Map` at `src/utils/sseClients.js` (userId → res). `createNotification` checks this map after saving to DB and writes directly to the open response if the recipient is connected. Entries are cleaned up via `req.on('close')`. This map is process-local — not suitable for multi-instance deployments without Redis pub/sub.
