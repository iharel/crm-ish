/** llmService — Anthropic Claude wrapper. Stubs when no API key is configured. */
import Anthropic from '@anthropic-ai/sdk'
import { CONSTANTS } from '../constants.ts'
import { settingsRepository } from '../repositories/settingsRepository.ts'
import { cryptoService } from './cryptoService.ts'

export interface AiSettings { anthropicApiKey: string; voyageApiKey: string; draftModel: string; enrichModel: string }

const ENC_PREFIX = 'enc:'
/** API keys are stored encrypted (`enc:` + AES-GCM payload); values saved before that are plain text and still read. */
export function sealSecret(plain: string): string { return ENC_PREFIX + cryptoService.encrypt(plain) }
function openSecret(stored: string | undefined): string {
  if (!stored) return ''
  if (!stored.startsWith(ENC_PREFIX)) return stored
  try { return cryptoService.decrypt(stored.slice(ENC_PREFIX.length)) } catch { return '' }
}

function settings(): AiSettings {
  const s = settingsRepository.get<Partial<AiSettings>>('ai', {})
  return {
    anthropicApiKey: openSecret(s.anthropicApiKey) || CONSTANTS.ANTHROPIC_API_KEY,
    voyageApiKey: openSecret(s.voyageApiKey) || CONSTANTS.VOYAGE_API_KEY,
    draftModel: s.draftModel || CONSTANTS.DRAFT_MODEL,
    enrichModel: s.enrichModel || CONSTANTS.ENRICH_MODEL,
  }
}

function client(): Anthropic | null {
  const key = settings().anthropicApiKey
  return key ? new Anthropic({ apiKey: key }) : null
}

export const llmService = {
  settings,
  isConfigured() { return !!settings().anthropicApiKey },

  /** Plain text completion. Returns { text, model }. */
  async complete(opts: { system: string; user: string; model?: 'draft' | 'enrich'; maxTokens?: number }): Promise<{ text: string; model: string }> {
    const c = client()
    const model = opts.model === 'enrich' ? settings().enrichModel : settings().draftModel
    if (!c) return { text: '', model: 'stub' }
    const res = await c.messages.create({ model, max_tokens: opts.maxTokens ?? 1500, system: opts.system, messages: [{ role: 'user', content: opts.user }] })
    const text = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n')
    return { text, model }
  },

  /** JSON completion: asks for strict JSON and parses it. Returns null on stub/parse failure. */
  async completeJson<T>(opts: { system: string; user: string; model?: 'draft' | 'enrich'; maxTokens?: number }): Promise<{ data: T | null; model: string }> {
    const { text, model } = await this.complete({ ...opts, system: `${opts.system}\n\nRespond with a single JSON object and nothing else.` })
    if (!text) return { data: null, model }
    const match = text.match(/\{[\s\S]*\}/)
    try { return { data: JSON.parse(match ? match[0] : text) as T, model } } catch { return { data: null, model } }
  },
}
