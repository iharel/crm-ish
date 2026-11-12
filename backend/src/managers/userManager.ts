/** userManager — user CRUD (admin) and profile updates. */
import argon2 from 'argon2'
import { badRequest, conflict, notFound } from '../middleware/errors.ts'
import { googleRepository } from '../repositories/googleRepository.ts'
import { userRepository } from '../repositories/userRepository.ts'
import type { Role, UserDto, UserRow } from '../types/index.ts'

export const userManager = {
  toDto(u: UserRow): UserDto {
    const g = googleRepository.accountByUser(u.id)
    return { id: u.id, email: u.email, name: u.name, role: u.role, avatarUrl: u.avatar_url, schedulingLink: u.scheduling_link, timezone: u.timezone, workingHoursStart: u.working_hours_start, workingHoursEnd: u.working_hours_end, isActive: !!u.is_active, mustChangePassword: !!u.must_change_password, createdAt: u.created_at, gmail: g ? { email: g.email, status: g.status, lastSyncAt: g.last_sync_at } : null }
  },
  list() { return userRepository.list().map((u) => this.toDto(u)) },
  get(id: string) { const u = userRepository.byId(id); if (!u) throw notFound('User not found'); return this.toDto(u) },
  async create(d: { email: string; name: string; role: Role; password: string }) {
    if (userRepository.byEmail(d.email)) throw conflict('Email already exists')
    const u = userRepository.create({ email: d.email.toLowerCase(), name: d.name, role: d.role, passwordHash: await argon2.hash(d.password), mustChangePassword: true })
    return this.toDto(u)
  },
  update(actorId: string, id: string, d: { name?: string; role?: Role; isActive?: boolean; email?: string }) {
    const u = userRepository.byId(id); if (!u) throw notFound('User not found')
    if (actorId === id && d.role && d.role !== 'admin') throw badRequest('You cannot demote yourself')
    if (actorId === id && d.isActive === false) throw badRequest('You cannot disable yourself')
    if (d.email && d.email.toLowerCase() !== u.email && userRepository.byEmail(d.email)) throw conflict('Email already exists')
    const patch: Partial<UserRow> = {}
    if (d.name !== undefined) patch.name = d.name
    if (d.role !== undefined) patch.role = d.role
    if (d.isActive !== undefined) patch.is_active = d.isActive ? 1 : 0
    if (d.email !== undefined) patch.email = d.email.toLowerCase()
    return this.toDto(userRepository.update(id, patch))
  },
  updateProfile(id: string, d: { name?: string; schedulingLink?: string | null; timezone?: string; workingHoursStart?: string; workingHoursEnd?: string }) {
    const patch: Partial<UserRow> = {}
    if (d.name !== undefined) patch.name = d.name
    if (d.schedulingLink !== undefined) patch.scheduling_link = d.schedulingLink
    if (d.timezone !== undefined) patch.timezone = d.timezone
    if (d.workingHoursStart !== undefined) patch.working_hours_start = d.workingHoursStart
    if (d.workingHoursEnd !== undefined) patch.working_hours_end = d.workingHoursEnd
    return this.toDto(userRepository.update(id, patch))
  },
  async resetPassword(id: string, password: string) {
    if (!userRepository.byId(id)) throw notFound('User not found')
    userRepository.update(id, { password_hash: await argon2.hash(password), must_change_password: 1 })
    userRepository.deleteUserRefreshTokens(id)
  },
  delete(actorId: string, id: string) {
    if (actorId === id) throw badRequest('You cannot delete yourself')
    if (!userRepository.byId(id)) throw notFound('User not found')
    userRepository.delete(id)
  },
}
