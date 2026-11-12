/** googleManager — admin OAuth config + per-user Google account connect/disconnect. */
import { badRequest, notFound } from '../middleware/errors.ts'
import { settingsRepository } from '../repositories/settingsRepository.ts'
import { googleRepository } from '../repositories/googleRepository.ts'
import { cryptoService } from '../services/cryptoService.ts'
import { googleService } from '../services/googleService.ts'
import { socketService } from '../services/socketService.ts'
import { CONSTANTS } from '../constants.ts'
import jwt from 'jsonwebtoken'

export const googleManager = {
  getConfig() {
    const c = googleRepository.getConfig()
    return { configured: !!c, clientId: c?.client_id ?? '', hasSecret: !!c, redirectUri: c?.redirect_uri ?? `${CONSTANTS.PUBLIC_URL}/api/google/callback`, pubsubTopic: c?.pubsub_topic ?? '', updatedAt: c?.updated_at ?? null, scopes: ['gmail.modify', 'gmail.send', 'calendar.events', 'calendar.readonly', 'userinfo.email'], webhookUrl: `${CONSTANTS.PUBLIC_URL}/api/webhooks/gmail${CONSTANTS.GMAIL_WEBHOOK_TOKEN ? '?token=<GMAIL_WEBHOOK_TOKEN>' : ''}` }
  },
  saveConfig(d: { clientId: string; clientSecret?: string; redirectUri: string; pubsubTopic?: string | null }, actorId: string) {
    const existing = googleRepository.getConfig()
    const secretEnc = d.clientSecret ? cryptoService.encrypt(d.clientSecret) : existing?.client_secret_enc
    if (!secretEnc) throw badRequest('Client secret is required')
    googleRepository.saveConfig({ client_id: d.clientId, client_secret_enc: secretEnc, redirect_uri: d.redirectUri, pubsub_topic: d.pubsubTopic || null, updated_by: actorId })
    return this.getConfig()
  },
  connectUrl(userId: string) {
    if (!googleRepository.getConfig()) throw badRequest('Google OAuth is not configured. Ask an admin to set it up in Integrations.')
    const state = jwt.sign({ sub: userId, purpose: 'google-connect' }, CONSTANTS.JWT_SECRET, { expiresIn: '10m' })
    return googleService.authUrl(state)
  },
  async handleCallback(code: string, state: string) {
    let userId: string
    try { userId = (jwt.verify(state, CONSTANTS.JWT_SECRET) as { sub: string }).sub } catch { throw badRequest('Invalid OAuth state') }
    const { tokens, email } = await googleService.exchangeCode(code)
    if (!tokens.access_token) throw badRequest('Google did not return tokens')
    const existing = googleRepository.accountByUser(userId)
    const refresh = tokens.refresh_token ?? (existing ? cryptoService.decrypt(existing.refresh_token_enc) : null)
    if (!refresh) throw badRequest('Google did not return a refresh token. Remove the app from your Google account permissions and try again.')
    const acc = googleRepository.upsertAccount({ user_id: userId, email, access_token_enc: cryptoService.encrypt(tokens.access_token), refresh_token_enc: cryptoService.encrypt(refresh), expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null, scopes: tokens.scope ?? '' })
    socketService.toUser(userId, 'account:status', { email: acc.email, status: acc.status })
    return { userId, email }
  },
  account(userId: string) {
    const a = googleRepository.accountByUser(userId)
    return a ? { id: a.id, email: a.email, status: a.status, lastSyncAt: a.last_sync_at, lastError: a.last_error, calendarId: a.calendar_id, connectedAt: a.created_at } : null
  },
  disconnect(userId: string) {
    const a = googleRepository.accountByUser(userId); if (!a) throw notFound('No Google account connected')
    googleRepository.deleteAccount(a.id)
    settingsRepository.remove(`gmailBackfill:${a.id}`) // reconnecting starts the backfill cursor fresh
    socketService.toUser(userId, 'account:status', { email: null, status: 'disconnected' })
  },
  accountsOverview() { return googleRepository.accounts().map((a) => ({ id: a.id, userId: a.user_id, email: a.email, status: a.status, lastSyncAt: a.last_sync_at, lastError: a.last_error })) },
}
