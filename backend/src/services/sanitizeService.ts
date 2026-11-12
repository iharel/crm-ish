/**
 * sanitizeService — allow-list HTML sanitizer for email bodies (cheerio, server-side).
 * Removes active content, inline event handlers, javascript: urls, CSS url()/expression(), sender classes and data-*
 * attributes; rewrites cid: images to
 * attachment urls; parks remote images behind data-remote-src so the browser never loads them without consent.
 */
import * as cheerio from 'cheerio'

const DROP = 'script,style,iframe,frame,frameset,object,embed,applet,form,input,button,select,textarea,link,meta,base,noscript,svg,math,template,title,head,video,audio,source,track,portal,dialog,noembed,noframes,xmp,plaintext,listing'
/** Sender classes are dropped (they could hit the app's own utility classes); only the markers the quote folding needs stay. */
const KEEP_CLASSES = new Set(['gmail_quote', 'gmail_quote_container', 'gmail_attr', 'gmail_extra', 'gmail_signature', 'yahoo_quoted', 'moz-cite-prefix', 'protonmail_quote'])
const URL_ATTRS = ['href', 'src', 'background', 'poster', 'action', 'formaction', 'xlink:href']
const TRANSPARENT = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

export interface SanitizeOptions {
  /** Map of lower-cased Content-ID → url to use for `cid:` references. */
  cidUrls: Record<string, string>
}

export const sanitizeService = {
  html(raw: string, opts: SanitizeOptions): string {
    if (!raw) return ''
    const $ = cheerio.load(raw, { xml: false })
    $(DROP).remove()
    $('*').each((_i, el) => {
      if (el.type !== 'tag') return
      const node = $(el)
      for (const name of Object.keys(el.attribs ?? {})) {
        const lower = name.toLowerCase()
        const value = el.attribs[name] ?? ''
        if (lower.startsWith('on') || lower === 'srcset' || lower === 'srcdoc' || lower === 'contenteditable' || lower === 'background' || lower === 'poster' || lower === 'ping' || lower === 'popover' || lower === 'popovertarget' || lower === 'autofocus' || lower.startsWith('data-')) { node.removeAttr(name); continue }
        if (lower === 'class') {
          const kept = value.split(/\s+/).filter((c) => KEEP_CLASSES.has(c)).join(' ')
          if (kept) node.attr('class', kept); else node.removeAttr(name)
          continue
        }
        if (lower === 'style') {
          const cleaned = value.replace(/url\s*\([^)]*\)/gi, 'none').replace(/expression\s*\([^)]*\)/gi, '').replace(/@import[^;]*;?/gi, '').replace(/behavior\s*:[^;]*;?/gi, '').replace(/position\s*:\s*(fixed|sticky)/gi, 'position:static')
          node.attr('style', cleaned); continue
        }
        if (URL_ATTRS.includes(lower)) {
          const v = value.trim().replace(/[\u0000-\u001f]/g, '')
          if (/^\s*(javascript|vbscript|data):/i.test(v) && !(lower === 'src' && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(v))) node.removeAttr(name)
        }
      }
      if (el.tagName === 'a') { node.attr('target', '_blank'); node.attr('rel', 'noopener noreferrer nofollow') }
      if (el.tagName === 'img') {
        const src = (node.attr('src') ?? '').trim()
        const w = Number(node.attr('width') ?? 0); const h = Number(node.attr('height') ?? 0)
        const pixel = (w === 1 && h === 1) || /\/t\/o\/[^/]+\.gif/i.test(src)
        if (pixel || !src) { node.remove(); return }
        // Text first: images never hold up the body; the client shimmers them (.email-img) until they load.
        node.attr('loading', 'lazy'); node.attr('decoding', 'async'); node.addClass('email-img')
        if (/^cid:/i.test(src)) {
          const url = opts.cidUrls[src.slice(4).replace(/^<|>$/g, '').toLowerCase()]
          if (url) node.attr('src', url); else node.remove()
        } else if (/^https?:/i.test(src)) {
          node.attr('data-remote-src', src); node.attr('src', TRANSPARENT); node.addClass('email-remote-img')
        }
      }
    })
    const body = $('body')
    return (body.length ? body.html() : $.root().html()) ?? ''
  },
}
