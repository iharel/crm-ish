-- 002_leads_archive — soft-archive for leads (approved 2026-10-17).
-- NULL = active; an ISO timestamp = archived at that time. Archived leads are
-- hidden from the kanban and the default list, kept for history and relinking.
ALTER TABLE leads ADD COLUMN archived_at TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads(archived_at);
