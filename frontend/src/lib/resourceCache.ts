/**
 * resourceCache — small in-memory LRU for API resources, with in-flight de-duplication and change notification.
 * Session-only (nothing persists) and bounded by entry count, so it never holds the whole inbox — only what the user
 * recently viewed or is likely to open next. Entries are served instantly and revalidated when stale.
 */
export interface CacheEntry<T> { data: T; /** ms epoch of the last successful load; 0 = marked stale. */ at: number }

type Listener = (key: string) => void
const registry = new Set<{ clear(): void }>()
/** Prefetches are best-effort and capped so they never compete with what the user is waiting for. */
const MAX_PREFETCH_IN_FLIGHT = 3
let prefetchInFlight = 0

export interface ResourceCache<T> {
  peek(key: string): CacheEntry<T> | undefined
  set(key: string, data: T): void
  /** Keep the data (it still renders instantly) but force the next read to revalidate. */
  markStale(key: string): void
  remove(key: string): void
  /** Load and store; concurrent calls for one key share a single request. */
  fetch(key: string, loader: () => Promise<T>): Promise<T>
  /** Fetch in the background unless fresh or already loading. Errors are swallowed. */
  prefetch(key: string, loader: () => Promise<T>, maxAgeMs: number): void
  subscribe(fn: Listener): () => void
  clear(): void
}

export function createResourceCache<T>(maxEntries: number): ResourceCache<T> {
  const map = new Map<string, CacheEntry<T>>()
  const inflight = new Map<string, Promise<T>>()
  const listeners = new Set<Listener>()
  const emit = (key: string) => listeners.forEach((l) => l(key))
  const cache: ResourceCache<T> = {
    peek(key) { return map.get(key) },
    set(key, data) {
      map.delete(key); map.set(key, { data, at: Date.now() })
      while (map.size > maxEntries) map.delete(map.keys().next().value as string)
      emit(key)
    },
    markStale(key) { const e = map.get(key); if (e) e.at = 0 },
    remove(key) { if (map.delete(key)) emit(key) },
    fetch(key, loader) {
      const running = inflight.get(key); if (running) return running
      const p = loader().then((data) => { cache.set(key, data); return data }).finally(() => inflight.delete(key))
      inflight.set(key, p)
      return p
    },
    prefetch(key, loader, maxAgeMs) {
      const e = map.get(key)
      if ((e && Date.now() - e.at < maxAgeMs) || inflight.has(key) || prefetchInFlight >= MAX_PREFETCH_IN_FLIGHT) return
      prefetchInFlight++
      cache.fetch(key, loader).catch(() => undefined).finally(() => { prefetchInFlight-- })
    },
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn) } },
    clear() { map.clear(); inflight.clear() },
  }
  registry.add(cache)
  return cache
}

/** Drop every cached resource (on logout, so another user never sees the previous user's mail). */
export function clearAllResourceCaches() { registry.forEach((c) => c.clear()) }
