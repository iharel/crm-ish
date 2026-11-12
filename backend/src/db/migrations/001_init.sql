CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','member')),
  avatar_url TEXT,
  scheduling_link TEXT,
  timezone TEXT DEFAULT 'UTC',
  working_hours_start TEXT DEFAULT '09:00',
  working_hours_end TEXT DEFAULT '17:00',
  is_active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS google_oauth_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  client_id TEXT NOT NULL,
  client_secret_enc TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  pubsub_topic TEXT,
  updated_by TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS google_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  expiry TEXT,
  scopes TEXT,
  history_id TEXT,
  watch_expiry TEXT,
  calendar_id TEXT DEFAULT 'primary',
  status TEXT NOT NULL DEFAULT 'connected',
  last_sync_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_accounts_user ON google_accounts(user_id);

CREATE TABLE IF NOT EXISTS lead_statuses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_won INTEGER NOT NULL DEFAULT 0,
  is_lost INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  website TEXT,
  industry TEXT,
  size TEXT,
  location TEXT,
  description TEXT,
  logo_url TEXT,
  linkedin_url TEXT,
  enrichment_json TEXT,
  enriched_at TEXT,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  title TEXT,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  status_id TEXT REFERENCES lead_statuses(id) ON DELETE SET NULL,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  source TEXT,
  score INTEGER DEFAULT 0,
  linkedin_url TEXT,
  notes TEXT,
  enrichment_json TEXT,
  enriched_at TEXT,
  last_activity_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status_id);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);

CREATE TABLE IF NOT EXISTS lead_activities (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON lead_activities(lead_id, created_at);

CREATE TABLE IF NOT EXISTS email_threads (
  id TEXT PRIMARY KEY,
  google_account_id TEXT NOT NULL REFERENCES google_accounts(id) ON DELETE CASCADE,
  gmail_thread_id TEXT NOT NULL,
  subject TEXT,
  snippet TEXT,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  last_message_at TEXT,
  unread INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_threads_gmail ON email_threads(google_account_id, gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_threads_lead ON email_threads(lead_id);

CREATE TABLE IF NOT EXISTS email_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  gmail_message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  from_addr TEXT,
  to_json TEXT,
  cc_json TEXT,
  bcc_json TEXT,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  sent_at TEXT,
  tracking_token TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_gmail ON email_messages(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_token ON email_messages(tracking_token);

CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  url TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_drafts (
  id TEXT PRIMARY KEY,
  thread_id TEXT REFERENCES email_threads(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  citations_json TEXT,
  slots_json TEXT,
  model TEXT,
  confidence REAL,
  status TEXT NOT NULL DEFAULT 'proposed',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drafts_thread ON email_drafts(thread_id);

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('document','website')),
  title TEXT NOT NULL,
  url TEXT,
  file_path TEXT,
  mime TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  metadata_json TEXT,
  embedding BLOB
);
CREATE INDEX IF NOT EXISTS idx_chunks_source ON knowledge_chunks(source_id);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_event_id TEXT,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  meet_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
