/** settingsRepository — key/value JSON settings (e.g. AI keys, defaults). */
import { get, nowIso, run } from '../db/dbAccessor.ts'

export const settingsRepository = {
  get<T>(key: string, fallback: T): T {
    const row = get<{ value_json: string }>('SELECT value_json FROM settings WHERE key = ?', key)
    return row ? (JSON.parse(row.value_json) as T) : fallback
  },
  remove(key: string) { run('DELETE FROM settings WHERE key = ?', key) },
  set(key: string, value: unknown) {
    run('INSERT INTO settings (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at', key, JSON.stringify(value), nowIso())
  },
}
