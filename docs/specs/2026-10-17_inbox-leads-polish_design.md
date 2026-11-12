# Inbox & Leads polish — design (2026-10-17)

## Why
Day-one feedback after the production launch: the inbox needs fast triage actions and should not turn every sender into a lead; the kanban needs the same quick actions; companies should look real (logo); the app should credit Looper.

## What

| # | Feature | Decision |
|---|---------|----------|
| 1 | "Powered by Looper.ing" | Small muted link in the sidebar footer (under the user block) and on the login hero footer. Opens https://looper.ing in a new tab. |
| 2 | Email context menu | Right-click a thread in the inbox list: **Open · Reply · Archive/Unarchive · Create lead (unlinked only) · Link to lead · Delete**. Delete removes the thread from the CRM only (messages, drafts, events cascade); Gmail is untouched. |
| 3 | Leads are opt-in | `autoCreateLeads` default flips to **false**. Unknown inbound mail stays "Unlinked"; the user converts it via **Create lead** (new `POST /emails/threads/:id/convert`), which creates the lead from the counterpart (and the company from its domain) and links the thread. Bulk/no-reply mail is still dropped at sync time. |
| 4 | Inbox infinite scroll | Cursor pagination on `GET /emails/threads` with `before=<lastMessageAt>` and `limit` (default 40, max 100). The list appends when a sentinel at the bottom becomes visible; search/filter changes reset the list. |
| 5 | Kanban context menu | Right-click a kanban card: **Open · Move to → status · Enrich · Delete**. Archive for leads needs a new column (see open question). |
| 6 | Company logo | `companies.logo_url` already exists. The DTO falls back to Google's favicon service `https://www.google.com/s2/favicons?domain=<domain>&sz=128` when the column is empty and a domain is known; enrichment persists that URL. Rendered in the companies table and the company header, with the initials tile as fallback on load error. No external paid provider. |

## Shared UI
- `ContextMenu` (`frontend/src/components/common/ContextMenu.tsx`) + `useContextMenu` hook: positioned at the pointer, clamped to the viewport, closes on outside click / Escape / scroll, supports item groups, danger items and a submenu-like inline group (used for "Move to").

## API additions
- `GET /emails/threads?before&limit` — cursor pagination.
- `DELETE /emails/threads/:id` — CRM-side delete.
- `POST /emails/threads/:id/convert` — create + link lead from the thread counterpart.

## Lead archive (schema change approved by owner 2026-10-17)
- Migration `backend/src/db/migrations/002_leads_archive.sql`: `ALTER TABLE leads ADD COLUMN archived_at TEXT NULL` + index. Applied automatically by `dbAccessor.migrate()` on backend start (dev and production).
- `GET /leads` returns active leads by default; `?archived=true` returns archived only; `?archived=all` returns both.
- `POST /leads/:id/archive { archived }` toggles; logs a system activity; emits `lead:updated` with type `archived` / `unarchived`.
- UI: kanban context menu **Archive / Unarchive**; an **Archived** toggle on the Leads page filter bar switches the list/board to archived leads.
