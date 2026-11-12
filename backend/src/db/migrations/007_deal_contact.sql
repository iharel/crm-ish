-- The deal's contact person: one of its leads. NULL = not chosen (the deal's first lead is shown).
ALTER TABLE deals ADD COLUMN contact_lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL;
