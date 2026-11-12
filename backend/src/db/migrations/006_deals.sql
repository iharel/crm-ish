-- Deals: what is won or lost with a company. Every company has one default deal; the user can split into more.
-- Pipeline status lives on the deal (lead_statuses = the stages). leads.status_id stays: it is the status of
-- company-less leads and the pre-migration record for the rest. Backfill runs in dealManager at boot.
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status_id TEXT REFERENCES lead_statuses(id) ON DELETE SET NULL,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  amount REAL,
  expected_close_date TEXT,                 -- YYYY-MM-DD
  is_default INTEGER NOT NULL DEFAULT 0,    -- exactly one per company
  closed_at TEXT,                           -- set while the status is won/lost
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
