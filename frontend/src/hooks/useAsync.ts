import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../api/apiError'

/** useAsync — load data with loading/error state and a reload() handle. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fnRef = useRef(fn); fnRef.current = fn
  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try { setData(await fnRef.current()); setError(null) } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reload() }, deps)
  return { data, setData, loading, error, reload }
}
