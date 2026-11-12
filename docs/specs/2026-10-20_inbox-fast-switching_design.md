# Inbox fast switching — design (2026-10-20)

## Why
Moving between threads in the inbox feels slow: after a click nothing visibly changes until the next thread has fully
arrived, and that arrival is often slow. Pulling every thread into the browser is out of scope (memory, privacy, stale
data), so the fix must come from removing wasted work on the server and from a small, bounded cache + prefetch on the
client.

## What is slow today (from code; the dev DB holds no mail, production does)
1. **First open blocks on Gmail.** `getThread` awaits an attachment scan for every message imported before migration 004,
   one Gmail round-trip per message, serially, before replying. Every pre-004 thread pays this once.
2. **HTML is re-sanitized on every open.** Each message body goes through cheerio on every request.
3. **The thread list loads every message body.** `threadDto` reads all messages of each thread just to find the last
   outbound status, and re-reads the company-domain table per thread. The list reloads on every socket event.
4. **No instant feedback.** `useAsync` keeps the previous thread on screen while the next one loads; no skeleton.
5. **Nothing is cached or prefetched.** Re-opening a thread refetches thread, drafts, open-task count, lead and company.

## Decisions
- **Never block a read on Gmail.** `GET /emails/threads/:id` returns what is in SQLite immediately. Unscanned messages
  are scanned in the background (one job per thread, deduplicated); when the scan records attachments the server emits
  `thread:scanned` and the open client silently refreshes. A low-rate backfill job also scans pre-004 mail
  (newest first, 10 messages every 30 s) so most threads are scanned before anyone opens them.
- **Cache sanitized HTML in memory, not in the DB.** No schema change. Sanitized bodies are cached with `cid:` images
  rewritten to an `att://<id>` placeholder, and the per-user signed urls are substituted on each request. Bounded LRU
  (300 entries / 24 MB). Key includes the attachment ids so a background scan invalidates it.
- **Reads have no side effects.** `GET /emails/threads/:id` no longer marks the thread read; a new
  `POST /emails/threads/:id/read` does. This is what makes prefetching safe.
- **Lighter list DTO.** Last outbound status comes from one indexed query; "has attachments" is computed once per page;
  the company-domain table is cached for 5 s and invalidated on every domain mutation.
- **Bounded client cache, stale-while-revalidate.** A small LRU (60 entries) holds recently viewed/prefetched threads,
  drafts, task counts, leads and companies for the session only. Cached threads render instantly and revalidate in the
  background when older than 30 s or when a socket event names them. Nothing persists; nothing loads the whole inbox.
- **Prefetch only what the user is likely to open next:** the thread under the pointer (after 120 ms hover) and the
  threads just above/below the selected one (after the current one is on screen). At most two prefetches in flight.
- **Shimmers for inner loading.** A reusable `Skeleton` block (shimmer sweep) drives skeletons for the thread list, the
  reading pane, the context card and the draft panel. The previous thread never lingers on screen.

## Out of scope
Virtualized thread list, offline storage, server-side pagination changes.

## Round 2 — text first (2026-10-20)
**Why:** Long threads were still slow. Each reply quotes the earlier messages, so a thread payload that carries every message's full HTML grows quadratically with thread length. On top of that, images competed with the body for the network.

**Decisions:**
- **Thread payload is text first.** The newest message, which is open by default, carries its sanitized HTML. Older messages carry `bodyText`, the attachment list and `hasHtml`.
  - Older messages fetch their HTML on expand via `GET /emails/messages/:id/html`. That endpoint is auth-checked through the thread's account and backed by the server HTML LRU.
  - The client keeps a bounded cache for these: `messageHtmlCache`, 30 entries, 10-minute max age. Meanwhile the plain text shows, with a thin shimmer bar. If there is no text, a line skeleton shows instead.
- **Images never block text.**
  - The sanitizer marks `<img>` as `loading="lazy" decoding="async"` with the class `.email-img`, and the client shimmers them (`.is-loading`) until they load or fail.
  - Attachment thumbnails shimmer until they load.
- **Stable signed urls.** The expiry is rounded up to the hour, so image urls stay identical across refetches and the browser cache hits (`Cache-Control: private, max-age=86400`).
- **gzip (`compression`)** on API responses. Mail HTML and JSON compress about 5–10×.
- **Prefetch is lighter.**
  - Hover and neighbour prefetch load only the thread, not drafts or task counts, which load on open.
  - At most 3 prefetches run at once, so a click never queues behind them in the browser's connection pool.
- **Socket `email:new`** no longer ships message HTML.
- **Memory:** the client holds at most 60 thread payloads, now text-heavy, plus 30 HTML bodies. It never holds the whole mailbox.
