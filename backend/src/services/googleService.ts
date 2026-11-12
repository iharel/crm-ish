/** googleService — OAuth2 client, Gmail and Calendar API wrappers per account. */
import { google, type gmail_v1, type calendar_v3 } from 'googleapis'
import { googleRepository } from '../repositories/googleRepository.ts'
import { cryptoService } from './cryptoService.ts'
import type { GoogleAccountRow } from '../types/index.ts'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
]

/** Accounts that hit Gmail's per-user quota, with the time their cool-down ends. Every call while cooling down would also fail and burn quota. */
const coolDownUntil = new Map<string, number>()

export const googleService = {
  /** Gmail quota / rate-limit error (429, or 403 rateLimitExceeded / userRateLimitExceeded / "Quota exceeded"). */
  isRateLimited(e: unknown): boolean {
    const err = e as { code?: number; status?: number; message?: string; errors?: { reason?: string }[] }
    const code = err.code ?? err.status
    if (code === 429) return true
    if (code === 403 && (err.errors ?? []).some((x) => /rateLimitExceeded|userRateLimitExceeded|quotaExceeded/.test(x.reason ?? ''))) return true
    return /quota exceeded|rate limit exceeded/i.test(err.message ?? '')
  },
  /** Pause Gmail calls for this account (default: one minute, the quota window). */
  coolDown(accountId: string, ms = 60_000) { coolDownUntil.set(accountId, Date.now() + ms) },
  coolingDown(accountId: string): boolean { return (coolDownUntil.get(accountId) ?? 0) > Date.now() },
  config() {
    const c = googleRepository.getConfig()
    if (!c) return null
    return { clientId: c.client_id, clientSecret: cryptoService.decrypt(c.client_secret_enc), redirectUri: c.redirect_uri, pubsubTopic: c.pubsub_topic }
  },
  oauthClient() {
    const c = this.config()
    if (!c) throw new Error('Google OAuth is not configured by an admin yet')
    return new google.auth.OAuth2(c.clientId, c.clientSecret, c.redirectUri)
  },
  authUrl(state: string) {
    return this.oauthClient().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: GOOGLE_SCOPES, state })
  },
  async exchangeCode(code: string) {
    const client = this.oauthClient()
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const me = await oauth2.userinfo.get()
    return { tokens, email: me.data.email ?? '' }
  },
  authFor(account: GoogleAccountRow) {
    const client = this.oauthClient()
    client.setCredentials({
      access_token: cryptoService.decrypt(account.access_token_enc),
      refresh_token: cryptoService.decrypt(account.refresh_token_enc),
      expiry_date: account.expiry ? new Date(account.expiry).getTime() : undefined,
    })
    client.on('tokens', (t) => {
      if (t.access_token) googleRepository.updateAccount(account.id, { access_token_enc: cryptoService.encrypt(t.access_token), expiry: t.expiry_date ? new Date(t.expiry_date).toISOString() : null })
    })
    return client
  },
  gmail(account: GoogleAccountRow): gmail_v1.Gmail { return google.gmail({ version: 'v1', auth: this.authFor(account) }) },
  calendar(account: GoogleAccountRow): calendar_v3.Calendar { return google.calendar({ version: 'v3', auth: this.authFor(account) }) },
}
