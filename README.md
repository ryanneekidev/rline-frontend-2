<div align="center">

# RLine

**A full-featured social platform — built end-to-end as a solo portfolio project.**

[**→ Live Demo**](https://rline.ryanneeki.xyz)

<br />

![RLine Screenshot](https://i.ibb.co/h6VRVmZ/dr3.png)

</div>

<br />

---

### What you can do

Post your thoughts. Like and comment on others'. Follow people and get a feed tailored to them. Get notified in real time when someone interacts with you. Edit or delete anything you've written. Upload images to your posts.

---

<br />

## Technical Overview

RLine is a full-stack social media application. This repository is the **frontend**. The backend (REST API + SSE) lives in a separate repo.

- **Frontend** — Next.js (App Router), TypeScript, Tailwind CSS v4
- **Backend** — Express 5, Prisma, PostgreSQL
- **Storage** — AWS S3 (direct presigned uploads from the client)
- **Deployed** — frontend on Vercel, API on a VPS, domain on Cloudflare

<br />

### Architecture decisions worth noting

**JWT in `useRef`, not state**
The access token lives in a ref rather than React state. This prevents stale closures in `authFetch` — if the token were state, a refresh mid-flight could leave in-progress requests using the old value. The ref is always current.

**Single global SSE stream**
Rather than each page opening its own `/notifications/stream` connection, the stream opens once in `AuthContext` when the user logs in and closes on logout. Pages that need real-time updates (like `/notifications`) just watch a `sseEventCount` counter as a `useEffect` dependency and refetch — no coordination required.

**Direct-to-S3 upload via presigned URLs**
Image uploads never touch the backend server. The client requests a presigned URL (`POST /upload/presign`), PUTs the file directly to S3, then passes the resulting `key` along with the post body. This keeps the API server stateless and avoids piping binary data through it.

**Client-side likes sync**
The `likes` array (post IDs the user has liked) is fetched once on login and kept in sync locally on every like/unlike. No refetch on interaction — the UI responds instantly and the source of truth stays consistent without round-tripping the server.

**FOUC-free theme switching**
Dark mode is applied by toggling a `.dark` class on `<html>`. An inline `<script>` in `<head>` reads `localStorage` and sets the class before React hydrates, preventing any flash of the wrong theme. `suppressHydrationWarning` on `<html>` handles the class mismatch React would otherwise warn about.

<br />

### Project structure

```
app/               # Next.js App Router pages
components/        # Navbar, PostCard, Pagination, Modal, ConfirmDialog
context/           # AuthContext, ThemeContext, ToastContext
lib/               # config.ts (env vars), utils.ts (cn, formatters, unescapeHtml)
```

<br />

### If I were to continue

A few things I'd tackle next:

- **Server-side pagination** — the current approach fetches all posts at once and slices client-side. Fine at this scale, but wouldn't survive real traffic.
- **Optimistic UI on comments** — likes update optimistically; comments still round-trip before appearing. The backend not returning the created object made this awkward, but it's solvable.
- **Image editing on post edit** — the edit page preserves the existing `mediaKey` but doesn't let you swap the image. A natural next addition.
- **End-to-end tests** — the app has no automated test coverage. Cypress or Playwright over the happy paths would be the obvious starting point.
