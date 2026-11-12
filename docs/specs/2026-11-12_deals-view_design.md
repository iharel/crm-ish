# Deals view & deal contact person — Design

**Date:** 2026-11-12 · **Status:** approved 2026-11-12 (migration 007), implemented and verified

## Why
The Leads page shows one card per person. A company with three leads shows three cards for what is one deal. The owner wants to see the pipeline per deal, titled with the company, and to say who the contact person of each deal is.

## What
1. **Deals view** on the Leads page: a `Leads | Deals` switch next to `Kanban | List`. Both layouts work in both modes; the choice is remembered.
2. A deal card / row is titled with the **company name**. When the company has more than one deal, the **deal name** is shown under it.
3. Each deal shows its **contact person**, amount, expected close date, number of leads, owner and last activity.
4. The **contact person** of a deal can be set (one of the deal's leads).

## Decisions
| # | Decision | Reason |
|---|----------|--------|
| V1 | The view lists deals that have at least one active lead. Deals with no leads, and leads without a company, are not shown. | Same rule as the dashboard pipeline counts; a lead without a company has no deal. |
| V2 | Filters are shared with the Leads mode: search (company, deal name, lead names and emails), status, owner (the deal's owner), archived (deals whose leads are all archived). | One filter bar. |
| V6 | The chosen view (`Leads`/`Deals`, `Kanban`/`List`) is kept in the URL (`?view=&layout=`) and in the saved preferences. The URL wins; the preferences apply when the page is opened without it. | A reload returns to the same view even where browser storage is blocked (embedded preview, private mode). |
| V3 | Dragging a card moves the deal (all its leads follow). Click opens the company. Right-click: open company, open contact, move, edit deal. | Matches the Leads mode. |
| V4 | Contact person = a lead of the deal, stored on the deal. Not set → the deal's first lead is shown. If the contact leaves the deal or the company, the choice is cleared. | Always something to show; never points at an outsider. |
| V5 | The contact is set in the deal form ("Contact person" select, on the company page and in the Deals view) and from the Deals view right-click menu. | Form-display parity. |

## Data model (needs approval — migration `007_deal_contact.sql`)
```sql
ALTER TABLE deals ADD COLUMN contact_lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL;
```
Nullable, no backfill; existing deals show their first lead until a contact is chosen.

## API
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/deals?q=&statusId=&ownerId=&archived=` | Deals view rows: `DealDto` + `companyName`, `companyLogoUrl`, `multiDeal`, `ownerName`, `leads[]`, `contact`, `lastActivityAt` |
| PATCH | `/deals/:id` | adds `contactLeadId?: string \| null` (must be a lead of the deal; 400 otherwise) |

`DealDto` gains `contactLeadId: string | null`.

## Out of scope
Several contact persons per deal, a contact who is not a lead.

## Implementation
| # | Task | Files |
|---|------|-------|
| 1 | Migration 007 `deals.contact_lead_id` (approved) | `backend/src/db/migrations/007_deal_contact.sql`, `backend/src/types/index.ts` |
| 2 | `GET /deals` rows, contact rules (member of the deal, cleared when stale) | `repositories/dealRepository.ts`, `managers/dealManager.ts`, `controllers/dealController.ts`, `routers/index.ts` |
| 3 | `Leads \| Deals` switch, Deals Kanban + List | `frontend/src/pages/LeadsPage.tsx`, `components/deals/DealsBoard.tsx` |
| 4 | Contact person select in the deal form, shown on the company Deal card | `components/deals/DealFormModal.tsx`, `components/deals/DealsCard.tsx` |

## Verification (copy of the dev database)
- `GET /deals` lists one row per deal with leads; the deal name shows only for a split company; search by lead email works.
- Setting a contact works; a lead outside the deal is rejected (400), also at split time; the contact is cleared when that lead leaves the company.
- Browser: Deals Kanban and List, deal form contact select, contact on the company Deal card.
- Backend `tsc --noEmit` and frontend `tsc -b` pass.
