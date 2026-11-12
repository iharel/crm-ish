-- Tasks from email (approved by owner 2026-10-20; private to their creator for now, assignee_id reserved for sharing later).
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
  due_at TEXT,
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  thread_id TEXT REFERENCES email_threads(id) ON DELETE SET NULL,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_status ON tasks(created_by, status, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_thread ON tasks(thread_id);
