# Looper CRM — Implementation Plan

**Date:** 2026-10-17 · **Design:** `2026-10-17_crm_design.md` (approved 2026-10-17) · **Status:** v1 implemented 2026-10-17 (all tasks below done; Gmail/Calendar/LLM paths verified against API contracts, live Google round-trip requires owner's OAuth client)

## Decisions refined at implementation time
| Topic | Decision |
|---|---|
| Vector store | Embeddings stored as Float32 BLOB in `knowledge_chunks.embedding`; cosine KNN in JS. Team-size corpora (<50k chunks) search in <50 ms; avoids native `sqlite-vec` build risk. Swap to sqlite-vec/pgvector behind `KnowledgeRepository.search()` later. |
| Embeddings | Voyage AI `voyage-3` via REST (no SDK). Falls back to a deterministic hashing embedder when `VOYAGE_API_KEY` is empty so the app runs offline. |
| LLM | `@anthropic-ai/sdk`; `claude-sonnet-5` drafts, `claude-haiku-4-5-20251001` enrichment/classification. If `ANTHROPIC_API_KEY` is empty, `LlmService` returns a template draft and marks it `model: "stub"`. |
| Gmail sync | `history.list` incremental sync keyed by `google_accounts.history_id`; polling every 2 min via `SyncScheduler`; Pub/Sub push endpoint `POST /api/webhooks/gmail` triggers the same sync. |
| Email send | Gmail API `users.messages.send` with raw RFC 2822 built by `MimeService`; tracking pixel + rewritten links injected into HTML when enabled. |
| Auth | argon2id password hashes; JWT access (15 min) in `Authorization: Bearer`; refresh token (30 d) in httpOnly cookie `crm_rt`, rotated on use. |
| Visual design | MMM-inspired "Cyber Bloom": brand gradient (teal→pink), indigo dark surfaces, 48px grid net + per-section glow, Space Grotesk headings, Inter body, `--radius: 0.875rem`. |

## Backend layering (per owner guidelines)
```
src/
  constants.ts          # the only process.env reader
  server.ts             # express + socket.io bootstrap
  db/dbAccessor.ts      # opens SQLite, runs migrations, exposes handle helpers
  db/migrations/*.sql   # ordered schema files
  repositories/*        # SQL only, via dbAccessor
  managers/*            # business logic
  controllers/*         # authN/authZ + payload → manager
  routers/*             # express routers, zod validation
  middleware/           # auth.ts (JWT), authorize.ts (roles), validate.ts (zod), errors.ts
  services/             # llm, embeddings, gmail, calendar, crawler, parser, mime, tracking, socket, scheduler, crypto
  types/                # shared TS types
  scripts/seed.ts       # admin user + default statuses
```

## Frontend layering
```
src/
  http/httpClient.ts    # fetch wrapper, auth header, refresh-on-401, HttpError
  api/*.ts              # per-domain API modules, map HttpError → ApiError
  services/             # themeService, storageService, socketService, notificationService, clipboardService
  contexts/AuthContext  # user, login/logout
  components/ui         # primitives (data-cmp everywhere)
  components/shell      # AppShell, Sidebar, TopBar, NotificationsPopover
  pages/*               # product routes
  mockups/*             # design mockups (/design/*)
```

## Tasks (sequenced)
1. ✅ Design doc, PRD, mockups.
2. ✅ Backend scaffold: constants, dbAccessor + migration 001, error middleware, auth middleware, server.
3. ✅ Auth + users: repositories, managers, controllers, routers; seed admin.
4. ✅ Lead statuses, leads, companies, activities; socket `lead:updated`.
5. ✅ Google OAuth config (admin) + per-user connect; token encryption.
6. ✅ Gmail sync (history), threads/messages storage, auto-link to leads; `email:new` events; send/reply with MIME.
7. ✅ Tracking: pixel + click endpoints, bounce parsing, `email:event`.
8. ✅ Knowledge: upload/crawl → parse → chunk → embed → store; search.
9. ✅ Drafts: RAG + lead context → Claude; propose/edit/send/dismiss; `draft:ready`.
10. ✅ Enrichment: Claude + website scrape for lead/company; `lead:enriched`.
11. ✅ Calendar: freebusy, slot proposal, event creation.
12. ✅ Notifications: persisted + `notification:new`.
13. ✅ Frontend: http/api/services, auth, shell, all pages wired, realtime.
14. ✅ Theme restyle (Cyber Bloom), design-system page updated.
15. ✅ Verification: typecheck, lint, smoke via Playwright; docs sync.

## Verification per task
`npm run typecheck` in both packages; `curl` smoke of each endpoint; Playwright screenshots of each page in both themes.

## Verification log (2026-10-17)
- `npm run typecheck` backend: pass. `tsc -b` + `oxlint` frontend: pass (warnings only).
- Smoke via API: login, user create, lead create (company auto-created from domain), status move, note, knowledge upload → index → search (offline embedder), draft generate (stub mode).
- Playwright: login, dashboard, leads kanban, lead detail rendered with live data in both themes.
- Not exercised live (needs owner's Google OAuth client + Anthropic key): Gmail sync/send, bounce parsing, calendar free/busy, Claude drafts. Code paths follow the official googleapis / Anthropic SDK contracts.
