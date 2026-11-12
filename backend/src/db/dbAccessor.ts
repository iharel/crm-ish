/**
 * dbAccessor — opens the SQLite database, applies migrations and exposes
 * typed helpers. Repositories are the only consumers.
 *
 * Driver: node-sqlite3-wasm (pure WebAssembly, synchronous, file-backed). It
 * replaced better-sqlite3 whose prebuilt binary segfaults in the slim arm64
 * production image. WAL mode is not available in the WASM build, so the
 * database runs with the default rollback journal.
 */
import sqlite3 from 'node-sqlite3-wasm'
import type { BindValues, JSValue, RunResult } from 'node-sqlite3-wasm'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONSTANTS } from '../constants.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
type Database = InstanceType<typeof sqlite3.Database>
let db: Database | null = null

export function getDb(): Database {
  if (db) return db
  fs.mkdirSync(path.dirname(CONSTANTS.DB_PATH), { recursive: true })
  db = new sqlite3.Database(CONSTANTS.DB_PATH)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA busy_timeout = 5000')
  migrate(db)
  return db
}

function migrate(d: Database) {
  d.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`)
  const dir = path.join(here, 'migrations')
  const applied = new Set((d.all('SELECT name FROM _migrations') as { name: string }[]).map((r) => r.name))
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    d.exec('BEGIN')
    try {
      d.exec(sql)
      d.run('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)', [file, new Date().toISOString()])
      d.exec('COMMIT')
    } catch (e) {
      d.exec('ROLLBACK')
      throw e
    }
  }
}

/** Positional params as the driver wants them (undefined → NULL, same as a missing bind). */
function bind(params: unknown[]): BindValues {
  return params.map((p) => (p === undefined ? null : p)) as JSValue[]
}

/** Run a prepared statement returning all rows typed as T. */
export function all<T>(sql: string, ...params: unknown[]): T[] {
  return getDb().all(sql, bind(params)) as T[]
}
/** Run a prepared statement returning the first row or undefined. */
export function get<T>(sql: string, ...params: unknown[]): T | undefined {
  return (getDb().get(sql, bind(params)) ?? undefined) as T | undefined
}
/** Run a mutating statement. */
export function run(sql: string, ...params: unknown[]): RunResult {
  return getDb().run(sql, bind(params))
}
/** Run fn inside a transaction; nested calls become savepoints. */
export function tx<T>(fn: () => T): T {
  const d = getDb()
  const nested = d.inTransaction
  const sp = `sp_${Math.random().toString(36).slice(2, 8)}`
  d.exec(nested ? `SAVEPOINT ${sp}` : 'BEGIN')
  try {
    const out = fn()
    d.exec(nested ? `RELEASE ${sp}` : 'COMMIT')
    return out
  } catch (e) {
    d.exec(nested ? `ROLLBACK TO ${sp}; RELEASE ${sp}` : 'ROLLBACK')
    throw e
  }
}
export const nowIso = () => new Date().toISOString()
