/** constants — the ONLY module that reads process.env. */
import 'dotenv/config'
import path from 'node:path'

function env(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

/** Accept a plain path or a sqlite:// / file: url (what a provisioned DB binding may hand over). */
function sqlitePath(value: string): string {
  const stripped = value.replace(/^(sqlite|file):\/\/?/, '')
  return path.resolve(stripped.replace(/^\/\//, '/'))
}

export const CONSTANTS = {
  // BACKEND_PORT wins: in a combined production container PORT belongs to the frontend entry runner.
  PORT: Number(env('BACKEND_PORT') || env('PORT', '4100')),
  PUBLIC_URL: env('PUBLIC_URL', 'http://localhost:4100'),
  FRONTEND_URL: env('FRONTEND_URL', 'http://localhost:5173'),
  DB_PATH: sqlitePath(env('DB_PATH', './data/crm.db')),
  UPLOAD_DIR: path.resolve(env('UPLOAD_DIR', './uploads')),
  JWT_SECRET: env('JWT_SECRET', 'dev-access-secret'),
  JWT_REFRESH_SECRET: env('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  ENCRYPTION_KEY: env('ENCRYPTION_KEY', 'dev-encryption-key-please-change-32b'),
  ACCESS_TTL_SEC: 15 * 60,
  REFRESH_TTL_SEC: 30 * 24 * 3600,
  /** Optional shared secret for the Gmail Pub/Sub push endpoint (`/api/webhooks/gmail?token=...`). Empty = open. */
  GMAIL_WEBHOOK_TOKEN: env('GMAIL_WEBHOOK_TOKEN'),
  ANTHROPIC_API_KEY: env('ANTHROPIC_API_KEY'),
  VOYAGE_API_KEY: env('VOYAGE_API_KEY'),
  DRAFT_MODEL: env('DRAFT_MODEL', 'claude-sonnet-5'),
  ENRICH_MODEL: env('ENRICH_MODEL', 'claude-haiku-4-5-20251001'),
  SEED_ADMIN_EMAIL: env('SEED_ADMIN_EMAIL', 'admin@looper.local'),
  SEED_ADMIN_PASSWORD: env('SEED_ADMIN_PASSWORD', 'admin1234'),
  GMAIL_SYNC_INTERVAL_MS: 2 * 60 * 1000,
  /** How many recent threads get their archive state re-read from Gmail when the history cursor is missing or expired. */
  GMAIL_ARCHIVE_RECONCILE_LIMIT: 100,
  /** One-time archive repair: how many of the newest inbox threads are re-checked against Gmail. */
  GMAIL_ARCHIVE_REPAIR_LIMIT: 200,
  /** Sent mail listed separately when the history cursor is missing or expired (days back / max messages). */
  GMAIL_SENT_CATCHUP_DAYS: 30,
  GMAIL_SENT_CATCHUP_MAX: 200,
  /** One-time per-account pull of sent mail missed before SENT label changes were tracked. */
  GMAIL_SENT_REPAIR_DAYS: 90,
  GMAIL_SENT_REPAIR_MAX: 500,
  /** Syncs a failed Gmail message fetch is retried for before it is dropped. */
  GMAIL_IMPORT_MAX_ATTEMPTS: 5,
  /** Gmail message fetches per sync (~5 quota units each); the rest carry over to the next sync. */
  GMAIL_IMPORT_MAX_PER_SYNC: 100,
  /** Background scan of pre-attachment mail: messages per tick and tick interval. */
  ATTACHMENT_BACKFILL_BATCH: 10,
  ATTACHMENT_BACKFILL_INTERVAL_MS: 30 * 1000,
  /** In-memory sanitized-HTML cache bounds. */
  HTML_CACHE_MAX_ENTRIES: 300,
  HTML_CACHE_MAX_BYTES: 24 * 1024 * 1024,
  RAG_TOP_K: 6,
  CHUNK_TOKENS: 800,
  CHUNK_OVERLAP: 100,
} as const

/**
 * Secrets still on a published default (the dev fallbacks above or the `.env.example` placeholders). Anyone who reads
 * this repository can forge sessions or decrypt stored tokens of an instance running with them.
 */
export function insecureDefaults(): string[] {
  const known = new Set(['dev-access-secret', 'dev-refresh-secret', 'dev-encryption-key-please-change-32b', 'change-me-access', 'change-me-refresh', 'change-me-32-bytes-min-for-aes-256-gcm'])
  const out: string[] = []
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'] as const) if (known.has(CONSTANTS[key]) || CONSTANTS[key].length < 24) out.push(`${key} is a default or short value — set a long random one before exposing this instance.`)
  if (CONSTANTS.SEED_ADMIN_PASSWORD === 'admin1234') out.push('SEED_ADMIN_PASSWORD is the documented default — change the admin password after the first login.')
  return out
}
