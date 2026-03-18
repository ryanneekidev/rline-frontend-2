# CLAUDE.md — RLine Backend

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

Everything in the barebones spec, plus:

**Auth**
- Persistent login (auto-refresh on page reload)

**Feed**
- Pagination or infinite scroll
- Filter by following (personal feed vs. global feed)

**Posts**
- Edit and delete own posts
- Post status (NORMAL vs. ADMIN visibility)

**Comments**
- Edit and delete own comments

**User Profile**
- Followers / following lists viewable
- All posts by that user listed on their profile
- Own profile vs. another user's profile (different actions available)

**Notifications**
- Notification bell with unread count badge
- Dropdown panel instead of separate page

**UI/UX**
- Polished, responsive design
- Dark mode support
- Loading states and error messages throughout
- Empty states (no posts yet, no notifications, etc.)

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
