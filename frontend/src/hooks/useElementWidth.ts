import { useEffect, useState } from 'react'

/**
 * useElementWidth — the live content width of an element (ResizeObserver). Returns [ref, width]: pass `ref` as the
 * element's `ref` (a callback ref, so elements that mount later are picked up); width is 0 until it is measured.
 */
export function useElementWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [el, setEl] = useState<T | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!el) return
    const measure = () => setWidth(Math.floor(el.clientWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [setEl, width]
}
