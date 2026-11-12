/** knowledgeManager — ingest documents/websites, chunk+embed, semantic search (RAG retrieval). */
import fs from 'node:fs/promises'
import { badRequest, notFound } from '../middleware/errors.ts'
import { knowledgeRepository } from '../repositories/knowledgeRepository.ts'
import { embeddingService } from '../services/embeddingService.ts'
import { parserService } from '../services/parserService.ts'
import { socketService } from '../services/socketService.ts'
import { textService } from '../services/textService.ts'
import type { Citation, SourceRow } from '../types/index.ts'
import { CONSTANTS } from '../constants.ts'

export interface SourceDto { id: string; type: 'document' | 'website'; title: string; url: string | null; status: string; error: string | null; chunkCount: number; createdAt: string; updatedAt: string }

export const knowledgeManager = {
  toDto(s: SourceRow): SourceDto { return { id: s.id, type: s.type, title: s.title, url: s.url, status: s.status, error: s.error, chunkCount: s.chunk_count, createdAt: s.created_at, updatedAt: s.updated_at } },
  list() { return knowledgeRepository.sources().map((s) => this.toDto(s)) },
  stats() { return { ...knowledgeRepository.stats(), embeddingModel: embeddingService.model() } },

  addDocument(file: { path: string; mimetype: string; originalname: string }, userId: string) {
    const s = knowledgeRepository.createSource({ type: 'document', title: file.originalname, url: null, file_path: file.path, mime: file.mimetype, created_by: userId })
    void this.index(s.id)
    return this.toDto(s)
  },
  addWebsite(url: string, opts: { crawl: boolean; depth: number }, userId: string) {
    try { new URL(url) } catch { throw badRequest('Invalid URL') }
    const s = knowledgeRepository.createSource({ type: 'website', title: url, url, file_path: null, mime: JSON.stringify(opts), created_by: userId })
    void this.index(s.id)
    return this.toDto(s)
  },
  reindex(id: string) { if (!knowledgeRepository.sourceById(id)) throw notFound('Source not found'); void this.index(id); return this.toDto(knowledgeRepository.sourceById(id)!) },
  async delete(id: string) {
    const s = knowledgeRepository.sourceById(id); if (!s) throw notFound('Source not found')
    knowledgeRepository.deleteSource(id)
    if (s.file_path) await fs.unlink(s.file_path).catch(() => undefined)
    socketService.toAll('knowledge:status', { id, status: 'deleted' })
  },

  async index(id: string) {
    const s = knowledgeRepository.sourceById(id); if (!s) return
    const emit = (status: string, extra: Record<string, unknown> = {}) => socketService.toAll('knowledge:status', { id, status, ...extra })
    knowledgeRepository.updateSource(id, { status: 'processing', error: null }); emit('processing')
    try {
      let docs: { text: string; meta: Record<string, unknown> }[] = []
      if (s.type === 'document') {
        const text = await parserService.fromFile(s.file_path!, s.mime ?? '', s.title)
        docs = [{ text, meta: { title: s.title } }]
      } else {
        const opts = s.mime ? (JSON.parse(s.mime) as { crawl: boolean; depth: number }) : { crawl: false, depth: 0 }
        const pages = await parserService.crawl(s.url!, { depth: opts.crawl ? Math.min(opts.depth, 3) : 0, maxPages: 40, sameDomain: true })
        if (!pages.length) throw new Error('No readable pages found')
        docs = pages.map((p) => ({ text: p.text, meta: { title: p.title, url: p.url } }))
        knowledgeRepository.updateSource(id, { title: pages[0].title.slice(0, 120) || s.url! })
      }
      const pieces = docs.flatMap((d) => textService.chunk(d.text).map((content) => ({ content, meta: d.meta })))
      if (!pieces.length) throw new Error('No text content extracted')
      const embeddings = await embeddingService.embed(pieces.map((p) => p.content))
      knowledgeRepository.replaceChunks(id, pieces.map((p, i) => ({ content: p.content, tokenCount: textService.estimateTokens(p.content), embedding: embeddings[i], metadata: p.meta })))
      knowledgeRepository.updateSource(id, { status: 'ready', chunk_count: pieces.length }); emit('ready', { chunkCount: pieces.length })
    } catch (e) {
      knowledgeRepository.updateSource(id, { status: 'failed', error: (e as Error).message }); emit('failed', { error: (e as Error).message })
    }
  },

  async search(query: string, topK = CONSTANTS.RAG_TOP_K): Promise<Citation[]> {
    const chunks = knowledgeRepository.allChunks()
    if (!chunks.length) return []
    const [q] = await embeddingService.embed([query], 'query')
    const scored = chunks.map((c) => ({ c, score: embeddingService.cosine(q, embeddingService.fromBuffer(c.embedding!)) }))
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, topK).filter((s) => s.score > 0.02).map(({ c, score }) => ({ sourceId: c.source_id, sourceTitle: c.source_title, snippet: c.content.slice(0, 600), score: Math.round(score * 1000) / 1000 }))
  },
}
