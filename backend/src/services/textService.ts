/** textService — chunking, token estimation, HTML→text, email address parsing. */
import * as cheerio from 'cheerio'
import { CONSTANTS } from '../constants.ts'

export const textService = {
  estimateTokens(s: string) { return Math.ceil(s.length / 4) },
  chunk(text: string, maxTokens = CONSTANTS.CHUNK_TOKENS, overlapTokens = CONSTANTS.CHUNK_OVERLAP): string[] {
    const maxChars = maxTokens * 4; const overlap = overlapTokens * 4
    const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    const chunks: string[] = []; let cur = ''
    for (const p of paras) {
      if ((cur + '\n\n' + p).length > maxChars && cur) {
        chunks.push(cur)
        cur = cur.slice(-overlap) + '\n\n' + p
      } else cur = cur ? cur + '\n\n' + p : p
      while (cur.length > maxChars) { chunks.push(cur.slice(0, maxChars)); cur = cur.slice(maxChars - overlap) }
    }
    if (cur.trim()) chunks.push(cur)
    return chunks
  },
  htmlToText(html: string): string {
    const $ = cheerio.load(html)
    $('script,style,noscript,nav,footer,header,iframe').remove()
    return $('body').text().replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim()
  },
  textToHtml(text: string): string {
    const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return esc.split(/\n{2,}/).map((p) => `<p dir="auto">${p.replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<"']+)/g, '<a href="$1">$1</a>')}</p>`).join('')
  },
  parseAddress(raw: string): { email: string; name: string } {
    const m = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/)
    if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() }
    return { name: '', email: raw.trim().toLowerCase() }
  },
  parseAddressList(raw: string | undefined): { email: string; name: string }[] {
    if (!raw) return []
    return raw.split(',').map((s) => s.trim()).filter(Boolean).map((s) => this.parseAddress(s))
  },
  domainOf(email: string) { return email.split('@')[1]?.toLowerCase() ?? '' },
  isFreeMailDomain(d: string) { return /^(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|aol|proton|protonmail|walla)\./.test(d + '.') },
}
