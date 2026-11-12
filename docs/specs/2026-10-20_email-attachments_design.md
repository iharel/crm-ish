# Email images & attachments — design (2026-10-20)

## Why
Messages in the inbox are rendered from `body_text` only. Inline images (`<img src="cid:...">` in the HTML part) and file attachments are dropped at import, so a user reading a thread in the CRM misses screenshots, signatures with logos, PDFs and spreadsheets the counterpart sent. The user has to switch to Gmail to see them.

## What
1. **Attachment metadata captured at import.** Every MIME part with a `filename` or a `Content-ID` is recorded per message: name, mime type, size, Gmail attachment id, content id and whether it is inline.
2. **Bytes downloaded at import.** Every attachment is fetched with `users.messages.attachments.get` while the message is imported and stored under `UPLOAD_DIR/attachments/<messageId>/<attachmentId>`. The CRM copy survives deletion in Gmail and serving never touches the Gmail API. A download that fails at import leaves `file_path` null and is retried on the first request (one-time lazy fallback).
3. **Inline images shown in place.** Inbound messages with an HTML body render the sanitized HTML with every `cid:` reference rewritten to the attachment URL. Messages without HTML keep today's plain-text rendering.
4. **Attachment strip under the body.** Each open message lists its non-inline attachments as chips (icon by type, name, size). Image attachments render as thumbnails in a small gallery; clicking opens a lightbox; every chip has a download link.
5. **Backfill for mail already imported.** Opening a thread scans any message not yet scanned (`attachments_scanned = 0`) by fetching its Gmail payload metadata once, so existing conversations gain their attachments without a full re-import.

## Key decisions (owner, approved 2026-10-20)
| # | Decision | Chosen |
|---|----------|--------|
| 1 | Body rendering | Sanitized HTML (DOMPurify, images allowed only from our attachment URLs and `https:`; scripts, forms, external styles stripped) inside a container with `dir="auto"`. Quoted-trail folding keeps working on HTML via Gmail / Outlook / Apple quote containers (`.gmail_quote`, `blockquote[type=cite]`, `#divRplyFwdMsg`, `hr + div` from Outlook) and falls back to the text splitter when none is found. Plain-text messages are unchanged. |
| 2 | Storage | **Download everything at import** (owner's choice, 2026-10-20) into `UPLOAD_DIR/attachments`. Files are removed with the thread. Max size 25 MB (Gmail's own limit). Failed downloads retry lazily on first request. |
| 3 | Auth for `<img>` and download links | Per-attachment **signed URL**: `/api/emails/attachments/:id?sig=<hmac>&exp=<unix>` where the HMAC (JWT_SECRET) covers id + exp + user id. Expiry 2 h. The message DTO carries ready-made URLs so the browser never puts the session JWT in an image URL. |
| 4 | Remote images in HTML (`https://` `<img>`) | Blocked by default (tracking pixels, privacy). A per-message "Load remote images" button swaps them in. |
| 5 | Sending attachments | Out of scope for this iteration. Compose stays text-only. |

## Data model (needs approval — migration `004_email_attachments.sql`)
```sql
CREATE TABLE IF NOT EXISTS email_attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  gmail_attachment_id TEXT,              -- Gmail body.attachmentId (used for the import download and the retry fallback)
  filename TEXT,                         -- null for unnamed inline parts
  mime TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  content_id TEXT,                       -- Content-ID without <>, for cid: rewriting
  is_inline INTEGER NOT NULL DEFAULT 0,  -- referenced from the HTML body (Content-Disposition inline or cid used in body)
  file_path TEXT,                        -- disk path; null only when the import download failed
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attachments_message ON email_attachments(message_id);

ALTER TABLE email_messages ADD COLUMN attachments_scanned INTEGER NOT NULL DEFAULT 0;
```
New messages are inserted with `attachments_scanned = 1` (scanned during import). Existing rows default to 0 and are scanned on first thread open.

## API
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/emails/threads/:id` | Message DTO gains `attachments: AttachmentDto[]` and `bodyHtml` is now the **sanitized** HTML with `cid:` rewritten (raw HTML is never shipped). `AttachmentDto = { id, filename, mime, size, inline, url, thumbUrl? }`. |
| GET | `/api/emails/attachments/:id?exp&sig` | Public router (signature replaces the bearer token). Validates signature + expiry, loads the attachment row, checks the signing user still owns the account, fetches from Gmail when `file_path` is null (retry), streams with `Content-Type`, `Content-Disposition` (inline for images, attachment otherwise) and `Cache-Control: private, max-age=86400`. 404 when Gmail no longer has the message. |

## Backend layering
- `mimeService.attachments(msg)` walks the payload and returns the attachment parts, plus the set of `cid`s referenced by the HTML.
- `attachmentRepository` (new) — CRUD on `email_attachments`.
- `attachmentManager` (new) — record + download at import, lazy scan for old messages, signed URL mint/verify, sanitize + cid rewrite (`sanitizeService` using `isomorphic-dompurify` + cheerio for cid rewrite).
- `emailManager.importMessage` calls `attachmentManager.recordFromPayload`. `emailManager.thread()` triggers the lazy scan and builds DTOs with URLs.
- `attachmentController` + routes; the public route verifies the signature itself (no `authenticate`).

## Frontend
- `MessageCard` renders `bodyHtml` when present via a new `HtmlBody` component (`frontend/src/components/email/HtmlBody.tsx`): sanitized HTML, `dir="auto"`, quoted-trail fold, "Load remote images" button.
- `AttachmentStrip` (`frontend/src/components/email/AttachmentStrip.tsx`): chips + image gallery + lightbox (`ImageLightbox` in `components/ui`).
- Inbox list row and thread header show a paperclip icon when a thread has attachments (`ThreadDto.hasAttachments`).
- Mockup: `InboxMockup` gains a message with an inline image and two attachments, registered in `/design/index`.

## Security
- Only sanitized HTML reaches the browser; `<img>` limited to our signed attachment URLs and `https:` (the latter held behind the remote-images button).
- Signed URLs are user-bound and expire; the attachment route re-checks that the user may see the account.
- Served files always carry the stored mime; `X-Content-Type-Options: nosniff`.

## Out of scope
Sending attachments, previews for non-image files (PDF viewer), attachment search.
