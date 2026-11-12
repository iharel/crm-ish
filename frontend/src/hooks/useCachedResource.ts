import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { errorMessage } from '../api/apiError'
import type { ResourceCache } from '../lib/resourceCache'

/**
 * useCachedResource — stale-while-revalidate read through a ResourceCache. Cached data renders on the first frame
 * (instant switching); a missing or stale entry loads in the background. `loading` is true only when there is
 * nothing to show yet, so callers render a skeleton instead of the previous resource.
 */
export function useCachedResource<T>(cache: ResourceCache<T>, key: string | null, loader: () => Promise<T>, maxAgeMs: number) {
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const [error, setError] = useState<{ key: string; message: string } | null>(null)
  const loaderRef = useRef(loader); loaderRef.current = loader

  const reload = useCallback(async (_silent?: boolean) => {
    if (!key) return
    try { await cache.fetch(key, () => loaderRef.current()); setError(null) } catch (e) { setError({ key, message: errorMessage(e) }) }
  }, [cache, key])

  useEffect(() => cache.subscribe((k) => { if (k === key) rerender() }), [cache, key])
  useEffect(() => {
    if (!key) return
    const e = cache.peek(key)
    if (!e || Date.now() - e.at > maxAgeMs) void reload()
  }, [cache, key, maxAgeMs, reload])

  const entry = key ? cache.peek(key) : undefined
  const setData = useCallback((fn: (d: T) => T) => { if (!key) return; const e = cache.peek(key); if (e) cache.set(key, fn(e.data)) }, [cache, key])
  const keyError = error && error.key === key ? error.message : null
  return { data: entry?.data ?? null, loading: !!key && !entry && !keyError, error: entry ? null : keyError, reload, setData }
}
