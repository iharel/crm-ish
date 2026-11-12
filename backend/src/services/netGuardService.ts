/**
 * netGuardService — SSRF guard for server-side fetches of user-supplied urls (knowledge crawl, company enrichment).
 * Only http(s) to public addresses is allowed; redirects are followed by hand so every hop is checked.
 */
import dns from 'node:dns/promises'
import net from 'node:net'

const MAX_REDIRECTS = 5

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number)
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224
}
function isPrivateV6(ip: string): boolean {
  const v = ip.toLowerCase()
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateV4(mapped[1])
  // Loopback/unspecified, IPv4-mapped in hex form, unique-local (fc00::/7), link-local (fe80::/10), multicast, NAT64.
  return v === '::' || v === '::1' || v.startsWith('::ffff:') || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith('ff') || v.startsWith('64:ff9b:')
}
function isPrivate(ip: string): boolean { return net.isIPv4(ip) ? isPrivateV4(ip) : isPrivateV6(ip) }

export const netGuardService = {
  /** Throws unless `raw` is an http(s) url whose host resolves only to public addresses. */
  async assertPublicUrl(raw: string): Promise<URL> {
    let url: URL
    try { url = new URL(raw) } catch { throw new Error('Invalid URL') }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http(s) URLs are allowed')
    const host = url.hostname.replace(/^\[|\]$/g, '')
    const addresses = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((a) => a.address)
    if (!addresses.length || addresses.some(isPrivate)) throw new Error('This address is not allowed')
    return url
  },
  /** fetch() for untrusted urls: validates the target and each redirect hop. */
  async fetch(raw: string, init: RequestInit = {}): Promise<Response> {
    let target = raw
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const url = await this.assertPublicUrl(target)
      const res = await fetch(url, { ...init, redirect: 'manual' })
      const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null
      if (!location) return res
      await res.body?.cancel().catch(() => undefined)
      target = new URL(location, url).toString()
    }
    throw new Error('Too many redirects')
  },
}
