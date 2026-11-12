/** format — date/time helpers. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.round(d / 7)}w ago`
  return new Date(iso).toLocaleDateString()
}
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso); const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (now.getTime() - d.getTime() < 6 * 86400000) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
export function fullDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}
export const initialsOf = (name: string) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
export const emailOnly = (addr: string) => addr.match(/<([^>]+)>/)?.[1] ?? addr
export const nameOnly = (addr: string) => addr.match(/^\s*"?([^"<]*)"?\s*</)?.[1]?.trim() || emailOnly(addr)

/** Human file size: 980 B, 12.4 KB, 3.1 MB. */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Recipients for "reply all" from the message being answered: To = its sender, Cc = its To + Cc without the sender
 * and without the user's own address, de-duplicated by address (display names kept from the first occurrence).
 */
export function replyAllRecipients(m: { from: string; to: string[]; cc: string[] }, ownEmail: string | null | undefined): { to: string[]; cc: string[] } {
  const own = (ownEmail ?? '').toLowerCase()
  const sender = emailOnly(m.from).toLowerCase()
  const seen = new Set<string>([sender, own].filter(Boolean))
  const cc: string[] = []
  for (const a of [...m.to, ...m.cc]) { const e = emailOnly(a).toLowerCase(); if (!e || seen.has(e)) continue; seen.add(e); cc.push(a) }
  return { to: [m.from], cc }
}
