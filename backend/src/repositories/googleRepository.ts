/** googleRepository — OAuth client config (admin) and per-user Google accounts. */
import { nanoid } from 'nanoid'
import { all, get, nowIso, run } from '../db/dbAccessor.ts'
import type { GoogleAccountRow } from '../types/index.ts'

export interface OauthConfigRow { id: number; client_id: string; client_secret_enc: string; redirect_uri: string; pubsub_topic: string | null; updated_by: string | null; updated_at: string }

export const googleRepository = {
  getConfig() { return get<OauthConfigRow>('SELECT * FROM google_oauth_config WHERE id = 1') },
  saveConfig(d: { client_id: string; client_secret_enc: string; redirect_uri: string; pubsub_topic: string | null; updated_by: string }) {
    run('INSERT INTO google_oauth_config (id,client_id,client_secret_enc,redirect_uri,pubsub_topic,updated_by,updated_at) VALUES (1,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET client_id=excluded.client_id, client_secret_enc=excluded.client_secret_enc, redirect_uri=excluded.redirect_uri, pubsub_topic=excluded.pubsub_topic, updated_by=excluded.updated_by, updated_at=excluded.updated_at',
      d.client_id, d.client_secret_enc, d.redirect_uri, d.pubsub_topic, d.updated_by, nowIso())
    return this.getConfig()!
  },

  accounts(): GoogleAccountRow[] { return all<GoogleAccountRow>('SELECT * FROM google_accounts') },
  accountById(id: string) { return get<GoogleAccountRow>('SELECT * FROM google_accounts WHERE id = ?', id) },
  accountByUser(userId: string) { return get<GoogleAccountRow>('SELECT * FROM google_accounts WHERE user_id = ?', userId) },
  accountByEmail(email: string) { return get<GoogleAccountRow>('SELECT * FROM google_accounts WHERE lower(email) = lower(?)', email) },
  upsertAccount(d: { user_id: string; email: string; access_token_enc: string; refresh_token_enc: string; expiry: string | null; scopes: string }) {
    const existing = this.accountByUser(d.user_id)
    if (existing) {
      run('UPDATE google_accounts SET email=?, access_token_enc=?, refresh_token_enc=?, expiry=?, scopes=?, status=?, last_error=NULL WHERE id=?', d.email, d.access_token_enc, d.refresh_token_enc, d.expiry, d.scopes, 'connected', existing.id)
      return this.accountById(existing.id)!
    }
    const id = nanoid(12)
    run('INSERT INTO google_accounts (id,user_id,email,access_token_enc,refresh_token_enc,expiry,scopes,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)', id, d.user_id, d.email, d.access_token_enc, d.refresh_token_enc, d.expiry, d.scopes, 'connected', nowIso())
    return this.accountById(id)!
  },
  updateAccount(id: string, patch: Partial<Pick<GoogleAccountRow, 'access_token_enc' | 'expiry' | 'history_id' | 'watch_expiry' | 'status' | 'last_sync_at' | 'last_error' | 'calendar_id'>>) {
    const keys = Object.keys(patch) as (keyof typeof patch)[]
    if (keys.length) run(`UPDATE google_accounts SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, ...keys.map((k) => patch[k] ?? null), id)
  },
  deleteAccount(id: string) { run('DELETE FROM google_accounts WHERE id = ?', id) },
}
