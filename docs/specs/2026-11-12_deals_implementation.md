# Deals — implementation (2026-11-12)
Design: `2026-11-12_deals_design.md`. Status: done.

| # | Task | Files |
|---|------|-------|
| 1 | Migration 006: `deals`, `deal_leads` (approved) | `backend/src/db/migrations/006_deals.sql`, `backend/src/types/index.ts` (`DealRow`) |
| 2 | `dealRepository`: CRUD, membership, per-lead lookup, pipeline counts | `backend/src/repositories/dealRepository.ts` |
| 3 | `dealManager`: default deal, boot backfill, effective status of a lead, `syncLead`, `moveLead`, split / update / set leads / delete | `backend/src/managers/dealManager.ts` |
| 4 | Leads use the deal status: DTO (`statusId`, `deals`, `multiDeal`), status filter, create / update / move / import / auto-create | `backend/src/managers/leadManager.ts`, `controllers/leadController.ts` |
| 5 | Company: `deals` in GET, leads keep status on delete | `controllers/companyController.ts`, `managers/companyManager.ts` |
| 6 | Pipeline counts by deal; deleting a status moves deals | `managers/dashboardManager.ts`, `repositories/leadStatusRepository.ts` |
| 7 | Routes + validation, boot backfill | `controllers/dealController.ts`, `routers/index.ts`, `server.ts` |
| 8 | Frontend types and API (`dealsApi`, `leadsApi.move(dealId)`) | `frontend/src/types/index.ts`, `frontend/src/api/index.ts` |
| 9 | Company page Deal card + deal form | `components/deals/DealsCard.tsx`, `components/deals/DealFormModal.tsx`, `pages/CompanyDetailPage.tsx` |
| 10 | Kanban card per deal for split companies, shared move, list badges; lead page status per deal; activity text | `pages/LeadsPage.tsx`, `pages/LeadDetailPage.tsx`, `pages/DashboardPage.tsx` |

## Verification (copy of the dev database)
- Backfill: 4 companies got a default deal; Northwind (leads in Proposal + Won) became Won.
- Moving one lead of a single-deal company moves the other lead too; a company-less lead moves alone.
- Split with a lead, amount and close date; move one deal only; reassign leads; a lead left in no deal returns to the first deal; a lead of another company is rejected (400); deleting the last deal is rejected (409).
- Unlinking a lead keeps the deal's status; linking it to another company takes that deal's status and ignores a status sent in the same call.
- First lead of a new company sets the deal's status; a second lead does not change it.
- Dashboard and Settings counts count deals once per company.
- Browser: company Deal card (single and split), deal form, Kanban cards per deal, lead page status per deal, timeline entry with the deal name.
- Backend `tsc --noEmit` and frontend `tsc -b` pass.
