/** quotedText — split an email body into the author's own text and the quoted reply/forward trail below it. */

const MARKERS: RegExp[] = [
  /^On .{3,120}(wrote|écrit|schrieb|escribió):\s*$/i,     // Gmail / Apple Mail: "On Mon, Oct 19, 2026 at 9:00 AM Name <a@b> wrote:"
  /^בתאריך .{3,120}(כתב|כתבה|כתב\/ה):?\s*$/,              // Hebrew Gmail
  /^-{2,}\s*Original Message\s*-{2,}$/i,                  // Outlook
  /^-{2,}\s*Forwarded message\s*-{2,}$/i,                 // Gmail forward
  /^_{5,}\s*$/,                                           // Outlook separator line
  /^From:\s.+$/i,                                         // Outlook header block (checked together with a following Sent:/Date: line)
  /^Le .{3,120} a écrit\s*:\s*$/i,
  /^Am .{3,120} schrieb .{0,80}:\s*$/i,
  /^El .{3,120} escribió:\s*$/i,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}.{0,60}(wrote|כתב):?\s*$/i,
]

export interface SplitBody { own: string; quoted: string | null }

/** Returns the visible part and the folded quoted trail (null when nothing to fold). */
export function splitQuoted(text: string): SplitBody {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let cut = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    if (line.startsWith('>')) { cut = i; break }
    if (/^From:\s.+$/i.test(line)) {
      const next = lines.slice(i + 1, i + 4).map((l) => l.trim())
      if (next.some((l) => /^(Sent|Date|To|Subject):\s/i.test(l))) { cut = i; break }
      continue
    }
    // Gmail wraps long attribution lines: "On Mon, Oct 19, 2026 at 9:00 AM Ron Levi" / "<ron@corp.com> wrote:".
    if (/^On\s.{3,}/i.test(line) && /\d/.test(line) && lines.slice(i, i + 3).some((l) => /wrote:\s*$/i.test(l.trim()))) { cut = i; break }
    if (MARKERS.some((re) => re.test(line))) { cut = i; break }
  }
  if (cut < 0) return { own: text.trim(), quoted: null }
  const own = lines.slice(0, cut).join('\n').trim()
  const quoted = lines.slice(cut).join('\n').trim()
  if (!quoted) return { own: text.trim(), quoted: null }
  return { own: own || '(no new text)', quoted }
}

/** Elements that start a quoted reply / forward trail in HTML mail (Gmail, Apple Mail, Outlook, Yahoo, Thunderbird). */
const HTML_QUOTE_SELECTORS = [
  '.gmail_quote', 'blockquote[type="cite"]', '#divRplyFwdMsg', '[id^="appendonsend"]', '.yahoo_quoted', '.moz-cite-prefix',
  '#mail-editor-reference-message-container', '.protonmail_quote', 'div[style*="border-top:solid #E1E1E1"]', 'div[style*="border-top: solid #E1E1E1"]',
]

export interface SplitHtml { own: string; quoted: string | null }

/**
 * Split an HTML body into the author's own markup and the quoted trail. The first matching quote container and every
 * sibling after it (Outlook puts the old mail after a separator div) become the quoted part. Falls back to text markers
 * found in the rendered text of a top-level block.
 */
export function splitQuotedHtml(html: string): SplitHtml {
  if (!html || typeof DOMParser === 'undefined') return { own: html, quoted: null }
  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, 'text/html')
  const root = doc.getElementById('__root'); if (!root) return { own: html, quoted: null }
  let start: Element | null = root.querySelector(HTML_QUOTE_SELECTORS.join(','))
  if (!start) {
    // Text-marker fallback: a top-level block whose own text is a "On … wrote:" line.
    for (const el of Array.from(root.children)) {
      const t = (el.textContent ?? '').trim().replace(/\s+/g, ' ')
      if (t.length < 200 && splitQuoted(t).quoted === t && t) { start = el; break }
    }
  }
  if (!start) return { own: html, quoted: null }
  // Everything from the quote start to the end of the body, in document order: the start node and its following
  // siblings, then the following siblings of each ancestor (Gmail nests the quote inside the outer wrapper div).
  const box = doc.createElement('div')
  let node: Node | null = start
  let parent: Node | null = start.parentNode
  while (parent) {
    let cur: Node | null = node
    while (cur) { const next: Node | null = cur.nextSibling; box.appendChild(cur); cur = next }
    if (parent === root) break
    node = parent.nextSibling
    parent = parent.parentNode
  }
  const own = root.innerHTML.trim()
  const quoted = box.innerHTML.trim()
  if (!quoted) return { own: html, quoted: null }
  const ownText = (root.textContent ?? '').trim()
  return { own: ownText || root.querySelector('img') ? own : '<p>(no new text)</p>', quoted }
}
