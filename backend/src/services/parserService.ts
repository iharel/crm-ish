/** parserService — extract text from uploaded documents and crawled websites. */
import fs from 'node:fs/promises'
import * as cheerio from 'cheerio'
import { textService } from './textService.ts'
import { netGuardService } from './netGuardService.ts'

export interface CrawledPage { url: string; title: string; text: string }

export const parserService = {
  async fromFile(filePath: string, mime: string, originalName: string): Promise<string> {
    const lower = originalName.toLowerCase()
    if (mime === 'application/pdf' || lower.endsWith('.pdf')) {
      const mod = await import('pdf-parse')
      const pdf = (mod as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default ?? mod
      const res = await (pdf as (b: Buffer) => Promise<{ text: string }>)(await fs.readFile(filePath))
      return res.text
    }
    if (lower.endsWith('.docx')) {
      const mammoth = await import('mammoth')
      const res = await mammoth.extractRawText({ path: filePath })
      return res.value
    }
    if (lower.endsWith('.html') || lower.endsWith('.htm')) return textService.htmlToText(await fs.readFile(filePath, 'utf8'))
    return fs.readFile(filePath, 'utf8')
  },

  async fetchPage(url: string): Promise<{ title: string; text: string; links: string[] }> {
    const res = await netGuardService.fetch(url, { headers: { 'User-Agent': 'LooperCRM/1.0 (+knowledge-indexer)' }, signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    const ct = res.headers.get('content-type') ?? ''
    const body = await res.text()
    if (!ct.includes('html')) return { title: url, text: body.slice(0, 200000), links: [] }
    const $ = cheerio.load(body)
    const title = $('title').first().text().trim() || url
    const links: string[] = []
    $('a[href]').each((_, a) => { const h = $(a).attr('href'); if (h) { try { links.push(new URL(h, url).toString().split('#')[0]) } catch { /* ignore */ } } })
    return { title, text: textService.htmlToText(body), links }
  },

  async crawl(startUrl: string, opts: { depth: number; maxPages: number; sameDomain: boolean }): Promise<CrawledPage[]> {
    const start = new URL(startUrl)
    const seen = new Set<string>(); const out: CrawledPage[] = []
    let frontier: { url: string; d: number }[] = [{ url: start.toString(), d: 0 }]
    while (frontier.length && out.length < opts.maxPages) {
      const next: { url: string; d: number }[] = []
      for (const { url, d } of frontier) {
        if (seen.has(url) || out.length >= opts.maxPages) continue
        seen.add(url)
        try {
          const page = await this.fetchPage(url)
          if (page.text.length > 100) out.push({ url, title: page.title, text: page.text })
          if (d < opts.depth) for (const l of page.links) {
            try {
              const u = new URL(l)
              if (!/^https?:$/.test(u.protocol)) continue
              if (opts.sameDomain && u.hostname !== start.hostname) continue
              if (/\.(png|jpe?g|gif|svg|pdf|zip|mp4|css|js)$/i.test(u.pathname)) continue
              if (!seen.has(u.toString())) next.push({ url: u.toString(), d: d + 1 })
            } catch { /* ignore */ }
          }
        } catch (e) { console.warn('[crawl]', url, (e as Error).message) }
      }
      frontier = next
    }
    return out
  },
}
