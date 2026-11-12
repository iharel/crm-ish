import { useEffect, useState } from 'react'
import { themeService, type Theme } from '../services/themeService'

/** useTheme — reactive theme value + toggle backed by themeService. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => themeService.get())
  useEffect(() => themeService.subscribe(setTheme), [])
  return { theme, toggle: () => themeService.toggle(), set: (t: Theme) => themeService.set(t) }
}
