import { useEffect, useState } from 'react'
import { Sparkles, Send, Pencil, X, Calendar, Loader2, RefreshCw } from 'lucide-react'
import { draftsApi } from '../../api'
import { errorMessage } from '../../api/apiError'
import { useToast } from '../../contexts/ToastContext'
import { Badge, Button, Skeleton, Textarea } from '../ui'
import type { Draft } from '../../types'

/** DraftPanel — shows the AI proposed reply with citations and slots; edit/send/dismiss/regenerate. */
export function DraftPanel({ draft, threadId, loading, onChanged }: { draft: Draft | null; threadId: string; /** Drafts still loading: shimmer instead of the empty state. */ loading?: boolean; onChanged: () => void }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(draft?.bodyText ?? '')
  const [busy, setBusy] = useState<'send' | 'gen' | null>(null)
  useEffect(() => { setText(draft?.bodyText ?? ''); setEditing(false) }, [draft?.id, draft?.bodyText])

  async function send() { if (!draft) return; setBusy('send'); try { await draftsApi.send(draft.id, { bodyText: text }); toast.success('Reply sent'); onChanged() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(null) } }
  async function regenerate() { setBusy('gen'); try { await draftsApi.generate({ threadId, kind: 'reply' }); onChanged() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(null) } }
  async function dismiss() { if (!draft) return; try { await draftsApi.dismiss(draft.id); onChanged() } catch (e) { toast.error(errorMessage(e)) } }

  return (
    <section data-cmp="draft.aside" className="flex-1 flex flex-col min-h-0">
      <header data-cmp="draft.header" className="h-12 px-4 flex items-center gap-2 border-b border-border">
        <span data-cmp="draft.icon" className="h-6 w-6 rounded-md bg-brand-gradient text-white grid place-items-center"><Sparkles size={12} /></span>
        <span data-cmp="draft.title" className="font-semibold text-sm flex-1">Suggested reply</span>
        {draft?.confidence != null && <Badge cmp="draft.confidence" tone="accent">{Math.round(draft.confidence * 100)}% confident</Badge>}
        <Button cmp="draft.regen_button" size="icon" variant="ghost" aria-label="Regenerate" disabled={!!busy} onClick={() => void regenerate()}>{busy === 'gen' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}</Button>
      </header>
      {loading && !draft ? (
        <div data-cmp="draft.skeleton" aria-busy="true" aria-label="Loading suggested reply" className="flex-1 p-4 flex flex-col gap-2.5">
          {['w-full', 'w-11/12', 'w-4/5', 'w-full', 'w-2/3'].map((w, i) => <Skeleton key={i} cmp={`draft.skeleton_line_${i}`} className={`h-3 ${w}`} />)}
          <div data-cmp="draft.skeleton_actions" className="mt-3 flex gap-2"><Skeleton cmp="draft.skeleton_send" className="h-7 w-16" /><Skeleton cmp="draft.skeleton_edit" className="h-7 w-14" /></div>
        </div>
      ) : !draft ? (
        <div data-cmp="draft.empty" className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-fg-muted">
          <Sparkles size={20} className="text-fg-subtle" /><p data-cmp="draft.empty_text">No draft yet for this thread.</p>
          <Button cmp="draft.generate_button" variant="accent" size="sm" disabled={!!busy} icon={busy === 'gen' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} onClick={() => void regenerate()}>Generate reply</Button>
        </div>
      ) : (
        <>
          <div data-cmp="draft.body" className="flex-1 overflow-auto p-4 flex flex-col gap-3">
            {editing ? <Textarea cmp="draft.textarea" value={text} onChange={(e) => setText(e.target.value)} className="min-h-72 leading-relaxed" /> : <pre dir="auto" data-cmp="draft.text" className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{text}</pre>}
            {!!draft.citations.length && (
              <div data-cmp="draft.citations" className="border-t border-border pt-3">
                <p data-cmp="draft.citations_title" className="text-xs font-medium text-fg-muted mb-2">Grounded on</p>
                <ul data-cmp="draft.citations_list" className="flex flex-col gap-2">{draft.citations.map((c, i) => <li key={i} data-cmp={`draft.citation_${i}`} className="rounded-lg border border-border bg-surface-2 p-2 text-xs"><p dir="auto" data-cmp={`draft.citation_src_${i}`} className="font-medium font-mono truncate">{c.sourceTitle} <span className="text-accent">{c.score}</span></p><p dir="auto" data-cmp={`draft.citation_snip_${i}`} className="bidi-plain text-fg-muted mt-0.5 line-clamp-3">{c.snippet}</p></li>)}</ul>
              </div>
            )}
            {!!draft.slots.length && (
              <div data-cmp="draft.slots" className="border-t border-border pt-3">
                <p data-cmp="draft.slots_title" className="text-xs font-medium text-fg-muted mb-2 inline-flex items-center gap-1"><Calendar size={11} /> Proposed slots (from your calendar)</p>
                <div data-cmp="draft.slots_list" className="flex gap-2 flex-wrap">{draft.slots.map((s) => <Badge key={s.start} cmp={`draft.slot_${s.start}`} tone="primary">{s.label}</Badge>)}</div>
              </div>
            )}
            <p data-cmp="draft.model" className="text-[11px] text-fg-subtle font-mono">{draft.model}{draft.model === 'stub' ? ' · configure an Anthropic key in Admin → Integrations' : ''}</p>
          </div>
          <footer data-cmp="draft.footer" className="p-3 border-t border-border grid grid-cols-3 gap-2">
            <Button cmp="draft.dismiss_button" size="sm" variant="ghost" icon={<X size={12} />} onClick={() => void dismiss()}>Dismiss</Button>
            <Button cmp="draft.edit_button" size="sm" icon={<Pencil size={12} />} onClick={() => setEditing((e) => !e)}>{editing ? 'Preview' : 'Edit'}</Button>
            <Button cmp="draft.send_button" size="sm" variant="primary" disabled={!!busy} icon={busy === 'send' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} onClick={() => void send()}>Send</Button>
          </footer>
        </>
      )}
    </section>
  )
}
