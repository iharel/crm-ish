/**
 * themeService — the only module that touches `localStorage` / `matchMedia`
 * for theme handling. Applies `data-theme` on <html>.
 */
export type Theme = 'light' | 'dark'

const KEY = 'looper-crm.theme'
const listeners = new Set<(t: Theme) => void>()

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  listeners.forEach((l) => l(theme))
}

export const themeService = {
  init(): Theme {
    const t = this.get()
    apply(t)
    return t
  },
  get(): Theme {
    const stored = localStorage.getItem(KEY) as Theme | null
    return stored ?? systemTheme()
  },
  set(theme: Theme) {
    localStorage.setItem(KEY, theme)
    apply(theme)
  },
  toggle(): Theme {
    const next: Theme = this.get() === 'dark' ? 'light' : 'dark'
    this.set(next)
    return next
  },
  subscribe(fn: (t: Theme) => void) {
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  },
}
