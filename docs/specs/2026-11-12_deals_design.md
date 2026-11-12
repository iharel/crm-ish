# Deals — Design

**Date:** 2026-11-12 · **Status:** approved 2026-11-12 (schema + D1–D6; D6 extended with amount and expected close date), implemented and verified

## Why
The pipeline status (New … Won / Lost) is stored on each **lead** today. What is really won or lost is a **deal with a company**, and several leads of one company take part in the same deal. A company can also have more than one deal (e.g. two products, two departments).

## What (the request)
1. A **deal** is an entity linked to one company and to leads.
2. Every company has **one deal** by default. The user can **split** a company into more deals.
3. Leads of a company are linked to the company (by email domain, after the user approves — existing suggestions flow). When the company has more than one deal, a lead can be assigned to **one or more** of them.
4. "The company is Won" means "the company's single (default) deal is Won".
5. While a company has a single deal, the **UX stays as it is today**.

## Current state (what changes)
- `leads.status_id` holds the pipeline status. Two leads of the same company can sit in different statuses.
- There is no company-level status and no deal entity.
- Kanban columns, the lead status select, dashboard "pipeline by status" and win rate all read `leads.status_id`.

## Decisions (need approval)
| # | Decision | Reason |
|---|----------|--------|
| D1 | **Status lives on the deal.** `lead_statuses` stays as the list of pipeline stages (table not renamed). | Requirement 4. |
| D2 | **Single-deal company:** every lead of the company shows the deal's status. Moving one lead (Kanban drag, status select) moves the deal, so all the company's leads move together. | Requirements 4 + 5: same screens, status is now shared. |
| D3 | **Lead without a company** keeps its own status in `leads.status_id` (no deal). When it is linked to a company it joins the company's default deal and takes the deal's status. | A deal must belong to a company; free-mail leads (gmail.com…) have none. |
| D4 | **Backfill** — one default deal per company. Its status: Won if any lead is Won; otherwise the furthest non-lost stage among its leads; Lost only if all leads are Lost. All the company's leads are attached to it. (Chosen by the owner over "most recently active lead" and "all at default".) | Companies with mixed lead statuses need one value; nothing is deleted, `leads.status_id` is kept untouched as the pre-migration record. |
| D5 | **Multi-deal company** (after a split): the company page gets a Deals card (name, status, leads per deal, add / rename / delete deal, assign leads). In Kanban and lists a lead of such a company appears once per deal it belongs to, labelled with the deal name. The lead page shows one status row per deal. | Requirement 3; only these companies see new UI. |
| D6 | **Deal fields:** name, status, owner, **amount** (plain number, no currency) and **expected close date** (owner's request at approval). Deleting a deal is allowed only when the company keeps at least one; its leads fall back to the default deal (the oldest remaining deal becomes the default when the default is deleted). | Keep it small. |
| D7 | The company page always shows a **Deal** card: for a single-deal company one row (status, amount, close date, edit) plus "Split into deals"; after a split, one row per deal. | Amount / close date need a home, and the split needs an entry point; the rest of the single-deal UX is unchanged. |
| D8 | A status sent together with a company change is ignored, and a status chosen when creating a lead in a company that already has a deal is ignored. | Linking a lead must never silently move an existing deal (e.g. reset a Won deal to New). |

## Data model (needs approval — migration `006_deals.sql`)
```sql
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                       -- default deal: the company name
  status_id TEXT REFERENCES lead_statuses(id) ON DELETE SET NULL,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  amount REAL,
  expected_close_date TEXT,                 -- YYYY-MM-DD
  is_default INTEGER NOT NULL DEFAULT 0,    -- exactly one per company
  closed_at TEXT,                           -- set when moved to a won/lost status
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deals_company ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_default ON deals(company_id) WHERE is_default = 1;

CREATE TABLE IF NOT EXISTS deal_leads (
  deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (deal_id, lead_id)
);
CREATE INDEX IF NOT EXISTS idx_deal_leads_lead ON deal_leads(lead_id);
```
- No existing column is dropped or renamed. `leads.status_id` stays: it is the status of company-less leads (D3) and the pre-migration record for the rest.
- Backfill (D4) runs at boot in `dealManager.backfill()` (needs stage order and won/lost flags). It is idempotent: it only creates a default deal for companies that have none and attaches company leads that are in no deal.
- `lead_activities` unchanged: a deal status change writes a `status_change` activity on each lead of the deal (payload gains `dealId`, `dealName`).

## Behaviour
- **Company created** → its default deal is created on first use (opening the company, or its first lead); it takes its status from the company's leads at that moment, so the first lead of a new company brings its status with it. **Lead linked to a company** → added to its default deal. **Lead moved to another company** → removed from the old company's deals, added to the new default deal. **Lead unlinked** → keeps the last deal status as its own.
- **Split** (company page → "Split into deals"): name the new deal, pick its leads (a lead may stay in both), optional status / amount / expected close date. New deal starts at the default status.
- **Company deleted** → its leads keep the status their deal had.
- **Status deleted** (Settings) → deals in it move to the chosen status together with the leads.
- **Lists:** the status filter matches a lead when any of its deals is in that status. In the list view a multi-deal lead shows one badge per deal and is moved from the Kanban or its own page.
- **Dashboard:** pipeline counts and win rate count deals plus company-less leads (a company with 3 leads counts once, not 3 times). Label stays "Pipeline by status".
- **Lead import** with a status column: sets the lead's own status when it has no company; for a new company it sets the default deal's status; for an existing company's deal it does not change it.

## API
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/companies/:id` | adds `deals: DealDto[]` (with `leadIds`) |
| POST | `/companies/:id/deals` | split: `{ name, leadIds?, statusId?, amount?, expectedCloseDate?, ownerId? }` |
| PATCH | `/deals/:id` | `{ name?, statusId?, ownerId?, amount?, expectedCloseDate? }` |
| PUT | `/deals/:id/leads` | `{ leadIds[] }` |
| DELETE | `/deals/:id` | not the last deal; 409 `LAST_DEAL` otherwise |
| POST | `/leads/:id/move` | unchanged call; optional `dealId` for multi-deal companies. Moves the deal when the lead has a company. |
| GET | `/leads`, `/leads/:id` | `statusId` = effective status; adds `deals: { id, name, statusId, isDefault }[]` and `multiDeal` |

`DealDto { id, companyId, name, statusId, ownerId, amount, expectedCloseDate, isDefault, leadIds, closedAt, createdAt, updatedAt }`

Layers: `dealRepository` → `dealManager` → `dealController` → router (auth + validation as for companies).

## Out of scope
Currency per deal, amount totals on the dashboard, linking email threads and tasks to a specific deal, merging deals, a separate Deals page.
