/** userRepository — users + refresh tokens. */
import { nanoid } from 'nanoid'
import { all, get, nowIso, run } from '../db/dbAccessor.ts'
import type { Role, UserRow } from '../types/index.ts'

export const userRepository = {
  list(): UserRow[] { return all<UserRow>('SELECT * FROM users ORDER BY created_at ASC') },
  byId(id: string) { return get<UserRow>('SELECT * FROM users WHERE id = ?', id) },
  byEmail(email: string) { return get<UserRow>('SELECT * FROM users WHERE lower(email) = lower(?)', email) },
  count() { return get<{ n: number }>('SELECT COUNT(*) n FROM users')!.n },
  create(d: { email: string; passwordHash: string; name: string; role: Role; mustChangePassword?: boolean }): UserRow {
    const id = nanoid(12); const t = nowIso()
    run('INSERT INTO users (id,email,password_hash,name,role,is_active,must_change_password,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?,?)', id, d.email, d.passwordHash, d.name, d.role, d.mustChangePassword ? 1 : 0, t, t)
    return this.byId(id)!
  },
  update(id: string, patch: Partial<Pick<UserRow, 'name' | 'role' | 'is_active' | 'scheduling_link' | 'timezone' | 'working_hours_start' | 'working_hours_end' | 'avatar_url' | 'password_hash' | 'must_change_password' | 'email'>>): UserRow {
    const keys = Object.keys(patch) as (keyof typeof patch)[]
    if (keys.length) run(`UPDATE users SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, ...keys.map((k) => patch[k]), nowIso(), id)
    return this.byId(id)!
  },
  delete(id: string) { run('DELETE FROM users WHERE id = ?', id) },

  saveRefreshToken(userId: string, tokenHash: string, expiresAt: string) {
    run('INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)', nanoid(16), userId, tokenHash, expiresAt, nowIso())
  },
  findRefreshToken(tokenHash: string) {
    return get<{ id: string; user_id: string; expires_at: string }>('SELECT id,user_id,expires_at FROM refresh_tokens WHERE token_hash = ?', tokenHash)
  },
  deleteRefreshToken(id: string) { run('DELETE FROM refresh_tokens WHERE id = ?', id) },
  deleteUserRefreshTokens(userId: string) { run('DELETE FROM refresh_tokens WHERE user_id = ?', userId) },
}
