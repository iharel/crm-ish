/**
 * htmlCacheService — bounded in-memory LRU of sanitized email HTML (by entries and by bytes). Sanitizing with cheerio
 * on every thread open was the main CPU cost of a switch; bodies never change once imported, so caching is safe.
 * Values are user-independent (attachment urls are placeholders the caller substitutes per viewer).
 */
import { CONSTANTS } from '../constants.ts'

const cache = new Map<string, string>()
let bytes = 0

export const htmlCacheService = {
  get(key: string): string | undefined {
    const v = cache.get(key)
    if (v === undefined) return undefined
    cache.delete(key); cache.set(key, v) // refresh recency
    return v
  },
  set(key: string, value: string) {
    const prev = cache.get(key)
    if (prev !== undefined) { bytes -= prev.length; cache.delete(key) }
    if (value.length > CONSTANTS.HTML_CACHE_MAX_BYTES / 4) return // one huge mail must not evict everything
    cache.set(key, value); bytes += value.length
    while (cache.size > CONSTANTS.HTML_CACHE_MAX_ENTRIES || bytes > CONSTANTS.HTML_CACHE_MAX_BYTES) {
      const oldest = cache.keys().next().value as string
      bytes -= cache.get(oldest)!.length; cache.delete(oldest)
    }
  },
  /** Drop every entry of one message (e.g. after its thread is deleted). */
  forgetMessage(messageId: string) { for (const k of [...cache.keys()]) if (k.startsWith(`${messageId}|`)) { bytes -= cache.get(k)!.length; cache.delete(k) } },
}
