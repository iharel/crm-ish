import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { splitQuotedHtml } from '../../lib/quotedText'

export interface HtmlBodyProps {
  cmp: string
  /** Server-sanitized HTML (never raw mail HTML). */
  html: string
  /** Muted styling for quoted trails. */
  muted?: boolean
}

/** Swap parked remote image sources back in (the server moved them to data-remote-src). */
function withRemoteImages(html: string) { return html.replace(/\ssrc="data:image\/gif;base64,[^"]*"([^>]*?)\sdata-remote-src="/g, '$1 src="') }
function hasRemoteImages(html: string) { return html.includes('data-remote-src=') }

const BIDI_BLOCKS = '.email-html :is(p, div, ul, ol, td, th, h1, h2, h3, h4, h5, h6, blockquote, pre, dd, dt):not([dir])'

/**
 * HtmlBody — renders a sanitized HTML mail body inside the `.email-html` scope with dir="auto". Quoted reply/forward
 * trails fold behind a toggle; remote (https) images stay blocked until the reader asks for them.
 */
export function HtmlBody({ cmp, html, muted }: HtmlBodyProps) {
  const [showQuoted, setShowQuoted] = useState(false)
  const [remote, setRemote] = useState(false)
  const { own, quoted } = useMemo(() => splitQuotedHtml(html), [html])
  const ownHtml = remote ? withRemoteImages(own) : own
  const quotedHtml = quoted ? (remote ? withRemoteImages(quoted) : quoted) : null
  // Images shimmer (.is-loading) until their bytes arrive — the text is readable right away. A ref is required: the
  // <img> elements come from server HTML, not from React.
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const imgs = [...(root.current?.querySelectorAll<HTMLImageElement>('img.email-img') ?? [])].filter((img) => !img.complete && !img.src.startsWith('data:'))
    const done = (e: Event) => (e.currentTarget as HTMLElement).classList.remove('is-loading')
    for (const img of imgs) { img.classList.add('is-loading'); img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }) }
    return () => { for (const img of imgs) { img.removeEventListener('load', done); img.removeEventListener('error', done) } }
  }, [ownHtml, quotedHtml, showQuoted])
  // Each block picks its own direction from its content (a Hebrew paragraph inside an English mail). Elements the
  // sender gave an explicit dir keep it. Lists decide as a whole (so bullets sit on the right side of a Hebrew list);
  // tables are left alone so layout columns never flip.
  useEffect(() => {
    for (const el of root.current?.querySelectorAll(BIDI_BLOCKS) ?? []) el.setAttribute('dir', 'auto')
  }, [ownHtml, quotedHtml, showQuoted])
  const blocked = !remote && (hasRemoteImages(own) || (!!quoted && hasRemoteImages(quoted)))
  return (
    <div ref={root} data-cmp={cmp} className={muted ? 'text-fg-muted' : undefined}>
      {blocked && (
        <button type="button" data-cmp={`${cmp}.remote_button`} onClick={() => setRemote(true)} className="mb-2 inline-flex items-center gap-1 rounded-md border border-border bg-surface-3 px-2 py-0.5 text-[11px] text-fg-muted hover:text-fg" title="Remote images are blocked for privacy until you load them">
          <ImageIcon size={11} /> Load remote images
        </button>
      )}
      <div dir="auto" data-cmp={`${cmp}.own_div`} className="email-html" dangerouslySetInnerHTML={{ __html: ownHtml }} />
      {quotedHtml && (
        <div data-cmp={`${cmp}.quoted_div`} className="mt-2">
          <button type="button" data-cmp={`${cmp}.quoted_toggle`} aria-expanded={showQuoted} onClick={() => setShowQuoted((v) => !v)} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-3 px-2 py-0.5 text-[11px] text-fg-muted hover:text-fg" title={showQuoted ? 'Hide quoted text' : 'Show quoted text'}>{showQuoted ? <ChevronDown size={11} /> : <ChevronRight size={11} />} {showQuoted ? 'Hide quoted text' : 'Show quoted text'}</button>
          {showQuoted && <div dir="auto" data-cmp={`${cmp}.quoted_body`} className="email-html mt-2 border-l-2 border-border pl-3 text-xs text-fg-muted" dangerouslySetInnerHTML={{ __html: quotedHtml }} />}
        </div>
      )}
    </div>
  )
}
