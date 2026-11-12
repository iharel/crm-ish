/**
 * safeUrl — turn a stored, user-editable link (website, LinkedIn, scheduling link) into something safe to put in an
 * href or window.open: http(s) only. A bare host ("acme.com") gets https://; any other scheme (javascript:, data:…)
 * yields undefined, so the link simply is not clickable.
 */
export function safeUrl(raw: string | null | undefined): string | undefined {
  const v = (raw ?? '').trim()
  if (!v) return undefined
  if (/^https?:\/\//i.test(v)) return v
  if (/^[a-z][a-z0-9+.-]*:/i.test(v) || v.startsWith('//')) return undefined
  return `https://${v}`
}
