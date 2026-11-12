# Suppliers — Design

**Date:** 2026-11-12 · **Status:** approved 2026-11-12 (schema + S1–S9, with S4 changed by the owner: existing deals are always kept), implemented

## Why
Not everyone we email is a prospect. Suppliers (vendors, agencies, service providers) land in the CRM today as leads with a pipeline status and a deal, which pollutes the Leads pipeline, the Deals view and the dashboard numbers.

## What (the request)
1. A **Suppliers** tab.
2. A peer (the person on the other side of an email) can be set as a **supplier**, not only as a prospect/lead.
3. A supplier company **can** still have a deal.

## Decisions already made by the owner (2026-11-12)
| # | Decision |
|---|----------|
| O1 | The Suppliers tab lives on the **Companies page**: `Companies` \| `Suppliers`. |
| O2 | **The company** is what gets marked as a supplier; all its people become supplier contacts. |
| O3 | Supplier contacts are **hidden from the Leads pipeline** by default and shown only once they are part of a deal. |

## Decisions (need approval)
| # | Decision | Reason |
|---|----------|--------|
| S1 | One new column: `companies.is_supplier` (0/1, default 0). Supplier contacts stay rows in `leads` — no new table. | O2. People keep their email threads, tasks, activities and can join a deal with no extra plumbing. |
| S2 | **A supplier company has no deal by default.** The "every company has one default deal" rule applies to non-supplier companies only. The boot backfill and the automatic "new lead joins the default deal" step skip suppliers. | Requirement 3 says *can*, not *must*; without this O3 would never hide anyone. |
| S3 | **Adding a deal to a supplier** is done from the company page ("Add deal"): name, stage, amount, close date and which contacts take part. Only the chosen contacts join it; contacts added later do not join automatically. A supplier's last deal can be deleted (non-suppliers must still keep one). | Requirement 3 + O3. |
| S4 | **Marking an existing company as a supplier always keeps the deals it has** (owner's decision at approval, replacing the proposed remove / ask dialog). Its contacts already in a deal therefore stay in the pipeline; the deal can be deleted by hand from the supplier's Deal card (a supplier's last deal is deletable, S3). Contacts added after the marking do not join a deal automatically. | Never destroy a deal implicitly. |
| S5 | **Marking a supplier back as a regular company** recreates the default deal (if it has none) and all its contacts join it — the existing rule. | Symmetric with S2. |
| S6 | **Where supplier contacts appear.** Not in a deal: hidden from Leads Kanban/List, the Deals view and the dashboard pipeline / win-rate numbers; visible on the company page, their own page, the Inbox and global search. Their page shows a `Supplier contact` badge instead of the status select. In a deal: they behave like any lead of that deal, with a `Supplier` badge. | O3. |
| S7 | **Ways to set a supplier** (form–display parity): (a) "Supplier" switch in the company create/edit form; (b) "Mark as supplier / Mark as regular company" on the company page and in the Companies right-click menu; (c) **Inbox**: "Set as supplier" in the thread right-click menu and reading header. | Requirement 2. |
| S8 | **Inbox "Set as supplier"** — company already linked or matched by email domain: flag it (S4 applies) and add the peer as its contact. No company (new domain): create the company from the domain, flagged supplier, and add the peer. Free-mail peer (gmail.com…): open the existing "Link to company" dialog with a Supplier switch, since a company is required (O2). Threads of supplier companies carry a `Supplier` badge. | Requirement 2 with O2. |
| S9 | **AI reply drafts** for a supplier thread are told the counterpart is a supplier, so they do not write a sales pitch. Company suggestions by domain and enrichment work unchanged. | Small, prevents wrong-tone drafts. |

## Data model (needs approval — migration `008_suppliers.sql`)
```sql
-- Suppliers: a company flagged as a supplier. Its people are supplier contacts (rows in leads) and it has no
-- default deal; deals are added by hand.
ALTER TABLE companies ADD COLUMN is_supplier INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_companies_supplier ON companies(is_supplier);
```
- Nothing is dropped or renamed. Existing companies default to 0, so nothing changes until a company is marked.
- No change to `deals`, `deal_leads`, `leads` or to the agents/automation schema.

## API
| Method | Path | Change |
|--------|------|--------|
| GET | `/api/companies?kind=company\|supplier\|all` | New `kind` filter (default `all`, so existing callers are unaffected). `CompanyDto` gains `isSupplier`. |
| POST / PATCH | `/api/companies`, `/api/companies/:id` | Accept `isSupplier`. Deals are kept when a company becomes a supplier (S4); back to regular re-creates the default deal (S5). |
| POST | `/api/emails/threads/:id/supplier` | S8. Body `{ companyId?, companyName? }`. Returns the updated thread. `409` with code `COMPANY_REQUIRED` when a company is needed and none given (the UI then asks for it). |
| GET | `/api/leads`, `/api/deals`, dashboard | Exclude supplier contacts that are in no deal (S6); `/api/leads?companyId=` still lists them all. `LeadDto` and the thread DTO gain `supplier: boolean`. |
| POST / DELETE | `/api/companies/:id/deals`, `/api/deals/:id` | Supplier rules of S3 (explicit contacts, last deal deletable). |

All routes keep the existing auth + authorization middleware; errors are `4XX` only.

## Backend layers
- `db/migrations/008_suppliers.sql`.
- `companyRepository`: `is_supplier` in create/update, `kind` filter in `list`.
- `companyManager`: `setSupplier(id, isSupplier, deals?)` (S4, S5), DTO field.
- `dealManager`: `ensureDefault`, `backfill`, `syncLead`, `listForCompany`, `create`, `delete` honour S2/S3.
- `leadManager` / `leadRepository`, `dealManager.listAll`, dashboard queries: S6 filter.
- `emailManager.setSupplier(user, threadId, …)` + controller/router entry (S8); thread DTO gains `supplier`.
- `draftManager`: supplier note in the prompt context (S9).

## Frontend
- `CompaniesPage`: `Companies | Suppliers` tabs (kept in the URL, `?tab=suppliers`), "New supplier" when on the Suppliers tab, right-click "Mark as supplier / regular company".
- `CompanyFormModal`: Supplier switch. `CompanyDetailPage`: Supplier badge, toggle action, "Contacts" wording, Deal card shows "No deal — Add deal" for suppliers.
- `InboxPage` + `ThreadContextCard`: "Set as supplier" action and `Supplier` badge; link dialog gets the Supplier switch.
- `LeadDetailPage`: `Supplier contact` badge in place of the status select when not in a deal.
- Mockup: `SuppliersMockup` in the mockup area, linked from `/design/index`.

## Edge cases
- A domain already owned by a regular company: "Set as supplier" flags that company (its deal is kept, S4) — it never creates a duplicate.
- A supplier contact moved to a regular company joins that company's default deal (existing rule); moved the other way it leaves its old deals and is hidden until added to a supplier deal.
- Deleting a supplier company: unchanged (contacts are kept and unlinked).

## Out of scope
- Supplier-specific fields (contract dates, spend, category), purchase orders, a separate supplier pipeline.
- Person-level supplier marking inside a regular company (rejected in O2).
