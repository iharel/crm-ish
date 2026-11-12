# Looper CRM — Design Document

**Date:** 2026-10-17 · **Status:** APPROVED 2026-10-17 (owner) · implemented, see `2026-10-17_crm_implementation.md` · **Owner:** Alex Morgan

## 1. Why

The team needs a lightweight, AI-assisted CRM that lives close to the inbox: leads and companies are tracked in one place, Gmail conversations are pulled in and answered from the CRM, and an AI layer drafts replies grounded in our own company knowledge. Off-the-shelf CRMs are heavy, expensive per seat, and do not let us wire our own AI steps.

## 2. What (scope v1)

| # | Capability | Summary |
|---|---|---|
| 1 | Multi-user & auth | Email/password login, JWT sessions, roles `admin` / `member`. Admin CRUDs users. |
| 2 | Leads | Lead = prospect person. Configurable status pipeline. Kanban + List views. AI enrichment step. |
| 3 | Companies | Lead belongs to one company; company has many leads. Company profile + knowledge. |
| 4 | Email (Gmail only) | Admin configures Google OAuth client; each user connects their Gmail. Threads pulled via Gmail API + Pub/Sub watch; send from CRM. Threads auto-linked to leads by email address. |
| 5 | AI suggested replies | For every inbound email, an AI draft reply is proposed (RAG over company knowledge + lead context). User edits / sends / dismisses. |
| 6 | Company knowledge | Upload docs (PDF/DOCX/MD/TXT) and website URLs to crawl → chunked, embedded, stored. Used by (5) and by lead enrichment. |
| 7 | Scheduling | User stores scheduling link (Calendly etc.) and connects Google Calendar. AI can propose/insert meeting slots in drafts and create events. |
| 8 | Email tracking | Open pixel per sent message, link-click redirect, bounce detection from Gmail bounce messages. Delivery/open/click/bounce events on the thread. |
| 9 | Realtime | Socket.IO channel per user: new email, enrichment done, draft ready, status change, notifications. |
| 10 | Themes | Dark & light, CSS variables, system default + manual toggle. |

Out of scope v1: Outlook/IMAP, multi-tenant orgs, billing, mobile apps, SMS/calls.

## 3. Key decisions (made by owner unless noted)

| Decision | Choice | Rationale |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind v4 + react-router | Owner requirement. Tailwind v4 CSS-variable theming makes dark/light trivial. |
| Backend | Node 22 + Express + TypeScript + Socket.IO | Owner requirement (Node + websocket). |
| Database | SQLite (better-sqlite3) local-first; embeddings stored as Float32 BLOB with cosine KNN in JS (sqlite-vec deferred, see implementation plan) | Local-first principle; team-size CRM; zero-ops. Migrate to Postgres+pgvector later if needed — repositories isolate this. |
| Auth | Email/password (argon2) + JWT access (15m) + refresh (httpOnly cookie). | Simple, no third-party dependency. Google OAuth is used **only** for Gmail/Calendar access, not login (v1). |
| Email provider | Gmail API via Google OAuth 2.0 (`gmail.modify`, `gmail.send`, `calendar.events`). Gmail push via Pub/Sub watch with polling fallback. | GSuite only per requirement. |
| RAG | **Yes, lightweight RAG.** Chunk (≈800 tokens, 100 overlap) → embed → `sqlite-vec` KNN → top-k into draft prompt. | Company docs will exceed context quickly, and we want citations. Full agentic RAG not needed in v1. |
| LLM | Anthropic Claude via SDK. Drafts: `claude-sonnet-5`. Enrichment/classification: `claude-haiku-4-5-20251001`. Embeddings: Voyage AI (`voyage-3`). | Best quality/cost split; providers are behind a `LlmService` interface. |
| Lead statuses | Table `lead_statuses` (name, color, order, is_won, is_lost). Kanban columns = statuses. | Configurable pipeline requirement. |
| Lead ↔ email linking | By exact email address match on lead or company domain match. Manual relink allowed. | Deterministic; avoids false links. |
| Tracking pixel | `GET /t/o/:token.gif` (open) and `GET /t/c/:token?u=` (click). Token = HMAC of messageId. | Standard approach; must be publicly reachable (deploy URL). |
| Realtime | Socket.IO, rooms per `user:{id}` and `workspace`. | Owner requirement; reconnection/rooms built-in. |
| Layering | Router → Controller (authN/authZ) → Manager → Repository → DbAccessor; Services for side-work. | Owner coding guideline. |
| Mockups | Lazy-loaded routes under `/design/*`, index at `/design/index`, design system at `/design/design-system`, guide at `/design-guide`. Each mockup has copy-name button and `data-cmp` on every element. | Owner guideline. |

## 4. Architecture

```
frontend (React/Vite)  ──HTTP /api──▶  backend (Express)
        ▲   │                              │ Socket.IO (events)
        └───┴──── ws ──────────────────────┘
                                     ├── SQLite (data + vectors)
                                     ├── Gmail API / Calendar API (per-user OAuth tokens)
                                     ├── Pub/Sub push (gmail watch) → /api/webhooks/gmail
                                     ├── Anthropic (drafts, enrichment) · Voyage (embeddings)
                                     └── Crawler/Parser (website, PDF, DOCX)
```

Backend folders: `routers/`, `controllers/`, `managers/`, `repositories/`, `dbAccessors/`, `services/`, `middleware/` (auth, authorization, validation), `constants.ts`.

Frontend folders: `components/`, `pages/`, `mockups/`, `design-system/`, `api/` (per domain), `http/` (common client, error handling), `services/` (browser APIs: storage, theme, notifications, socket), `types/`.

## 5. Data model (SQLite) — **requires approval**

```
users(id, email UNIQUE, password_hash, name, role[admin|member], avatar_url, scheduling_link, timezone, working_hours_start, working_hours_end, is_active, must_change_password, created_at, updated_at)
refresh_tokens(id, user_id FK, token_hash, expires_at, created_at)
google_oauth_config(id=1, client_id, client_secret_enc, redirect_uri, pubsub_topic, updated_by, updated_at)
google_accounts(id, user_id FK, email, access_token_enc, refresh_token_enc, expiry, scopes, history_id, watch_expiry, calendar_id, status, last_sync_at, last_error, created_at)
lead_statuses(id, name, color, sort_order, is_won, is_lost, is_default)
companies(id, name, domain, website, industry, size, location, description, logo_url, linkedin_url, enrichment_json, enriched_at, owner_id FK, created_at, updated_at)
leads(id, first_name, last_name, email, phone, title, company_id FK, status_id FK, owner_id FK, source, score, linkedin_url, notes, enrichment_json, enriched_at, last_activity_at, created_at, updated_at)
lead_activities(id, lead_id FK, user_id FK, type[note|status_change|email|meeting|enrichment|system], payload_json, created_at)
email_threads(id, google_account_id FK, gmail_thread_id, subject, snippet, lead_id FK?, company_id FK?, last_message_at, unread, archived, created_at)
email_messages(id, thread_id FK, gmail_message_id, direction[in|out], from_addr, to_json, cc_json, bcc_json, subject, body_text, body_html, sent_at, tracking_token, status[queued|sent|delivered|opened|clicked|bounced], created_at)
email_events(id, message_id FK, type[open|click|bounce|delivered], ip, user_agent, url, created_at)
email_drafts(id, thread_id FK?, lead_id FK?, user_id FK, kind[reply|new|follow_up], subject, body_html, body_text, citations_json, slots_json, model, confidence, status[proposed|edited|sent|dismissed], created_at, updated_at)
knowledge_sources(id, type[document|website], title, url, file_path, mime, status[pending|processing|ready|failed], error, chunk_count, created_by FK, created_at, updated_at)
knowledge_chunks(id, source_id FK, chunk_index, content, token_count, metadata_json, embedding BLOB float32[1024])
meetings(id, lead_id FK, user_id FK, google_event_id, title, starts_at, ends_at, meet_link, status, created_at)
notifications(id, user_id FK, type, title, body, link, read_at, created_at)
settings(key PRIMARY KEY, value_json, updated_at)
```

## 6. API surface (v1, all `/api`, JSON, 200 on success / 4XX on failure)

- `auth`: POST login, POST logout, POST refresh, GET me
- `users` (admin): GET list, POST create, PATCH :id, DELETE :id, POST :id/reset-password
- `lead-statuses`: GET, POST, PATCH :id, DELETE :id, POST reorder
- `leads`: GET (filters, view), POST, GET :id, PATCH :id, DELETE :id, POST :id/enrich, POST :id/move, GET :id/activities, POST :id/activities
- `companies`: GET, POST, GET :id, PATCH :id, DELETE :id, POST :id/enrich
- `google`: GET oauth-config (admin), PUT oauth-config (admin), GET connect-url, GET callback, DELETE account/:id
- `emails`: GET threads, GET threads/:id, POST send, POST threads/:id/reply, POST threads/:id/link, POST sync
- `drafts`: GET (by thread/lead), POST generate, PATCH :id, POST :id/send, POST :id/dismiss
- `knowledge`: GET sources, POST upload (multipart), POST website, DELETE :id, POST :id/reindex, POST search (debug)
- `calendar`: GET availability, POST meetings, GET meetings
- `tracking` (public): GET /t/o/:token.gif, GET /t/c/:token
- `webhooks` (public, verified): POST gmail
- `notifications`: GET, POST read-all, PATCH :id/read
- Socket events: `email:new`, `email:event`, `lead:updated`, `lead:enriched`, `draft:ready`, `knowledge:status`, `notification:new`

## 7. Screens (mockup list)

login · dashboard · leads-kanban · leads-list · lead-detail · companies · company-detail · inbox · compose · knowledge · calendar · admin-users · admin-integrations · settings-statuses · tracking · notifications · design-guide · design-system

## 8. Open questions for owner

1. Should lead enrichment call an external data provider (Clearbit/Apollo) or rely on LLM + website scraping only? **Default: LLM + scrape of company website/LinkedIn-public.**
2. Single workspace (one team) in v1? **Default: yes.**
3. Attachments on sent emails in v1? **Default: receive & show; send without attachments.**

## Decision log addendum (2026-10-17, production launch)

- **SQLite driver → node-sqlite3-wasm.** better-sqlite3's prebuilt native binary segfaults (`SIGSEGV`, exit 139) on `new Database()` inside Looper's `node:20-slim` arm64 production image. All DB access already went through `dbAccessor` helpers (`all/get/run/tx`), so the swap touched one file. Trade-off: no WAL mode; acceptable for the CRM's write volume.
- **Combined container mode.** Looper wires the frontend's Vite proxy to `localhost:<backend port>`; in split mode the two runners sit in separate network namespaces, so the app runs as one combined container.
- **`BACKEND_PORT` precedence over `PORT`.** In a combined container Looper's `PORT` is the entry (frontend) runner's; the backend reads `BACKEND_PORT` first.
- **Supervised production start.** `scripts/run-dev.mjs` runs plain `tsx` when `CRM_SUPERVISED=1`, logging exit code/signal and restarting, because `tsx watch` swallows a crashed child and waits forever.

## UI convention (2026-10-17): vendor deep links on integration settings

Every integration setting shows a `VendorLink` (frontend/src/components/common/VendorLink.tsx) that opens the vendor page where the value is created or managed, in a new tab. URLs live in `frontend/src/lib/vendorLinks.ts`. Current targets: Google Cloud Console credentials, OAuth consent screen, Gmail/Calendar API enablement, Pub/Sub topics; Anthropic Console API keys and model reference; Voyage AI dashboard keys. New integration fields must ship with a matching link.
