/** knowledgeRepository — sources and chunks (embeddings as Float32 BLOB). */
import { nanoid } from 'nanoid'
import { all, get, nowIso, run, tx } from '../db/dbAccessor.ts'
import type { ChunkRow, SourceRow } from '../types/index.ts'

export const knowledgeRepository = {
  sources(): SourceRow[] { return all<SourceRow>('SELECT * FROM knowledge_sources ORDER BY created_at DESC') },
  sourceById(id: string) { return get<SourceRow>('SELECT * FROM knowledge_sources WHERE id = ?', id) },
  createSource(d: { type: 'document' | 'website'; title: string; url: string | null; file_path: string | null; mime: string | null; created_by: string }) {
    const id = nanoid(12); const t = nowIso()
    run('INSERT INTO knowledge_sources (id,type,title,url,file_path,mime,status,chunk_count,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,0,?,?,?)', id, d.type, d.title, d.url, d.file_path, d.mime, 'pending', d.created_by, t, t)
    return this.sourceById(id)!
  },
  updateSource(id: string, patch: Partial<Pick<SourceRow, 'status' | 'error' | 'chunk_count' | 'title'>>) {
    const keys = Object.keys(patch) as (keyof typeof patch)[]
    if (keys.length) run(`UPDATE knowledge_sources SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, ...keys.map((k) => patch[k] ?? null), nowIso(), id)
    return this.sourceById(id)!
  },
  deleteSource(id: string) { run('DELETE FROM knowledge_sources WHERE id = ?', id) },
  replaceChunks(sourceId: string, chunks: { content: string; tokenCount: number; embedding: Float32Array; metadata?: unknown }[]) {
    tx(() => {
      run('DELETE FROM knowledge_chunks WHERE source_id = ?', sourceId)
      chunks.forEach((c, i) => run('INSERT INTO knowledge_chunks (id,source_id,chunk_index,content,token_count,metadata_json,embedding) VALUES (?,?,?,?,?,?,?)',
        nanoid(14), sourceId, i, c.content, c.tokenCount, JSON.stringify(c.metadata ?? {}), Buffer.from(c.embedding.buffer, c.embedding.byteOffset, c.embedding.byteLength)))
    })
  },
  allChunks(): (ChunkRow & { source_title: string })[] {
    return all(`SELECT c.*, s.title source_title FROM knowledge_chunks c JOIN knowledge_sources s ON s.id = c.source_id WHERE s.status = 'ready' AND c.embedding IS NOT NULL`)
  },
  stats() {
    return get<{ sources: number; chunks: number }>('SELECT (SELECT COUNT(*) FROM knowledge_sources) sources, (SELECT COUNT(*) FROM knowledge_chunks) chunks')!
  },
}
