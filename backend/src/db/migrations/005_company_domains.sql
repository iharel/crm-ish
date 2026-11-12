-- Company domains: many per company, unique across companies (approved by owner 2026-10-20).
-- companies.domain stays as the denormalized primary domain.
CREATE TABLE IF NOT EXISTS company_domains (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_domains_domain ON company_domains(domain);
CREATE INDEX IF NOT EXISTS idx_company_domains_company ON company_domains(company_id);

-- Backfill: one row per company with a domain. Oldest company wins a duplicated domain; later ones are skipped
-- (the manager clears their companies.domain at first boot and logs them).
INSERT OR IGNORE INTO company_domains (id, company_id, domain, is_primary, created_at)
  SELECT lower(hex(randomblob(8))), id, lower(replace(trim(domain), 'www.', '')), 1, created_at
  FROM companies WHERE domain IS NOT NULL AND trim(domain) <> '' ORDER BY created_at ASC;
