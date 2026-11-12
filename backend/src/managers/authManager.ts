/** authManager — login, refresh rotation, logout, password change. */
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { CONSTANTS } from '../constants.ts'
import { unauthorized, badRequest } from '../middleware/errors.ts'
import { userRepository } from '../repositories/userRepository.ts'
import { cryptoService } from '../services/cryptoService.ts'
import type { UserRow } from '../types/index.ts'
import { userManager } from './userManager.ts'

function signAccess(u: UserRow) {
  return jwt.sign({ sub: u.id, email: u.email, role: u.role, name: u.name }, CONSTANTS.JWT_SECRET, { expiresIn: CONSTANTS.ACCESS_TTL_SEC })
}
function issueRefresh(u: UserRow) {
  const token = cryptoService.randomToken(48)
  const expiresAt = new Date(Date.now() + CONSTANTS.REFRESH_TTL_SEC * 1000).toISOString()
  userRepository.saveRefreshToken(u.id, cryptoService.sha256(token), expiresAt)
  return token
}

export const authManager = {
  async login(email: string, password: string) {
    const u = userRepository.byEmail(email)
    if (!u || !u.is_active) throw unauthorized('Invalid email or password')
    if (!(await argon2.verify(u.password_hash, password))) throw unauthorized('Invalid email or password')
    return { accessToken: signAccess(u), refreshToken: issueRefresh(u), user: userManager.toDto(u) }
  },
  refresh(refreshToken: string) {
    const row = userRepository.findRefreshToken(cryptoService.sha256(refreshToken))
    if (!row || new Date(row.expires_at) < new Date()) throw unauthorized('Refresh token expired')
    userRepository.deleteRefreshToken(row.id)
    const u = userRepository.byId(row.user_id)
    if (!u || !u.is_active) throw unauthorized('User disabled')
    return { accessToken: signAccess(u), refreshToken: issueRefresh(u), user: userManager.toDto(u) }
  },
  logout(refreshToken: string | undefined) {
    if (!refreshToken) return
    const row = userRepository.findRefreshToken(cryptoService.sha256(refreshToken))
    if (row) userRepository.deleteRefreshToken(row.id)
  },
  async changePassword(userId: string, current: string, next: string) {
    const u = userRepository.byId(userId)
    if (!u) throw unauthorized()
    if (!(await argon2.verify(u.password_hash, current))) throw badRequest('Current password is incorrect')
    userRepository.update(userId, { password_hash: await argon2.hash(next), must_change_password: 0 })
    userRepository.deleteUserRefreshTokens(userId)
  },
  hash(password: string) { return argon2.hash(password) },
}
