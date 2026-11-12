# Suppliers — Implementation

**Date:** 2026-11-12 · **Design:** `2026-11-12_suppliers_design.md` · **Status:** done (inline execution)

## Tasks
| # | Task | Files | Verification |
|---|------|-------|--------------|
| 1 | Migration: `companies.is_supplier` + index | `backend/src/db/migrations/008_suppliers.sql`, `backend/src/types/index.ts` | Applied at boot; existing rows = 0 |
| 2 | Repositories: supplier flag in create/patch, `kind` list filter; backfill queries skip suppliers; `hideSupplierOnly` lead filter | `companyRepository.ts`, `dealRepository.ts`, `leadRepository.ts` | Scenario script (below) |
| 3 | Deal rules for suppliers: no default deal, no auto-join, last deal deletable, `rehome` no-op, status move of a deal-less contact stays on the lead | `dealManager.ts` | Scenario script |
| 4 | Company manager: `isSupplier` in DTO/input, `kind` in `list`, back-to-regular rehome, `findOrCreateByEmail(asSupplier)` | `companyManager.ts`, `companyController.ts`, `routers/index.ts` | Scenario script |
| 5 | Pipeline visibility: `/leads` hides deal-less supplier contacts unless `companyId` is given; dashboard "hottest / new this week" too; `LeadDto.supplier` | `leadController.ts`, `leadManager.ts`, `dashboardManager.ts` | Scenario script |
| 6 | Inbox: `POST /emails/threads/:id/supplier`, thread DTO `supplier` | `emailManager.ts`, `emailController.ts`, `routers/index.ts` | Type-check |
| 7 | AI drafts: supplier note in the prompt | `draftManager.ts` | Type-check |
| 8 | Frontend types + API | `frontend/src/types/index.ts`, `frontend/src/api/index.ts` | Type-check |
| 9 | Companies page tabs (`?tab=suppliers`), New supplier, right-click toggle | `CompaniesPage.tsx`, `CompanyFormModal.tsx` | Type-check |
| 10 | Company page: badge, toggle, Contacts wording, Deal card for suppliers | `CompanyDetailPage.tsx`, `DealsCard.tsx`, `DealFormModal.tsx` | Type-check |
| 11 | Inbox: "Set as supplier" (menu + header), Supplier badge, company picker for free-mail senders | `InboxPage.tsx` | Type-check |
| 12 | Lead page / Leads list: supplier badges, no status select for a deal-less supplier contact | `LeadDetailPage.tsx`, `LeadsPage.tsx` | Type-check |
| 13 | Mockup `suppliers` (lazy, in the registry) | `mockups/pages/SuppliersMockup.tsx`, `mockups/registry.ts` | Type-check |
| 14 | Docs | `docs/prd.md`, design + this file | — |

## Verification done
- `tsc --noEmit` passes for backend and frontend.
- Manager-level scenario against the dev database (created and removed its own rows): new supplier has 0 deals and survives the boot backfill; its contact is hidden from the pipeline list; adding a deal with the contact makes it visible with the deal's status; deleting that last deal is allowed and hides it again; marking a regular company as supplier keeps its deal; a contact added afterwards joins no deal; marking it back as regular puts that contact in the default deal; the `kind` filter separates the two lists.

## Not verified
- The Inbox "Set as supplier" endpoint and the UI were not exercised in a browser (the local database has no email threads).
