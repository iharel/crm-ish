/** enrichmentManager — AI enrichment of leads and companies (LLM + website scrape). */
import { notFound } from '../middleware/errors.ts'
import { companyRepository } from '../repositories/companyRepository.ts'
import { leadRepository } from '../repositories/leadRepository.ts'
import { llmService } from '../services/llmService.ts'
import { notificationService } from '../services/notificationService.ts'
import { parserService } from '../services/parserService.ts'
import { socketService } from '../services/socketService.ts'
import { nowIso } from '../db/dbAccessor.ts'
import { companyManager, logoFor } from './companyManager.ts'
import { leadManager } from './leadManager.ts'

interface CompanyEnrichment { summary: string; industry?: string; size?: string; location?: string; products?: string[]; insights?: string[]; techStack?: string[]; linkedinUrl?: string }
interface LeadEnrichment { summary: string; seniority?: string; department?: string; buyingRole?: string; talkingPoints?: string[]; suggestedScore?: number; title?: string }

async function siteContext(website: string | null): Promise<string> {
  if (!website) return ''
  try { const p = await parserService.fetchPage(website); return `${p.title}\n${p.text.slice(0, 6000)}` } catch { return '' }
}

export const enrichmentManager = {
  async enrichCompany(id: string, actorId: string) {
    const c = companyRepository.byId(id); if (!c) throw notFound('Company not found')
    const site = await siteContext(c.website ?? (c.domain ? `https://${c.domain}` : null))
    const { data, model } = await llmService.completeJson<CompanyEnrichment>({
      model: 'enrich',
      system: 'You are a B2B sales research assistant. Given a company name, domain and website text, produce a concise factual profile. Keys: summary (2 sentences), industry, size (employee range like "50-200"), location, products (array), insights (array of 3-5 short sales-relevant facts), techStack (array), linkedinUrl (if inferable, else omit). Never invent specifics you cannot support from the text; say "unknown" instead.',
      user: `Company: ${c.name}\nDomain: ${c.domain ?? 'unknown'}\n\nWebsite content:\n${site || '(no website content available)'}`,
    })
    const enrichment: CompanyEnrichment = data ?? { summary: site ? `Website reachable at ${c.website}. Configure an Anthropic API key to generate insights.` : 'No website content available. Configure an Anthropic API key and add a website to enrich.', insights: [] }
    const patch = { enrichment_json: JSON.stringify({ ...enrichment, model, sources: site ? [c.website] : [] }), enriched_at: nowIso(), industry: c.industry ?? (enrichment.industry && enrichment.industry !== 'unknown' ? enrichment.industry : null), size: c.size ?? (enrichment.size && enrichment.size !== 'unknown' ? enrichment.size : null), location: c.location ?? (enrichment.location && enrichment.location !== 'unknown' ? enrichment.location : null), description: c.description ?? enrichment.summary, linkedin_url: c.linkedin_url ?? (typeof enrichment.linkedinUrl === 'string' && /^https?:\/\//i.test(enrichment.linkedinUrl) ? enrichment.linkedinUrl : null), logo_url: c.logo_url ?? logoFor(c.domain) }
    const dto = companyManager.toDto(companyRepository.update(id, patch))
    socketService.toAll('company:enriched', dto)
    notificationService.notify(actorId, { type: 'enrich', title: 'Company enriched', body: c.name, link: `/companies/${id}` })
    return dto
  },
  async enrichLead(id: string, actorId: string) {
    const l = leadRepository.byId(id); if (!l) throw notFound('Lead not found')
    const c = l.company_id ? companyRepository.byId(l.company_id) : undefined
    if (c && !c.enriched_at) await this.enrichCompany(c.id, actorId).catch(() => undefined)
    const company = l.company_id ? companyRepository.byId(l.company_id) : undefined
    const { data, model } = await llmService.completeJson<LeadEnrichment>({
      model: 'enrich',
      system: 'You are a B2B sales research assistant. Given a prospect (name, title, email, company profile) produce: summary (2 sentences), seniority (IC|Manager|Director|VP|C-level|Founder), department, buyingRole (decision maker|influencer|champion|user|unknown), talkingPoints (array of 3), suggestedScore (0-100 fit score), title (normalized title if given). Be factual; use "unknown" when unsure.',
      user: `Prospect: ${l.first_name} ${l.last_name}\nTitle: ${l.title ?? 'unknown'}\nEmail: ${l.email ?? 'unknown'}\nNotes: ${l.notes ?? ''}\n\nCompany: ${company?.name ?? 'unknown'}\nCompany profile: ${company?.enrichment_json ?? company?.description ?? 'unknown'}`,
    })
    const enrichment: LeadEnrichment = data ?? { summary: 'Configure an Anthropic API key in Admin → Integrations to generate AI enrichment.', talkingPoints: [] }
    const patch = { enrichment_json: JSON.stringify({ ...enrichment, model }), enriched_at: nowIso(), score: typeof enrichment.suggestedScore === 'number' ? Math.max(0, Math.min(100, Math.round(enrichment.suggestedScore))) : l.score, title: l.title ?? (enrichment.title && enrichment.title !== 'unknown' ? enrichment.title : null) }
    leadRepository.update(id, patch)
    leadRepository.addActivity(id, actorId, 'enrichment', { model })
    const dto = leadManager.get(id)
    socketService.toAll('lead:enriched', dto)
    notificationService.notify(actorId, { type: 'enrich', title: 'Lead enriched', body: dto.name, link: `/leads/${id}` })
    return dto
  },
}
