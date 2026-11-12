/** cryptoService — AES-256-GCM for tokens/secrets at rest, HMAC tokens for tracking. */
import crypto from 'node:crypto'
import { CONSTANTS } from '../constants.ts'

const key = crypto.createHash('sha256').update(CONSTANTS.ENCRYPTION_KEY).digest()

export const cryptoService = {
  encrypt(plain: string): string {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), enc.toString('base64')].join('.')
  },
  decrypt(payload: string): string {
    const [ivB, tagB, dataB] = payload.split('.')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64')), decipher.final()]).toString('utf8')
  },
  hmac(value: string): string {
    return crypto.createHmac('sha256', key).update(value).digest('base64url')
  },
  /** Constant-time string comparison. */
  safeEqual(a: string, b: string): boolean {
    const x = crypto.createHash('sha256').update(a).digest(); const y = crypto.createHash('sha256').update(b).digest()
    return crypto.timingSafeEqual(x, y)
  },
  sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex')
  },
  randomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('base64url')
  },
}
