-- Document signing: requests (1+ PDFs, 1+ recipients), the fields each signer fills, and the audit trail.
CREATE TABLE IF NOT EXISTS sign_requests (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  deal_id TEXT REFERENCES deals(id) ON DELETE SET NULL,
  thread_id TEXT REFERENCES email_threads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'draft',        -- draft|sent|completed|declined|voided|expired
  is_template INTEGER NOT NULL DEFAULT 0,
  sequential INTEGER NOT NULL DEFAULT 0,
  require_code INTEGER NOT NULL DEFAULT 0,
  remind_after_days INTEGER, remind_every_days INTEGER, remind_max INTEGER,
  expires_at TEXT,
  signed_file_path TEXT, signed_sha256 TEXT,
  void_reason TEXT,
  sent_at TEXT, completed_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sign_documents (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES sign_requests(id) ON DELETE CASCADE,
  filename TEXT NOT NULL, file_path TEXT NOT NULL,
  sha256 TEXT NOT NULL, page_count INTEGER NOT NULL, size INTEGER NOT NULL,
  sort_order INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sign_recipients (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES sign_requests(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'signer',          -- signer|copy
  name TEXT NOT NULL, email TEXT NOT NULL,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,              -- the link secret is stored hashed
  status TEXT NOT NULL DEFAULT 'pending',       -- pending|sent|opened|signed|declined
  decline_reason TEXT,
  reminders_sent INTEGER NOT NULL DEFAULT 0, last_reminded_at TEXT,
  consented_at TEXT, signed_at TEXT, signed_ip TEXT, signed_user_agent TEXT
);
CREATE TABLE IF NOT EXISTS sign_fields (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES sign_requests(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES sign_documents(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES sign_recipients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                           -- signature|initials|name|date|text|checkbox
  page INTEGER NOT NULL,
  x REAL NOT NULL, y REAL NOT NULL, w REAL NOT NULL, h REAL NOT NULL,   -- fractions of the page (0..1)
  required INTEGER NOT NULL DEFAULT 1,
  label TEXT,
  value TEXT, filled_at TEXT                    -- text value, or a file path for drawn signatures
);
CREATE TABLE IF NOT EXISTS sign_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES sign_requests(id) ON DELETE CASCADE,
  recipient_id TEXT REFERENCES sign_recipients(id) ON DELETE SET NULL,
  type TEXT NOT NULL, ip TEXT, user_agent TEXT, meta_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sign_requests_company ON sign_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_sign_requests_owner ON sign_requests(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_sign_recipients_request ON sign_recipients(request_id);
CREATE INDEX IF NOT EXISTS idx_sign_fields_request ON sign_fields(request_id);
CREATE INDEX IF NOT EXISTS idx_sign_events_request ON sign_events(request_id, created_at);
