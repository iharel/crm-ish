# Inbox backfill, spreadsheet import & linking polish — design (2026-10-19)

## Why
Second round of production feedback: the inbox only holds the last 30 days, leads often start life in a spreadsheet, email threads should hang off the **company** rather than another lead, AI drafts were generated for every inbound message, the toggle control rendered its knob outside the track, and the list did not show whether a reply had been opened.

## What

| # | Feature | Decision |
|---|---------|----------|
| 1 | Older Gmail history | `POST /emails/sync/older` walks Gmail backwards from a **per-account backfill cursor** (`settings` key `gmailBackfill:<accountId>` = `{ cursor: epochSeconds, exhausted }`, no schema change). The cursor is the oldest *scanned* message, not the oldest *imported* one, so a page of skipped mail (newsletters, bulk, outbound-only) still advances it; up to 3 pages of 50 are walked per call until something imports. The cursor is cleared on Gmail disconnect. Query: `before:<cursor> -category:promotions -category:social`. Import is *quiet*: no notifications, no `email:new` socket events, no unread flag, no drafts. Response `{ imported, scanned, hasMore, oldest }`. The inbox shows **Load older from Gmail** once the local list is exhausted (All tab, no search). |
| 2 | Spreadsheet import | `POST /leads/import` (multipart `file`, `?dryRun=true` for preview). CSV / TSV / XLSX parsed with SheetJS; headers normalized to snake_case and matched against an alias table (first_name, last_name, name, email, phone, title, company, website, source, status, notes, linkedin). Rows classified **create / skip / error**: invalid email → error, no name and no email → error, email already a lead or duplicate in file → skip. Company by name (case-insensitive), else website domain, else email domain (free-mail skipped), else created. Max 5000 rows per file. UI: Leads → **Import** modal with dropzone, mapping chips, preview table, then import. |
| 3 | Link thread to company | `POST /emails/threads/:id/link { companyId }`: the thread's counterpart becomes a lead (found by email or created) attached to that company; the thread links to that lead and company. `{ leadId }` remains for programmatic re-linking. UI: header button and context menu say **Link to company…** / **Move to another company…**; the modal offers existing companies or **+ New company**. |
| 4 | Drafts on request | `autoDraftReplies` default flips to **false** and is now actually honored by the Gmail import path (it was stored but never read). Users click **Generate reply** in the draft panel. Admin → Integrations toggle re-enables auto-drafting. |
| 5 | Toggle fix | The knob `<span>` was `absolute` without `left`, so its static position was the button's centered content → it slid outside the track. Now `left-0.5` + `translate-x-0 / translate-x-4`, button `p-0 inline-block shrink-0`. |
| 6 | Opened in list | `ThreadDto.lastOutStatus` = status of the most recent outbound message. The list shows an Opened / Clicked / Bounced badge (nothing for plain "sent"). |

## API additions
- `POST /emails/sync/older` → `{ imported, scanned, hasMore, oldest }`
- `POST /leads/import?dryRun=true|false` (multipart `file`) → `{ mapping, total, toCreate, toSkip, errors, preview[], created? }`
- `POST /emails/threads/:id/link` body now `{ leadId?: string | null; companyId?: string }`
- `GET /emails/threads` items gain `lastOutStatus: string | null`

## Code map
- Backend: `services/spreadsheetService.ts` (new), `managers/leadManager.ts` (`importMapping`, `importRows`), `managers/emailManager.ts` (`syncOlder`, `linkThreadToCompany`, quiet import, `lastOutStatus`), `repositories/emailRepository.ts` (`oldestMessageAt`), `repositories/companyRepository.ts` (`byName`), `controllers/leadController.ts` (`importFile`), `controllers/emailController.ts`, `routers/index.ts`.
- Frontend: `components/leads/ImportLeadsModal.tsx` (new), `pages/LeadsPage.tsx` (Import button), `pages/InboxPage.tsx` (load older, status badge, `LinkCompanyModal`), `components/ui/Toggle.tsx`, `pages/AdminIntegrationsPage.tsx` (copy), `api/index.ts`, `types/index.ts`.
- New backend dependency: `xlsx` (SheetJS 0.20.3 from cdn.sheetjs.com; the npm registry copy is stale).

## No schema change
All features use existing tables. `email_messages.status` already carries opened/clicked/bounced.

## Open points
- Backfill is per user (their own Gmail account); admins see other users' threads but can only backfill their own.
- Import does not update existing leads; a re-import skips them. A "update existing" mode can be added later if needed.

## Calendar: time-proportional events (added 2026-10-19)
- Each day column is a positioned layer over the hour rows (`HOUR_PX = 56`, matching `h-14`). An event's `top` and `height` derive from its start time and duration within 08:00–19:00; events are clamped to that window.
- Overlapping events in a day are laid out side by side (greedy column assignment per overlap cluster).
- Events shorter than ~40px show a single line (start time + title); longer ones show the time range and the title.

## Two-way archive sync with Gmail (added 2026-10-19)
**Why:** archiving in one place and still seeing the thread in the other was confusing.

| Direction | Mechanism |
|---|---|
| CRM → Gmail | `POST /emails/threads/:id/archive` now also calls `threads.modify` on Gmail: archive removes the `INBOX` label, unarchive adds it. The local change always applies; the response carries `gmailSynced` (toast says "in CRM and Gmail" or "Gmail not updated"). Scope `gmail.modify` was already granted, no re-consent. |
| Gmail → CRM | `history.list` now also asks for `labelAdded` / `labelRemoved`. For every thread whose `INBOX` label changed, `reconcileArchived` fetches the thread (minimal) and sets `archived = no inbound message carries INBOX`. Changes emit `email:updated`, which the inbox list listens to. |
| New / backfilled mail | A newly imported inbound message without `INBOX` creates the thread as archived (e.g. old mail during "Load older"); a new inbound message that *is* in INBOX un-archives an archived thread, matching Gmail's own behaviour. |

| Lost history (added 2026-10-20) | When the account has no history cursor (first sync) or Gmail expired it (404), `syncAccount` also re-reads the archive state of the account's most recently active threads (`GMAIL_ARCHIVE_RECONCILE_LIMIT`, 100) so archives made in Gmail during the gap are not missed. |
| Sent mail (added 2026-10-23) | Mail composed in Gmail is autosaved as a DRAFT (skipped on import); sending it only adds `SENT` with no new `messageAdded`, so `syncAccount` also imports every message whose history shows `labelsAdded: SENT`. When the cursor is missing, sent mail is listed separately (`in:sent`, `GMAIL_SENT_CATCHUP_DAYS` 30 / max 200) so inbound volume cannot crowd it out. A one-time per-account repair (setting `gmailSentRepair:v1:<account>`) pulls the last 90 days of sent mail (max 500). Fetches that fail for a reason other than 404 are kept in setting `gmailRetry:<account>` and retried on later syncs, up to `GMAIL_IMPORT_MAX_ATTEMPTS` (5) tries. |
| Gmail quota (added 2026-10-23) | Production hit Gmail's per-user quota during the sent-mail repair, so most fetches failed and were dropped after 5 tries. Now a quota error (429 / 403 rate-limit / "Quota exceeded") puts the account in a 60 s cool-down (`googleService.coolDown`). During it, sync, backfill, archive reconcile and attachment downloads skip Gmail calls. Remaining ids carry over to the next sync without using up an attempt. Each sync fetches at most `GMAIL_IMPORT_MAX_PER_SYNC` (100) messages. The repair flag moved to `gmailSentRepair:v2:<account>` so it runs again. |

Rules: threads with only outbound messages (sent, never answered) never carry `INBOX` in Gmail, so they are left alone. TRASH / SPAM / DRAFT messages are ignored. Polling and Pub/Sub both go through `syncAccount`, so both pick up Gmail-side archives.

## Conversation pane: newest first, folded quotes (added 2026-10-19)
- Messages render newest → oldest. The newest is expanded; older ones collapse to a one-line header (sender · preview · date · status) and expand on click.
- `frontend/src/lib/quotedText.ts` splits a body into the author's own text and the quoted trail. Markers: lines starting with `>`, Gmail/Apple "On … wrote:" (including the wrapped two-line form), Hebrew "בתאריך … כתב/ה:", Outlook "-----Original Message-----" and `From:` header blocks (only when followed by Sent/Date/To/Subject), "---------- Forwarded message ---------", and French/German/Spanish variants. The trail is folded behind "Show quoted text (N lines)".
- Backend order (`sent_at ASC`) is unchanged; drafts and send logic still rely on it.

## Bidirectional text (Hebrew / English) — added 2026-10-20
**Decision:** the product UI stays English and LTR. Only *user content* becomes direction-aware.

- **Fonts:** `Heebo` added after Inter in `--font-sans` / `--font-heading` (Inter ships no Hebrew glyphs; Heebo is the Hebrew-first companion with matching metrics).
- **Mechanism:** `dir="auto"` on every element that renders user content (lead/company names, titles, email subjects, snippets, message bodies, quoted trails, drafts, notes, activity text, notifications, meeting titles, knowledge titles, toasts). The browser picks the direction from the first strong character, so Hebrew flows RTL and mixed strings ("סמנכ״לית שיווק (CMO)") keep their inner order.
- **Alignment rules (`index.css`):** `[dir="auto"]` gets `unicode-bidi: plaintext; text-align: left` so single-line labels stay anchored to the LTR layout's left edge (Gmail behaviour). Multi-line bodies (`pre[dir="auto"]`, `textarea[dir="auto"]`, `.bidi-plain`) use `text-align: start`, so a Hebrew paragraph right-aligns inside its card and each paragraph picks its own direction.
- **Inputs:** `Input`, `Textarea` and `Badge` default to `dir="auto"`; typing Hebrew flips the field to RTL automatically. Placeholders stay English/LTR while empty.
- **Chrome untouched:** navigation labels, page titles, card titles, context-menu items and buttons have no `dir` attribute.

## Inbox round 3 (2026-10-20)
| # | Change | Decision |
|---|---|---|
| 1 | Archive from the list | Hover (or keyboard-focus) icon button on each thread row, right column under the unread dot. Uses the same archive flow (CRM + Gmail label). |
| 2 | Unlinked indicator | The "Unlinked" badge is replaced by a small amber link icon with a tooltip; linked threads still show the company chip. |
| 3 | Archive → next | After archiving the open thread, the view jumps to the next thread in the list (or the previous one at the end, or the empty state). The row is removed optimistically, then the list reloads. |
| 5 | Lead/company box | `ThreadContextCard` sits at the top of the right column above the suggested reply: lead (name, status, title, email, phone) and company (logo, name, lead count, industry · location, domain), each linking to its page. Hidden for unlinked threads. `DraftPanel` is now a flex child of that column instead of owning the 380px aside. |
| 6 | Mail privacy | `accountIdsFor` returns only the caller's own Gmail account for every role. Admins no longer see other users' threads, unread counts, tracking events or dashboard mail stats. Admin → Integrations still lists connected accounts (status only, no mail). |
| 4 | Tasks from email | Designed, awaiting schema approval: see `2026-10-20_tasks-from-email_design.md`. |
