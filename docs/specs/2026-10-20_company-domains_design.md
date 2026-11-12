# Company domains: unique + multiple per company — design (2026-10-20)

## Why
Two companies can currently share a domain (the dev data already has two "Northwind" rows on `northwind.health`), which makes domain-based suggestions and auto-linking ambiguous. At the same time one company often owns several domains (`acme.com`, `acme.co.il`, `acmecorp.com`), and mail from any of them should map to that company.

## What
1. **Many domains per company**, stored in a new `company_domains` table. One of them is the primary (shown in lists, used for the logo).
2. **Domains are unique across companies** (case-insensitive). Creating or editing a company with a domain that another company owns fails with a clear 409 naming that company.
3. **Matching uses every domain**: `companyManager.suggestForEmail`, `findOrCreateByEmail` (auto-create on inbound mail / import) and the company picker all resolve through `company_domains` (exact, parent-domain and website-host rules unchanged).
4. **Company form** gets a "Domains" field (chips, comma or Enter to add, first is primary, star to change primary). Company detail header lists all domains. Company list search matches any domain.
5. **Migration** copies every existing `companies.domain` into `company_domains`. When two companies share a domain, the older company keeps it and the newer one is left without a domain and reported in the server log once ("duplicate domain released: <name>"), so the owner can merge or edit by hand. No data is deleted.

## Data model (needs approval — migration `005_company_domains.sql`)
```sql
CREATE TABLE IF NOT EXISTS company_domains (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,                 -- lower-cased, no "www."
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_domains_domain ON company_domains(domain);
CREATE INDEX IF NOT EXISTS idx_company_domains_company ON company_domains(company_id);

-- Backfill: one row per company with a domain; duplicates (same domain, later created_at) are skipped.
INSERT OR IGNORE INTO company_domains (id, company_id, domain, is_primary, created_at)
  SELECT lower(hex(randomblob(8))), id, lower(replace(domain, 'www.', '')), 1, created_at
  FROM companies WHERE domain IS NOT NULL AND trim(domain) <> '' ORDER BY created_at ASC;
```
`companies.domain` stays as the **primary domain** (denormalized, kept in sync by the manager) so existing readers (logo, lists, enrichment) keep working. The manager clears `companies.domain` on companies that lost a duplicate during backfill at first boot.

## API
| Method | Path | Change |
|--------|------|--------|
| GET/POST/PATCH | `/companies[/:id]` | `CompanyDto.domains: string[]` (primary first). Input accepts `domains?: string[]`; `domain` (legacy) is treated as the primary. 409 `DOMAIN_TAKEN` with `{ companyId, companyName }` when a domain belongs to another company. |
| GET | `/companies/check-domain?domain=` | Picker/form helper: which company owns a domain, if any. |

## Out of scope
Merging companies, automatic re-linking of leads when a domain moves between companies.

**Status (2026-10-20):** implemented and verified (409 on taken domain, multi-domain create/update, primary change, subdomain + secondary-domain matching, legacy `domain` field, duplicate release at boot).
