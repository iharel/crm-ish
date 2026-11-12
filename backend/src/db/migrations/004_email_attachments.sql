-- Email images & attachments (approved by owner 2026-10-20). Bytes are downloaded at import into UPLOAD_DIR/attachments.
CREATE TABLE IF NOT EXISTS email_attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  gmail_attachment_id TEXT,
  filename TEXT,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  content_id TEXT,
  is_inline INTEGER NOT NULL DEFAULT 0,
  file_path TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attachments_message ON email_attachments(message_id);

ALTER TABLE email_messages ADD COLUMN attachments_scanned INTEGER NOT NULL DEFAULT 0;
