# Email images & attachments — implementation plan (2026-10-20)
Design: `2026-10-20_email-attachments_design.md` (approved 2026-10-20: schema, sanitized HTML, download at import, remote images blocked).

| # | Task | Files | Verify |
|---|------|-------|--------|
| 1 | Migration 004: `email_attachments` table + `email_messages.attachments_scanned` | `backend/src/db/migrations/004_email_attachments.sql`, `types/index.ts` (`AttachmentRow`, `MessageRow`) | server boots, `_migrations` has 004 |
| 2 | `attachmentRepository` — create / byMessage / byId / setFilePath / markScanned | `backend/src/repositories/attachmentRepository.ts`, `emailRepository.ts` (`hasAttachments` per thread, `createMessage` sets scanned=1) | tsc |
| 3 | `mimeService.attachments(msg)` — walk parts, collect `{ partId, attachmentId, filename, mime, size, contentId, inline }`; `inline` when Content-Disposition is inline or cid referenced in HTML | `backend/src/services/mimeService.ts` | unit check on a sample payload |
| 4 | `sanitizeService` — cheerio allow-list sanitizer: strip script/style/iframe/object/embed/form/link/meta/base, `on*` attrs, `javascript:` urls, `url(`/`expression(` in style; `cid:` → attachment url; `http(s)` images → `data-remote-src`; drop tracking pixels (1×1, `/t/o/`) | `backend/src/services/sanitizeService.ts` | tsc + manual |
| 5 | `attachmentManager` — `recordAndDownload(account, messageRow, gmailMsg)`, `ensureScanned(account, messageRow)` (fetch payload once for old mail), `signedUrl(att, userId)`, `verify(id, exp, sig, userId)`, `stream(res, att, account)` with lazy retry when `file_path` null, `removeForThread` | `backend/src/managers/attachmentManager.ts` | tsc |
| 6 | Wire into `emailManager`: import calls recordAndDownload; `getThread` runs ensureScanned for unscanned messages, DTO gains `attachments` + sanitized `bodyHtml`; `ThreadDto.hasAttachments`; deleteThread removes files | `backend/src/managers/emailManager.ts` | open a thread with attachments |
| 7 | Route + controller: `GET /api/emails/attachments/:id` on publicRouter (signature auth) | `routers/index.ts`, `controllers/attachmentController.ts` | curl signed url → bytes |
| 8 | Frontend types + `HtmlBody` (sanitized HTML, dir=auto, quoted fold via `splitQuotedHtml`, "Load remote images") | `frontend/src/types/index.ts`, `lib/quotedText.ts`, `components/email/HtmlBody.tsx`, `index.css` (`.email-html` scope) | inline image visible |
| 9 | `AttachmentStrip` + `ImageLightbox`; paperclip in list row and header | `components/email/AttachmentStrip.tsx`, `components/ui/ImageLightbox.tsx`, `pages/InboxPage.tsx` | chips, gallery, download |
| 10 | Mockup + docs: Inbox mockup message with inline image & attachments; PRD, README, design doc sync | `mockups/pages/InboxMockup.tsx`, `docs/prd.md`, `README.md` | `/design/inbox` |

**Status (2026-10-20):** tasks 1–10 implemented. Verified: sanitizer/MIME parser on sample payloads, backend + frontend type-checks, migration 004 applied on dev boot.
