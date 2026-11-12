/** embeddingService — Voyage AI embeddings with an offline hashing fallback. */
import { llmService } from './llmService.ts'

const DIM = 1024
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'do', 'does', 'you', 'your', 'we', 'our', 'it', 'this', 'that', 'be', 'as', 'at', 'by', 'from', 'can', 'will', 'i', 'me', 'my'])
const stem = (t: string) => t.replace(/(ies)$/, 'y').replace(/(sses|ches|shes|xes)$/, (m) => m.slice(0, -2)).replace(/([^s])s$/, '$1').replace(/(ing|ed)$/, '')
function fnv(t: string) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) } return Math.abs(h) % DIM }

/** Deterministic hashing embedding over stemmed unigrams + bigrams (fallback when no key). */
function hashEmbed(text: string): Float32Array {
  const v = new Float32Array(DIM)
  const tokens = (text.toLowerCase().match(/[a-z0-9]{2,}/g) ?? []).filter((t) => !STOP.has(t)).map(stem)
  tokens.forEach((t, i) => { v[fnv(t)] += 1; if (i > 0) v[fnv(`${tokens[i - 1]}_${t}`)] += 0.5 })
  return normalize(v)
}

function normalize(v: Float32Array): Float32Array {
  let n = 0
  for (let i = 0; i < v.length; i++) n += v[i] * v[i]
  n = Math.sqrt(n) || 1
  for (let i = 0; i < v.length; i++) v[i] /= n
  return v
}

export const embeddingService = {
  dim: DIM,
  model() { return llmService.settings().voyageApiKey ? 'voyage-3' : 'hash-1024 (offline)' },
  async embed(texts: string[], inputType: 'document' | 'query' = 'document'): Promise<Float32Array[]> {
    const key = llmService.settings().voyageApiKey
    if (!key) return texts.map(hashEmbed)
    const out: Float32Array[] = []
    for (let i = 0; i < texts.length; i += 64) {
      const batch = texts.slice(i, i + 64)
      const res = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ input: batch, model: 'voyage-3', input_type: inputType }),
      })
      if (!res.ok) throw new Error(`Voyage error ${res.status}: ${await res.text()}`)
      const json = (await res.json()) as { data: { embedding: number[] }[] }
      for (const d of json.data) out.push(normalize(Float32Array.from(d.embedding)))
    }
    return out
  },
  cosine(a: Float32Array, b: Float32Array): number {
    let s = 0
    const n = Math.min(a.length, b.length)
    for (let i = 0; i < n; i++) s += a[i] * b[i]
    return s
  },
  fromBuffer(buf: Buffer): Float32Array {
    return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
  },
}
