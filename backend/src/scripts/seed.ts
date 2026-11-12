/** seed — creates the first admin when the users table is empty. */
import argon2 from 'argon2'
import { CONSTANTS } from '../constants.ts'
import { getDb } from '../db/dbAccessor.ts'
import { userRepository } from '../repositories/userRepository.ts'
import { leadStatusManager } from '../managers/leadStatusManager.ts'

export async function seedIfEmpty() {
  getDb()
  leadStatusManager.ensureDefaults()
  if (userRepository.count() > 0) return
  userRepository.create({ email: CONSTANTS.SEED_ADMIN_EMAIL, name: 'Admin', role: 'admin', passwordHash: await argon2.hash(CONSTANTS.SEED_ADMIN_PASSWORD), mustChangePassword: true })
  console.log(`[seed] admin created: ${CONSTANTS.SEED_ADMIN_EMAIL}`)
}

if (process.argv[1]?.endsWith('seed.ts')) await seedIfEmpty()
