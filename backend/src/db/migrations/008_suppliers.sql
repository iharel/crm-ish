-- Suppliers (approved by owner 2026-11-12): a company flagged as a supplier. Its people are supplier contacts
-- (rows in leads) and it gets no default deal; deals are added by hand. Deals it already has are kept.
ALTER TABLE companies ADD COLUMN is_supplier INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_companies_supplier ON companies(is_supplier);
