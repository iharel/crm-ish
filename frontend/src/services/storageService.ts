/** storageService — the only module touching localStorage/sessionStorage. */
const ACCESS = 'looper-crm.access'
const PREFS = 'looper-crm.prefs'

export const storageService = {
  getAccessToken(): string | null { return sessionStorage.getItem(ACCESS) },
  /** Proof that a signer entered their emailed code, kept for this tab only (keyed by a short prefix of the link). */
  getSignSession(token: string): string | null { try { return sessionStorage.getItem(`crm_sign_${token.slice(0, 12)}`) } catch { return null } },
  setSignSession(token: string, session: string) { try { sessionStorage.setItem(`crm_sign_${token.slice(0, 12)}`, session) } catch { /* private mode */ } },
  setAccessToken(t: string | null) { if (t) sessionStorage.setItem(ACCESS, t); else sessionStorage.removeItem(ACCESS) },
  getPref<T>(key: string, fallback: T): T {
    try { const all = JSON.parse(localStorage.getItem(PREFS) ?? '{}') as Record<string, unknown>; return (all[key] as T) ?? fallback } catch { return fallback }
  },
  setPref(key: string, value: unknown) {
    const all = (() => { try { return JSON.parse(localStorage.getItem(PREFS) ?? '{}') as Record<string, unknown> } catch { return {} } })()
    // Storage can be blocked (private mode, embedded preview); a preference that cannot be saved must not break the click.
    try { all[key] = value; localStorage.setItem(PREFS, JSON.stringify(all)) } catch { /* not saved */ }
  },
}
