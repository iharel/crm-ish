# Looper CRM — Product Requirements Document

**Version:** 1.0 (2026-10-17) · **Status:** Implemented (v1)

## Problem
Sales conversations live in Gmail, lead state lives in spreadsheets, and company knowledge lives in people's heads. Replies are slow and inconsistent.

## Goal
One local-first workspace where the team tracks leads/companies, reads and answers Gmail threads, and gets AI-drafted replies grounded in our own documents, with meeting scheduling and delivery tracking built in.

## Users
- **Admin** — sets up Google OAuth, manages users, configures pipeline statuses, uploads company knowledge.
- **Member** — owns leads, connects Gmail/Calendar, works the inbox, sends/accepts AI drafts.

## Functional requirements
| ID | Requirement | Priority |
|---|---|---|
| F1 | Email/password login; roles admin/member; admin CRUD users | P0 |
| F2 | Leads with configurable statuses; Kanban and List views; create/edit/delete | P0 |
| F3 | Companies with many leads; company detail page | P0 |
| F4 | AI enrichment of lead and company (title, industry, size, summary, socials) | P1 |
| F5 | Admin sets Google OAuth client; user connects Gmail; threads synced in near-realtime | P0 |
| F6 | Send new emails and replies from CRM through user's Gmail | P0 |
| F7 | AI reply draft on request (per thread), grounded by RAG on company knowledge; optional auto-draft per workspace | P0 |
| F8 | Knowledge surface: upload documents and website URLs; indexing status | P0 |
| F9 | Scheduling link per user; Google Calendar connect; AI proposes slots and books meetings | P1 |
| F10 | Tracking pixel: open, click, bounce events shown per message | P1 |
| F11 | Realtime updates and notifications via WebSocket | P0 |
| F12 | Dark and light themes | P0 |
| F13 | Import leads from CSV/TSV/XLSX with preview, dedupe by email and company auto-match | P1 |
| F14 | Backfill older Gmail history on demand (next 50 messages before the oldest imported) | P1 |
| F15 | Tasks from email: AI-suggested title + summary, links to thread/lead/company, private to creator | P1 |

## Non-functional
- Local-first: SQLite, no cloud dependency except Google and LLM APIs.
- All API failures return 4XX with structured error `{ code, message }`.
- Every HTML element carries a unique `data-cmp` attribute.
- WCAG AA contrast in both themes.

## Success metrics
- Median time from inbound email to reply < 10 min with AI drafts.
- 100% of inbound emails from known leads auto-linked.
- Draft acceptance (sent with ≤ minor edits) > 50%.

## Milestones
1. Design doc approval → 2. Mockups → 3. Auth + users + leads/companies → 4. Gmail sync/send → 5. Knowledge + RAG drafts → 6. Calendar + tracking → 7. Polish/themes/notifications.


## Inbox & Leads polish (2026-10-17)
- Inbox threads: right-click context menu (Open, Reply, Archive/Unarchive, Create lead from sender, Link to lead, Delete from CRM). Delete is CRM-only; Gmail untouched.
- Leads are opt-in: `autoCreateLeads` defaults to **off**; unknown senders stay Unlinked until converted. Admin → Integrations toggle turns automatic creation back on.
- Inbox list paginates with infinite scroll (cursor `before=lastMessageAt`, 40 per page).
- Kanban cards: right-click context menu (Open, Move to → status, Enrich with AI, Archive/Unarchive, Delete lead). Archived leads leave the board and are reachable via the Archived toggle.
- Companies show a logo (Google favicon service by domain, initials fallback) in the table and detail header; enrichment persists it.
- "Powered by Looper.ing" credit in the sidebar footer and login page.

## Inbox & Leads additions (2026-10-19)
- **Older mail**: "Load older from Gmail" at the end of the inbox list backfills the next 50 messages older than the oldest in the CRM (`POST /emails/sync/older`). Quiet import: no notifications, no unread flags, no drafts.
- **Spreadsheet import**: Leads → Import accepts `.csv` / `.tsv` / `.xlsx`. Preview classifies each row (create / skip existing email / error), then imports. Companies matched by name, else by website or email domain, else created.
- **Link to company**: inbox threads are linked to a **company**; the sender becomes a lead of that company (created if needed). Replaces "Link to lead".
- **Reply drafts on request**: `autoDraftReplies` defaults to **off**; drafts are generated from the draft panel's "Generate reply". Admin → Integrations can turn auto-drafting on.
- **Toggle**: knob anchored inside the track (regression fix).
- **Opened in list**: the inbox list shows the last outbound message status (Opened / Clicked / Bounced).
- **Bidi text**: Hebrew/English user content (names, subjects, bodies, notes, inputs) is direction-aware via `dir="auto"`; the UI itself stays English/LTR. Heebo font supplies Hebrew glyphs.
- **Inbox round 3**: archive button on each row; unlinked shown as an amber icon; archiving jumps to the next thread; linked lead/company box on the right; mail is private per user (admins included).
- **Archive sync (2-way)**: archiving in the CRM removes the Gmail INBOX label (and back); archiving in Gmail is picked up on the next sync via label history and reflected in the CRM.

## Email images & attachments (2026-10-20)
- Attachments (named parts and cid-referenced inline images) are recorded per message and **downloaded at import** into `UPLOAD_DIR/attachments`; mail imported earlier is scanned on first open.
- Messages with an HTML part render **sanitized HTML** (server-side allow-list): inline `cid:` images appear in place; scripts, styles, forms and `javascript:` links are stripped; remote `https` images stay blocked behind a per-message "Load remote images" button.
- Non-inline attachments show under the body: image attachments as a thumbnail gallery with a lightbox, other files as chips with a download link. A paperclip marks threads and messages that carry attachments.
- Bytes are served by `GET /api/emails/attachments/:id` through a user-bound signed url (2 h expiry) so `<img>` tags never carry the session token.
- Sending attachments is out of scope for now.

## Resizable & collapsible panels (2026-10-20)
- Left navigation (every page), inbox thread list and inbox right panel resize by dragging their edge handle and collapse/expand with a tiny pill button on the handle. Double-click resets the default width; Arrow keys nudge and Enter toggles when the handle is focused.
- Collapsed navigation becomes a 56 px icon rail with tooltips and badges. Collapsed inbox panels hide fully; the handle button brings them back.
- Widths and collapsed state persist per browser in the prefs blob (`panel.<name>.width` / `.collapsed`).

## Reply all & company suggestions (2026-10-20)
- **Reply all** in the reading header and the thread context menu: To = sender of the latest inbound message, Cc = its other recipients minus you, de-duplicated. Compose opens titled "Reply all" with Cc pre-filled.
- **Company suggestions by email domain**: a thread or lead without a company whose email domain matches an existing company (exact, parent domain, or website host; free-mail domains ignored) carries `suggestedCompany`. Inbox rows show a dashed "Acme?" chip, the header and right panel offer one-click "Link to Acme", lead detail offers it in the Company card, and the company page lists all suggested leads/threads with "Link all". Nothing is linked automatically.

## Inbox tabs & ordering (2026-10-20)
- Tabs (updated 2026-11-12): **Inbox** (default, not archived; only threads with inbound mail, ordered and dated by when the latest inbound email arrived — your own replies never move a row) · **Threads** (every non-archived conversation, received or sent, ordered and dated by its latest message either way) · **Sent** (threads with at least one outbound message, any archive state; sorted, paged and dated by your latest sent message, like Gmail's Sent — so a reply in an old thread shows at the top) · **Unread** · **Unlinked** · **Archived** · **All** (archived and not).
- Sending a reply (from the CRM or seen via Gmail sync) no longer moves the thread to the top: `last_message_at` only advances on inbound mail. The snippet still reflects the latest message.

## Company domains (2026-10-20, migration 005)
- A company owns **many domains** (`company_domains`), the first being primary (kept in `companies.domain` for lists and logos). The company form has a Domains chips field; the first chip is primary, the star re-orders, each chip is checked live.
- **Domains are unique across companies**: creating or editing with a domain another company owns fails with `409 DOMAIN_TAKEN` naming that company. `GET /companies/check-domain?domain=` reports the owner.
- Suggestions, auto-create on inbound mail and spreadsheet import match on any owned domain, most specific first (a subsidiary on `eu.acme.com` wins over `acme.com`).
- Backfill: existing domains were copied in; a duplicated domain stays with the older company and the newer one's domain is cleared and logged once at boot.

## Inbox fast switching (2026-10-20)
- Opening a thread never waits on Gmail:
  - Attachment scans run in the background and emit `thread:scanned`.
  - Sanitized HTML is cached server-side in an LRU (300 entries / 24 MB).
- `GET /threads/:id` has no side effects. Mark-read is a separate `POST /threads/:id/read`.
- Client side uses a bounded stale-while-revalidate cache: up to 60 threads, with hover and neighbour prefetch capped at 6 requests in flight. The client never holds the whole mailbox.
- Text first: only the newest message's HTML is in the thread payload. Older messages load their HTML on expand (`GET /emails/messages/:id/html`) and show their text meanwhile.
- Images and attachment thumbnails load lazily behind shimmers.
- Responses are gzipped, and signed image urls are stable per hour so the browser cache hits.
- Shimmer skeletons cover the list, reading pane, messages, draft panel and context card.

## Email signature (2026-10-20)
- Per-user plain-text signature, edited in Settings → Signature with a live preview.
- Toggles for new emails and for replies (replies include sent AI drafts).
- Per-email on/off in compose.
- Appended server-side at send time. No schema change (`settings` table).

## Inbox list sender (2026-10-20)
- Each inbox row shows the sender of the **newest** message, not whoever started the thread. If you sent the newest message, the row shows "You".
- The newest sender comes from the thread-list query, so there is no extra round trip. No schema change. `counterpart` still drives Reply and "Create lead from sender".

## Deals (2026-11-12)
- A **deal** belongs to one company and has leads. Every company has one deal; the user can **split** a company into more (company page → Deal card).
- The pipeline status lives on the deal: "the company is Won" = its deal is Won. All leads of a single-deal company share the status, and moving one lead moves the deal. A lead without a company keeps its own status.
- After a split, a lead can be in one or more deals; it shows once per deal in the Kanban and has one status per deal on its page.
- Deals carry a name, status, owner, amount and expected close date.
- Dashboard pipeline and win rate count deals (plus company-less leads), not individual leads.
- **Deals view (2026-11-12):** the Leads page has a `Leads | Deals` switch (Kanban and List). A deal is titled with the company name, plus the deal name when the company has several deals, and shows its **contact person** (one of its leads, chosen in the deal form; the first lead until chosen).

## Email rendering polish (2026-11-12)
- **Image ratio:** images inside a mail body always keep their original ratio; inline width/height styles written by mail clients no longer squash an image narrowed to fit the reading pane.
- **Text direction by content:** the mail body aligns to its own start edge and every paragraph, heading, list and table cell picks RTL/LTR from its own text (a Hebrew paragraph in an English mail flows and aligns right). Elements with an explicit `dir` and the mail's own centering are kept; table column order is never flipped. Replies we send carry `dir="auto"` per paragraph (and on the signature) so recipients see the right direction too. AI-draft citation snippets align by content.

## Suppliers (2026-11-12)
- A company can be marked as a **supplier** (`companies.is_supplier`). The Companies page has two tabs: **Companies** and **Suppliers** (`/companies?tab=suppliers`).
- A supplier has **no deal by default**; a deal can be added from its page with chosen contacts, and its last deal can be deleted. Marking an existing company as a supplier **keeps its deals**; marking it back as a regular company restores the default deal.
- Supplier contacts are ordinary people records. Those in no deal are **hidden from the Leads pipeline, the Deals view and dashboard pipeline numbers**; they show on the supplier's page, their own page and the Inbox.
- Set a supplier from: the company form (Supplier switch), the company page / Companies right-click menu, or the Inbox ("Set as supplier" on a thread — flags or creates the company by email domain; a free-mail sender asks for the company).
- AI reply drafts are told when the counterpart is a supplier so they do not pitch.


## Archived mail and imports (2026-11-12)
- A thread first seen through one of our own replies takes its archive state from the first inbound message imported into it: no INBOX label in Gmail = archived in the CRM. Before this, such conversations (archived in Gmail, replied to) landed in the Inbox after "Load older from Gmail" or a sent-mail catch-up.
- One-time repair per account on the next sync: the newest 200 inbox threads are re-checked against Gmail and archived where Gmail has them archived.

## Sent rows in the email list (2026-11-12)
- When the newest message of a thread is one we sent, the row shows `To: <recipients>` (names, else addresses) instead of "You", the avatar is the first recipient's, and the delivery tag is always shown — including plain **Sent** (opened / clicked / bounced replace it as before).

## Link thread to company (2026-11-12)
- The dialog uses an auto-complete company picker: typing filters existing companies by name or domain; a name matching none is offered as "Create …". A typed name equal to an existing company resolves to it.
- For an unlinked thread the name is pre-filled from the sender's email domain (not for free-mail senders).
- Linking to a new name is one server call (`POST /emails/threads/:id/link { companyName }`): exactly one company is created, with the sender's domain when it is not free-mail and not owned by another company. Previously the named company and a second domain-derived company were both created.

## Document signing (2026-11-13)
- Send 1–10 PDFs as one signing request; signers get one merged, signed PDF with a certificate page.
- Fields: signature (draw or type), initials, full name, date signed (automatic), text, checkbox; each assigned to one signer, required or optional.
- Recipients: signers and copy recipients; auto-complete from the company's contacts, team members and other contacts, or any typed email. Optional signing order.
- Each recipient has a private link (no login). Optional 6-digit emailed code before the document opens. Consent to sign electronically is recorded.
- Reminders configured at send (first after N days, every M days, at most K), manual "Remind", optional expiry date.
- Decline (with reason), void, duplicate, templates. A sent request cannot be edited.
- Full activity record with time, IP and browser; SHA-256 of each original file and of the signed result.
- Visible to the sender and admins; other users see status only on the company page.
