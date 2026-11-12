/** settingsManager — AI provider keys and workspace defaults (admin). */
import { settingsRepository } from '../repositories/settingsRepository.ts'
import { llmService, sealSecret } from '../services/llmService.ts'
import { embeddingService } from '../services/embeddingService.ts'

export const settingsManager = {
  getAi() {
    const s = llmService.settings()
    return { anthropicConfigured: !!s.anthropicApiKey, voyageConfigured: !!s.voyageApiKey, draftModel: s.draftModel, enrichModel: s.enrichModel, embeddingModel: embeddingService.model() }
  },
  saveAi(d: { anthropicApiKey?: string; voyageApiKey?: string; draftModel?: string; enrichModel?: string }) {
    const cur = settingsRepository.get<Record<string, string>>('ai', {})
    const next = { ...cur }
    if (d.anthropicApiKey !== undefined && d.anthropicApiKey !== '') next.anthropicApiKey = sealSecret(d.anthropicApiKey)
    if (d.voyageApiKey !== undefined && d.voyageApiKey !== '') next.voyageApiKey = sealSecret(d.voyageApiKey)
    if (d.draftModel) next.draftModel = d.draftModel
    if (d.enrichModel) next.enrichModel = d.enrichModel
    settingsRepository.set('ai', next)
    return this.getAi()
  },
  getWorkspace() { return { autoCreateLeads: settingsRepository.get<boolean>('autoCreateLeads', false), autoDraftReplies: settingsRepository.get<boolean>('autoDraftReplies', false) } },
  saveWorkspace(d: { autoCreateLeads?: boolean; autoDraftReplies?: boolean }) {
    if (d.autoCreateLeads !== undefined) settingsRepository.set('autoCreateLeads', d.autoCreateLeads)
    if (d.autoDraftReplies !== undefined) settingsRepository.set('autoDraftReplies', d.autoDraftReplies)
    return this.getWorkspace()
  },
}
