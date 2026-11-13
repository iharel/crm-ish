import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileSignature, Archive, Reply, Sparkles, Send, Pencil, Link2, Eye, MousePointerClick, AlertTriangle, RefreshCw, Search, Inbox, Loader2, ArchiveRestore, Calendar, ExternalLink, Trash2, UserPlus, Building2, History, ChevronDown, ChevronRight, CheckSquare, Paperclip, ReplyAll, Truck } from 'lucide-react'
import { companiesApi, draftsApi, emailsApi, tasksApi } from '../api'
import { ApiError, errorMessage } from '../api/apiError'
import { CompanyPicker, type CompanyPick } from '../components/companies/CompanyPicker'
import { companyDomainOf, suggestCompanyName } from '../lib/companyName'
import { AppShell } from '../components/shell/AppShell'
import { ComposeModal } from '../components/email/ComposeModal'
import { DraftPanel } from '../components/email/DraftPanel'
import { HtmlBody } from '../components/email/HtmlBody'
import { AttachmentStrip } from '../components/email/AttachmentStrip'
import { ThreadContextCard } from '../components/email/ThreadContextCard'
import { CompanySuggestionCard } from '../components/email/CompanySuggestionCard'
import { TaskModal } from '../components/tasks/TaskModal'
import { MeetingModal } from '../components/email/MeetingModal'
import { Avatar, Badge, Button, Modal, Skeleton, Tabs, cn } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useCachedResource } from '../hooks/useCachedResource'
import { HOVER_PREFETCH_DELAY_MS, INBOX_MAX_AGE_MS, MESSAGE_HTML_MAX_AGE_MS, draftsCache, messageHtmlCache, taskCountCache, threadCache, threadListCache } from '../lib/inboxCache'
import { ThreadListSkeleton } from '../components/email/skeletons/ThreadListSkeleton'
import { ReadingPaneSkeleton } from '../components/email/skeletons/ReadingPaneSkeleton'
import { MessagesSkeleton } from '../components/email/skeletons/MessagesSkeleton'
import { MessageBodySkeleton } from '../components/email/skeletons/MessageBodySkeleton'
import { useContextMenu } from '../hooks/useContextMenu'
import { ContextMenu } from '../components/common/ContextMenu'
import { ResizeHandle } from '../components/common/ResizeHandle'
import { usePanelSize } from '../hooks/usePanelSize'
import { useSocketEvent } from '../hooks/useSocketEvent'
import { fullDate, nameOnly, replyAllRecipients, shortDate, timeAgo } from '../lib/format'
import { splitQuoted } from '../lib/quotedText'
import type { Company, Draft, Message, Thread } from '../types'

const statusMeta: Record<string, { label: string; icon: React.ReactNode; tone: 'neutral' | 'info' | 'success' | 'accent' | 'danger' }> = {
  sent: { label: 'Sent', icon: <Send size={10} />, tone: 'neutral' }, delivered: { label: 'Delivered', icon: <Send size={10} />, tone: 'info' },
  opened: { label: 'Opened', icon: <Eye size={10} />, tone: 'success' }, clicked: { label: 'Clicked', icon: <MousePointerClick size={10} />, tone: 'accent' }, bounced: { label: 'Bounced', icon: <AlertTriangle size={10} />, tone: 'danger' },
}

/** True when the cached copy of a thread is older than its list row (mail arrived since it was cached). */
function isBehind(x: Thread) {
  const c = threadCache.peek(x.id)?.data.thread
  return !!c && (c.messageCount !== x.messageCount || c.lastMessageAt !== x.lastMessageAt)
}

/** InboxPage — three panes: thread list, conversation, AI draft. */
export default function InboxPage() {
  const { threadId } = useParams()
  const nav = useNavigate()
  const listPanel = usePanelSize('inbox.list', { default: 340, min: 260, max: 520 })
  const sidePanel = usePanelSize('inbox.side', { default: 380, min: 300, max: 560 })
  const toast = useToast()
  const { user } = useAuth()
  const [filter, setFilter] = useState('inbox')
  /** Sort / page / display time of a row, as the server ordered the tab: Inbox by latest inbound, Sent by latest outbound, Threads by latest of either. */
  const rowTime = (x: Thread) => x.sortAt ?? x.lastMessageAt
  const [q, setQ] = useState('')
  const [compose, setCompose] = useState<null | { threadId?: string; to?: string[]; cc?: string[]; subject?: string; replyAll?: boolean }>(null)
  const [meeting, setMeeting] = useState(false)
  const [linking, setLinking] = useState(false)
  const [taskFor, setTaskFor] = useState<Thread | null>(null)
  /** Thread whose peer is being set as a supplier and needs a company picked (free-mail sender). */
  const [supplierFor, setSupplierFor] = useState<Thread | null>(null)
  const openTasks = useCachedResource(taskCountCache, threadId ?? null, () => tasksApi.openCount({ threadId: threadId! }), INBOX_MAX_AGE_MS)
  useSocketEvent('task:updated', () => void openTasks.reload())
  const [syncing, setSyncing] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [gmailExhausted, setGmailExhausted] = useState(false)
  const PAGE = 40
  const threads = useCachedResource(threadListCache, `${filter}|${q}`, () => emailsApi.threads({ q: q || undefined, filter, limit: PAGE }), 0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLLIElement>(null)
  useEffect(() => { setHasMore((threads.data?.length ?? 0) >= PAGE) }, [threads.data])
  useEffect(() => {
    const el = sentinelRef.current; if (!el || !hasMore) return
    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loadingMore) return
      const last = threads.data?.[threads.data.length - 1]; const cursor = last && rowTime(last); if (!cursor) { setHasMore(false); return }
      setLoadingMore(true)
      try {
        const more = await emailsApi.threads({ q: q || undefined, filter, before: cursor, limit: PAGE })
        threads.setData((d) => [...(d ?? []), ...more.filter((m) => !d?.some((x) => x.id === m.id))])
        if (more.length < PAGE) setHasMore(false)
      } catch (e) { toast.error(errorMessage(e)) } finally { setLoadingMore(false) }
    }, { rootMargin: '200px' })
    io.observe(el); return () => io.disconnect()
  }, [hasMore, loadingMore, threads.data, q, filter]) // eslint-disable-line react-hooks/exhaustive-deps
  const ctx = useContextMenu<Thread>()
  /** Best-effort background load of a thread, its drafts and its open-task count. */
  function prefetchThread(x: Thread) {
    if (isBehind(x)) threadCache.markStale(x.id)
    threadCache.prefetch(x.id, () => emailsApi.thread(x.id), INBOX_MAX_AGE_MS)
  }
  async function removeThread(x: Thread) { if (!confirm('Delete this thread from the CRM? Gmail is not affected.')) return; try { await emailsApi.remove(x.id); threads.setData((d) => d?.filter((t) => t.id !== x.id) ?? d); if (x.id === threadId) nav('/inbox'); toast.success('Thread deleted') } catch (e) { toast.error(errorMessage(e)) } }
  /** Set the thread's peer as a supplier contact; asks for the company only when it cannot be worked out from the email domain. */
  async function setSupplier(x: Thread) {
    try {
      const t2 = await emailsApi.setSupplier(x.id)
      threads.setData((d) => d?.map((t) => (t.id === x.id ? { ...t2, sortAt: t.sortAt, lastSentAt: t.lastSentAt } : t)) ?? d); threadCache.markStale(x.id); if (x.id === threadId) void thread.reload()
      toast.success(`${t2.companyName ?? 'Sender'} set as supplier`)
    } catch (e) { if (e instanceof ApiError && e.code === 'COMPANY_REQUIRED') setSupplierFor(x); else toast.error(errorMessage(e)) }
  }
  async function convertThread(x: Thread) { try { const t2 = await emailsApi.convert(x.id); threads.setData((d) => d?.map((t) => (t.id === x.id ? { ...t2, sortAt: t.sortAt, lastSentAt: t.lastSentAt } : t)) ?? d); if (x.id === threadId) void thread.reload(); toast.success(`Lead created: ${t2.leadName ?? ''}`) } catch (e) { toast.error(errorMessage(e)) } }
  const thread = useCachedResource(threadCache, threadId ?? null, () => emailsApi.thread(threadId!), INBOX_MAX_AGE_MS)
  const drafts = useCachedResource(draftsCache, threadId ?? null, () => draftsApi.list({ threadId: threadId! }), INBOX_MAX_AGE_MS)
  /** The list row of the open thread: header, actions and side panel render from it before the messages arrive. */
  const row = threadId ? threads.data?.find((x) => x.id === threadId) : undefined
  const proposed: Draft | null = drafts.data?.find((d) => d.status === 'proposed' || d.status === 'edited') ?? null

  /** A change to a thread: refresh it when open, otherwise just mark its cached copy stale. */
  function touched(id: string) { if (id === threadId) void thread.reload(); else threadCache.markStale(id) }
  useSocketEvent<{ thread: Thread }>('email:new', (p) => { void threads.reload(); touched(p.thread.id) })
  useSocketEvent<{ threadId: string }>('email:event', (p) => touched(p.threadId))
  useSocketEvent<{ threadId: string }>('thread:scanned', (p) => touched(p.threadId))
  useSocketEvent<{ thread: Thread }>('email:updated', (p) => { void threads.reload(); touched(p.thread.id) })
  useSocketEvent<Draft>('draft:ready', (d) => { void threads.reload(); if (!d.threadId) return; if (d.threadId === threadId) void drafts.reload(); else draftsCache.markStale(d.threadId) })
  // Opening marks read explicitly (GET is side-effect free so prefetching never marks mail read).
  useEffect(() => {
    if (!threadId || !row?.unread) return
    threads.setData((d) => d.map((x) => (x.id === threadId ? { ...x, unread: false } : x)))
    emailsApi.markRead(threadId).catch(() => undefined)
  }, [threadId, row?.unread]) // eslint-disable-line react-hooks/exhaustive-deps
  // After the open thread is on screen, warm its neighbours so arrowing / clicking up or down is instant.
  useEffect(() => {
    if (!threadId || !thread.data) return
    const list = threads.data ?? []; const i = list.findIndex((x) => x.id === threadId)
    for (const n of [list[i + 1], list[i - 1]]) if (n) prefetchThread(n)
  }, [threadId, !!thread.data]) // eslint-disable-line react-hooks/exhaustive-deps
  const hoverTimer = useRef<number | null>(null)
  function hoverStart(x: Thread) { hoverEnd(); hoverTimer.current = window.setTimeout(() => prefetchThread(x), HOVER_PREFETCH_DELAY_MS) }
  function hoverEnd() { if (hoverTimer.current) window.clearTimeout(hoverTimer.current); hoverTimer.current = null }
  /** Open a thread; a cached copy that is behind the list row (new mail since) is revalidated rather than trusted. */
  function openThread(x: Thread) { if (isBehind(x)) threadCache.markStale(x.id); nav(`/inbox/${x.id}`) }

  /** Backfill: pull the next page of older mail from Gmail, then extend the list. */
  async function loadOlder() {
    setLoadingOlder(true)
    try {
      const r = await emailsApi.syncOlder()
      if (!r.hasMore) setGmailExhausted(true)
      if (r.imported) toast.success(`Imported ${r.imported} older ${r.imported === 1 ? 'email' : 'emails'}`)
      else if (r.scanned && r.hasMore) toast.toast(`Scanned ${r.scanned} older messages, none were conversations. Click again to go further back.`, 'info')
      else toast.toast('Reached the end of your Gmail history', 'info')
      if (r.imported) { await threads.reload(); setHasMore(true) }
    } catch (e) { toast.error(errorMessage(e)) } finally { setLoadingOlder(false) }
  }
  async function sync() { setSyncing(true); try { const r = await emailsApi.sync(); toast.success(`Synced · ${r.imported} new`); await threads.reload() } catch (e) { toast.error(errorMessage(e)) } finally { setSyncing(false) } }
  /** Archive / unarchive; when the open thread leaves the list, jump to the next one (or the previous at the end). */
  async function archive(t: Thread) {
    const list = threads.data ?? []; const idx = list.findIndex((x) => x.id === t.id)
    const next = list[idx + 1] ?? list[idx - 1] ?? null
    try {
      const r = await emailsApi.archive(t.id, !t.archived)
      const verb = r.archived ? 'Archived' : 'Unarchived'
      if (r.gmailSynced) toast.success(`${verb} in CRM and Gmail`); else toast.toast(`${verb} in CRM · Gmail not updated`, 'info')
      threads.setData((d) => d?.filter((x) => x.id !== t.id) ?? d)
      if (t.id === threadId) nav(next ? `/inbox/${next.id}` : '/inbox')
      void threads.reload()
    } catch (e) { toast.error(errorMessage(e)) }
  }
  const t = thread.data?.thread ?? row
  const lastIn = thread.data?.messages.filter((m) => m.direction === 'in').at(-1)
  /** Reply all from the latest inbound message (or the latest message at all when nothing came in). */
  function openReplyAll(x: Thread) {
    const source = (threadId === x.id ? (lastIn ?? thread.data?.messages.at(-1)) : undefined)
    if (!source) { nav(`/inbox/${x.id}`); setCompose({ threadId: x.id, to: x.counterpart ? [x.counterpart.email] : [], subject: x.subject ?? '', replyAll: true }); return }
    const r = replyAllRecipients(source, user?.gmail?.email)
    setCompose({ threadId: x.id, to: r.to, cc: r.cc, subject: x.subject ?? '', replyAll: true })
  }
  /** Accept a domain suggestion: link the thread (and its sender as a lead) to the suggested company. */
  async function acceptSuggestion(x: Thread) {
    if (!x.suggestedCompany) return
    try { await emailsApi.linkCompany(x.id, { companyId: x.suggestedCompany.id }); toast.success(`Linked to ${x.suggestedCompany.name}`); void thread.reload(); void threads.reload() } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <AppShell title="Inbox" actions={<>
      {user?.gmail ? <Badge cmp="inbox.account_badge" tone={user.gmail.status === 'error' ? 'danger' : 'success'}>{user.gmail.email}{user.gmail.lastSyncAt ? ` · synced ${timeAgo(user.gmail.lastSyncAt)}` : ''}</Badge> : <Link data-cmp="inbox.connect_link" to="/settings"><Badge cmp="inbox.connect_badge" tone="warning">Connect Gmail</Badge></Link>}
      <Button cmp="inbox.sync_button" size="sm" variant="ghost" disabled={syncing || !user?.gmail} icon={syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} onClick={() => void sync()}>Sync</Button>
      <Button cmp="inbox.compose_button" size="sm" variant="primary" icon={<Pencil size={13} />} onClick={() => setCompose({})}>Compose</Button>
    </>}>
      <div data-cmp="inbox.root_div" className="h-full flex animate-fade-in">
        {!listPanel.collapsed && <aside data-cmp="inbox.list_aside" style={listPanel.style} className="shrink-0 border-r border-border flex flex-col min-h-0 bg-surface/60">
          <div data-cmp="inbox.list_header" className="p-3 flex flex-col gap-2 border-b border-border">
            <label data-cmp="inbox.search" className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-border bg-surface-2 text-sm text-fg-subtle focus-within:border-ring"><Search size={13} /><input data-cmp="inbox.search_input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mail" className="flex-1 bg-transparent outline-none text-fg" /></label>
            <div data-cmp="inbox.tabs_scroll" className="overflow-x-auto [scrollbar-width:none]"><Tabs cmp="inbox.tabs" active={filter} onChange={setFilter} tabs={[{ id: 'inbox', label: 'Inbox' }, { id: 'threads', label: 'Threads' }, { id: 'sent', label: 'Sent' }, { id: 'unread', label: 'Unread' }, { id: 'unlinked', label: 'Unlinked' }, { id: 'archived', label: 'Archived' }, { id: 'all', label: 'All' }]} /></div>
          </div>
          <ul data-cmp="inbox.thread_list" className="flex-1 overflow-auto divide-y divide-border">
            {(threads.data ?? []).map((x) => {
              // The sender of the newest message, not whoever started the thread; for mail we sent, who it went to.
              const sentByMe = !!x.lastSender?.isMe
              const recipients = x.lastRecipients ?? []
              const who = x.lastSender ? (sentByMe ? (recipients.length ? `To: ${recipients.join(', ')}` : 'You') : x.lastSender.name) : (x.leadName ?? x.counterpart?.name ?? x.counterpart?.email ?? 'Unknown')
              return (
                <li key={x.id} data-cmp={`inbox.thread_item_${x.id}`} onClick={() => openThread(x)} onMouseEnter={() => hoverStart(x)} onMouseLeave={hoverEnd} onContextMenu={(e) => ctx.open(e, x)} className={cn('group p-3 flex gap-3 cursor-pointer transition-colors', x.id === threadId ? 'bg-primary/10' : 'hover:bg-surface-2')}>
                  <Avatar cmp={`inbox.thread_avatar_${x.id}`} name={sentByMe ? recipients[0] ?? 'Me' : who} size="sm" />
                  <div data-cmp={`inbox.thread_meta_${x.id}`} className="flex-1 min-w-0">
                    <div data-cmp={`inbox.thread_top_${x.id}`} className="flex items-center justify-between gap-2"><span dir="auto" data-cmp={`inbox.thread_name_${x.id}`} className={cn('text-sm truncate', x.unread && 'font-semibold')}>{who}</span><span data-cmp={`inbox.thread_time_${x.id}`} className="text-[11px] text-fg-subtle shrink-0 inline-flex items-center gap-1">{x.hasAttachments && <Paperclip size={10} aria-label="Has attachments" />}{shortDate(rowTime(x))}</span></div>
                    <p dir="auto" data-cmp={`inbox.thread_subject_${x.id}`} className={cn('text-xs truncate', x.unread ? 'text-fg' : 'text-fg-muted')}>{x.subject}</p>
                    <p dir="auto" data-cmp={`inbox.thread_snippet_${x.id}`} className="text-xs text-fg-subtle truncate">{x.snippet}</p>
                    <div data-cmp={`inbox.thread_badges_${x.id}`} className="mt-1 flex gap-1.5 flex-wrap">
                      {x.hasDraft && <Badge cmp={`inbox.thread_draft_${x.id}`} tone="accent"><Sparkles size={10} /> Draft</Badge>}
                      {x.lastOutStatus && (sentByMe || x.lastOutStatus !== 'sent') && statusMeta[x.lastOutStatus] && <Badge cmp={`inbox.thread_outstatus_${x.id}`} tone={statusMeta[x.lastOutStatus].tone}>{statusMeta[x.lastOutStatus].icon} {statusMeta[x.lastOutStatus].label}</Badge>}
                      {!x.companyId && x.suggestedCompany && <button type="button" data-cmp={`inbox.thread_suggest_${x.id}`} title={`Looks like ${x.suggestedCompany.name} (${x.suggestedCompany.domain ?? 'domain match'}). Click to link.`} onClick={(e) => { e.stopPropagation(); void acceptSuggestion(x) }} className="inline-flex items-center gap-1 h-5 rounded-md border border-dashed border-primary/50 bg-primary/5 px-1.5 text-[10px] text-primary hover:bg-primary/15"><Building2 size={10} /> <span dir="auto" className="max-w-28 truncate">{x.suggestedCompany.name}</span>?</button>}
                      {x.supplier && <Badge cmp={`inbox.thread_supplier_${x.id}`} tone="warning"><Truck size={10} /> Supplier</Badge>}
                      {!x.leadId ? <span data-cmp={`inbox.thread_unlinked_${x.id}`} title="Not linked to a lead or company" aria-label="Unlinked" className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-warning/15 text-warning"><Link2 size={11} /></span> : x.companyName && <Badge cmp={`inbox.thread_company_${x.id}`}>{x.companyName}</Badge>}
                    </div>
                  </div>
                  <div data-cmp={`inbox.thread_side_${x.id}`} className="flex flex-col items-center gap-1.5 shrink-0 w-6">
                    {x.unread ? <span data-cmp={`inbox.thread_unread_${x.id}`} className="mt-1.5 h-2 w-2 rounded-full bg-brand-gradient" /> : <span data-cmp={`inbox.thread_unread_spacer_${x.id}`} className="mt-1.5 h-2 w-2" />}
                    <button type="button" data-cmp={`inbox.thread_archive_${x.id}`} title={x.archived ? 'Unarchive' : 'Archive'} aria-label={x.archived ? 'Unarchive' : 'Archive'} onClick={(e) => { e.stopPropagation(); void archive(x) }} className="h-6 w-6 grid place-items-center rounded-md text-fg-subtle opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-surface-3 hover:text-fg transition-opacity">{x.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}</button>
                  </div>
                </li>
              )
            })}
            {threads.data && !threads.data.length && <li data-cmp="inbox.thread_empty" className="p-8 text-center text-sm text-fg-muted flex flex-col items-center gap-2"><Inbox size={18} className="text-fg-subtle" />{user?.gmail ? 'No threads here.' : 'Connect Gmail in Settings to pull your mail.'}</li>}
            {threads.loading && <ThreadListSkeleton />}
            {threads.error && <li data-cmp="inbox.thread_error" className="p-8 text-center text-sm text-danger">{threads.error}</li>}
            {threads.data && threads.data.length > 0 && <li ref={sentinelRef} data-cmp="inbox.thread_sentinel" className="p-3 text-center text-xs text-fg-subtle">{loadingMore ? <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading more…</span> : hasMore ? ' ' : 'End of list'}</li>}
            {threads.data && !hasMore && !q && filter === 'inbox' && user?.gmail && (
              <li data-cmp="inbox.load_older" className="p-3 flex flex-col items-center gap-1">
                <Button cmp="inbox.load_older_button" size="sm" variant="ghost" disabled={loadingOlder || gmailExhausted} icon={loadingOlder ? <Loader2 size={13} className="animate-spin" /> : <History size={13} />} onClick={() => void loadOlder()}>{gmailExhausted ? 'All Gmail history imported' : 'Load older from Gmail'}</Button>
                {!gmailExhausted && <span data-cmp="inbox.load_older_hint" className="text-[11px] text-fg-subtle">Imports the next 50 messages before the oldest one here.</span>}
              </li>
            )}
          </ul>
        </aside>}
        <ResizeHandle cmp="inbox.list_handle" panelSide="left" label="thread list" collapsed={listPanel.collapsed} dragging={listPanel.dragging} onToggle={listPanel.toggle} onDrag={listPanel.startDrag} onReset={listPanel.reset} onNudge={listPanel.nudge} />
        {!threadId ? (
          <section data-cmp="inbox.placeholder" className="flex-1 grid place-items-center text-sm text-fg-muted"><div data-cmp="inbox.placeholder_inner" className="flex flex-col items-center gap-2"><span data-cmp="inbox.placeholder_icon" className="h-12 w-12 rounded-2xl bg-brand-gradient text-white grid place-items-center glow"><Sparkles size={20} /></span><p data-cmp="inbox.placeholder_text">Pick a thread. Ask for an AI reply draft from the panel on the right.</p></div></section>
        ) : !t && thread.error ? <section data-cmp="inbox.error" className="flex-1 grid place-items-center text-sm text-danger">{thread.error}</section> : !t ? <ReadingPaneSkeleton /> : (
          <>
            <section data-cmp="inbox.reading_section" className="flex-1 flex flex-col min-h-0 min-w-0">
              <header data-cmp="inbox.reading_header" className="h-12 px-4 flex items-center gap-2 border-b border-border bg-surface/60">
                <h2 dir="auto" data-cmp="inbox.reading_subject" className="font-semibold truncate flex-1">{t.subject}</h2>
                {t.leadId && <Link data-cmp="inbox.reading_lead_link" to={`/leads/${t.leadId}`}><Button cmp="inbox.reading_lead_button" size="sm" variant="ghost" icon={<Link2 size={12} />}>{t.leadName}</Button></Link>}
                {t.companyId ? <Link data-cmp="inbox.reading_company_link" to={`/companies/${t.companyId}`}><Button cmp="inbox.reading_company_button" size="sm" variant="ghost" icon={<Building2 size={12} />}>{t.companyName}</Button></Link> : t.suggestedCompany ? <Button cmp="inbox.reading_suggest_button" size="sm" variant="primary" icon={<Building2 size={12} />} title={`Email domain matches ${t.suggestedCompany.domain ?? t.suggestedCompany.name}`} onClick={() => void acceptSuggestion(t)}>Link to {t.suggestedCompany.name}</Button> : <Button cmp="inbox.reading_link_button" size="sm" variant="ghost" icon={<Building2 size={12} />} onClick={() => setLinking(true)}>Link to company</Button>}
                {t.supplier ? <Badge cmp="inbox.reading_supplier_badge" tone="warning"><Truck size={10} /> Supplier</Badge> : <Button cmp="inbox.reading_supplier_button" size="icon" variant="ghost" aria-label="Set as supplier" title="Set as supplier" disabled={!t.counterpart && !t.leadId} onClick={() => void setSupplier(t)}><Truck size={14} /></Button>}
                <Button cmp="inbox.reading_task_button" size="sm" variant="ghost" icon={<CheckSquare size={12} />} onClick={() => setTaskFor(t)}>Task{openTasks.data?.open ? <span data-cmp="inbox.reading_task_count" className="ml-1 rounded-full bg-primary/15 text-primary px-1.5 text-[10px] font-semibold">{openTasks.data.open}</span> : null}</Button>
                <Button cmp="inbox.reading_archive_button" size="icon" variant="ghost" aria-label={t.archived ? 'Unarchive' : 'Archive'} onClick={() => void archive(t)}>{t.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}</Button>
              </header>
              {thread.error && !thread.data ? <div data-cmp="inbox.messages_error" className="flex-1 grid place-items-center text-sm text-danger">{thread.error}</div> : !thread.data ? <MessagesSkeleton /> : <div data-cmp="inbox.messages" className="flex-1 overflow-auto p-4 flex flex-col gap-4">
                {[...thread.data.messages].reverse().map((m, i) => <MessageCard key={m.id} m={m} defaultOpen={i === 0} />)}
              </div>}
              <footer data-cmp="inbox.reply_footer" className="p-3 border-t border-border bg-surface/60 flex gap-2">
                <Button cmp="inbox.reply_button" icon={<Reply size={13} />} onClick={() => setCompose({ threadId: t.id, to: lastIn ? [lastIn.from] : t.counterpart ? [t.counterpart.email] : [], subject: t.subject ?? '' })}>Reply</Button>
                <Button cmp="inbox.reply_all_button" variant="ghost" icon={<ReplyAll size={13} />} title="Reply to the sender and every other recipient" onClick={() => openReplyAll(t)}>Reply all</Button>
                <Button cmp="inbox.reply_meeting_button" variant="ghost" icon={<Calendar size={13} />} onClick={() => setMeeting(true)}>Book meeting</Button>
              </footer>
            </section>
            <ResizeHandle cmp="inbox.side_handle" panelSide="right" label="context panel" collapsed={sidePanel.collapsed} dragging={sidePanel.dragging} onToggle={sidePanel.toggle} onDrag={sidePanel.startDrag} onReset={sidePanel.reset} onNudge={sidePanel.nudge} />
            {!sidePanel.collapsed && <aside data-cmp="inbox.right_aside" style={sidePanel.style} className="shrink-0 border-l border-border bg-surface flex flex-col min-h-0">
              {!t.companyId && t.suggestedCompany && <CompanySuggestionCard cmp="inbox.side_suggestion" suggestion={t.suggestedCompany} subject="this thread" onAccept={() => acceptSuggestion(t)} onChooseOther={() => setLinking(true)} />}
              <ThreadContextCard leadId={t.leadId} companyId={t.companyId} />
              <DraftPanel draft={proposed} loading={drafts.loading} threadId={t.id} onChanged={() => { void drafts.reload(); void thread.reload(); void threads.reload() }} />
            </aside>}
          </>
        )}
      </div>
      {compose && <ComposeModal threadId={compose.threadId} to={compose.to} cc={compose.cc} replyAll={compose.replyAll} subject={compose.subject} onClose={() => setCompose(null)} onSent={() => { setCompose(null); void threads.reload(); void thread.reload() }} />}
      {meeting && t && <MeetingModal leadId={t.leadId} leadName={t.leadName ?? undefined} onClose={() => setMeeting(false)} onBooked={() => setMeeting(false)} />}
      {taskFor && <TaskModal threadId={taskFor.id} threadSubject={taskFor.subject} leadId={taskFor.leadId} leadName={taskFor.leadName} companyId={taskFor.companyId} companyName={taskFor.companyName} onClose={() => setTaskFor(null)} onSaved={() => { setTaskFor(null); void openTasks.reload() }} />}
      {linking && t && <LinkCompanyModal thread={t} onClose={() => setLinking(false)} onLinked={() => { setLinking(false); void thread.reload(); void threads.reload() }} />}
      {supplierFor && <LinkCompanyModal thread={supplierFor} supplier onClose={() => setSupplierFor(null)} onLinked={() => { const sid = supplierFor.id; setSupplierFor(null); threadCache.markStale(sid); if (sid === threadId) void thread.reload(); void threads.reload() }} />}
      {ctx.menu && (() => { const x = ctx.menu.target; return (
        <ContextMenu cmp="inbox.context" x={ctx.menu.x} y={ctx.menu.y} onClose={ctx.close} items={[
          { id: 'open', label: 'Open', icon: <ExternalLink size={13} />, onSelect: () => nav(`/inbox/${x.id}`) },
          { id: 'reply', label: 'Reply', icon: <Reply size={13} />, onSelect: () => setCompose({ threadId: x.id, to: x.counterpart ? [x.counterpart.email] : [], subject: x.subject ?? '' }) },
          { id: 'replyAll', label: 'Reply all', icon: <ReplyAll size={13} />, onSelect: () => openReplyAll(x) },
          'separator',
          { id: 'archive', label: x.archived ? 'Unarchive' : 'Archive', icon: x.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />, onSelect: () => void archive(x) },
          ...(x.leadId ? [] : [{ id: 'convert', label: 'Create lead from sender', icon: <UserPlus size={13} />, disabled: !x.counterpart, onSelect: () => void convertThread(x) }]),
          { id: 'task', label: 'Create task…', icon: <CheckSquare size={13} />, onSelect: () => setTaskFor(x) },
          { id: 'sign', label: 'Send for signature…', icon: <FileSignature size={13} />, onSelect: () => nav(`/documents?${new URLSearchParams({ new: '1', threadId: x.id, ...(x.companyId ? { companyId: x.companyId, companyName: x.companyName ?? '' } : {}) }).toString()}`) },
          ...(!x.companyId && x.suggestedCompany ? [{ id: 'suggest', label: `Link to ${x.suggestedCompany.name}`, icon: <Building2 size={13} />, onSelect: () => void acceptSuggestion(x) }] : []),
          { id: 'link', label: x.companyId ? 'Move to another company…' : 'Link to company…', icon: <Building2 size={13} />, onSelect: () => { nav(`/inbox/${x.id}`); setLinking(true) } },
          ...(x.supplier ? [] : [{ id: 'supplier', label: 'Set as supplier', icon: <Truck size={13} />, disabled: !x.counterpart && !x.leadId, onSelect: () => void setSupplier(x) }]),
          'separator',
          { id: 'delete', label: 'Delete from CRM', icon: <Trash2 size={13} />, danger: true, onSelect: () => void removeThread(x) },
        ]} />
      ) })()}
    </AppShell>
  )
}

/** MessageCard — one email in the conversation. Older messages start collapsed and fetch their HTML on expand (plain text shows first); quoted reply/forward trails are folded. */
function MessageCard({ m, defaultOpen }: { m: Message; defaultOpen: boolean }) {
  const meta = statusMeta[m.status]
  const [open, setOpen] = useState(defaultOpen)
  const [showQuoted, setShowQuoted] = useState(false)
  useEffect(() => { setOpen(defaultOpen); setShowQuoted(false) }, [m.id, defaultOpen])
  const { own, quoted } = splitQuoted(m.bodyText || '')
  // Text first: an older message's HTML loads only once it is expanded; its plain text shows meanwhile.
  const lazy = useCachedResource(messageHtmlCache, open && m.hasHtml && !m.bodyHtml ? m.id : null, () => emailsApi.messageHtml(m.id), MESSAGE_HTML_MAX_AGE_MS)
  const html = m.bodyHtml || lazy.data?.bodyHtml || ''
  const htmlPending = open && m.hasHtml && !html && !lazy.error
  const who = m.direction === 'in' ? nameOnly(m.from) : 'You'
  return (
    <article data-cmp={`inbox.message_${m.id}`} className={cn('card max-w-3xl transition-colors', m.direction === 'out' && 'self-end bg-surface-2', open ? 'p-4' : 'px-4 py-2.5 cursor-pointer hover:bg-surface-2')} onClick={open ? undefined : () => setOpen(true)}>
      <div data-cmp={`inbox.message_head_${m.id}`} className={cn('flex items-center gap-2 text-xs text-fg-muted flex-wrap', open && 'mb-2')}>
        <button type="button" data-cmp={`inbox.message_toggle_${m.id}`} aria-label={open ? 'Collapse message' : 'Expand message'} aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }} className="text-fg-subtle hover:text-fg">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
        <Avatar cmp={`inbox.message_avatar_${m.id}`} name={m.direction === 'in' ? nameOnly(m.from) : 'Me'} size="xs" />
        <span dir="auto" data-cmp={`inbox.message_from_${m.id}`} className="font-medium text-fg">{who}</span>
        {open ? <span data-cmp={`inbox.message_to_${m.id}`} className="font-mono truncate">→ {m.to.map(nameOnly).join(', ')}</span> : <span dir="auto" data-cmp={`inbox.message_preview_${m.id}`} className="truncate flex-1 min-w-0 text-fg-subtle">{own.replace(/\s+/g, ' ').slice(0, 140) || '(empty)'}</span>}
        {m.attachments?.some((a) => !a.inline) && <span data-cmp={`inbox.message_clip_${m.id}`} title="Has attachments" className="text-fg-subtle shrink-0"><Paperclip size={11} /></span>}
        <span data-cmp={`inbox.message_time_${m.id}`} className={cn('shrink-0', open && 'ml-auto')}>{open ? fullDate(m.sentAt) : shortDate(m.sentAt)}</span>
        {m.direction === 'out' && meta && <Badge cmp={`inbox.message_status_${m.id}`} tone={meta.tone}>{meta.icon} {meta.label}</Badge>}
      </div>
      {open && (
        <>
          {html ? <HtmlBody cmp={`inbox.message_html_${m.id}`} html={html} /> : htmlPending && !own.trim() ? <MessageBodySkeleton cmp={`inbox.message_body_skeleton_${m.id}`} /> : <pre dir="auto" data-cmp={`inbox.message_body_${m.id}`} className={cn('whitespace-pre-wrap font-sans text-sm leading-relaxed', htmlPending && 'opacity-80')}>{own || '(empty)'}</pre>}
          {htmlPending && !!own.trim() && <Skeleton cmp={`inbox.message_format_shimmer_${m.id}`} className="mt-2 h-1 w-24 rounded-full" />}
          {!html && quoted && (
            <div data-cmp={`inbox.message_quoted_${m.id}`} className="mt-2">
              <button type="button" data-cmp={`inbox.message_quoted_toggle_${m.id}`} aria-expanded={showQuoted} onClick={() => setShowQuoted((v) => !v)} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-3 px-2 py-0.5 text-[11px] text-fg-muted hover:text-fg" title={showQuoted ? 'Hide quoted text' : 'Show quoted text'}>{showQuoted ? <ChevronDown size={11} /> : <ChevronRight size={11} />} {showQuoted ? 'Hide quoted text' : `Show quoted text (${quoted.split('\n').length} lines)`}</button>
              {showQuoted && <pre dir="auto" data-cmp={`inbox.message_quoted_body_${m.id}`} className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-fg-muted border-l-2 border-border pl-3">{quoted}</pre>}
            </div>
          )}
          <AttachmentStrip cmp={`inbox.message_attachments_${m.id}`} attachments={m.attachments ?? []} />
          {!!m.events?.length && <div data-cmp={`inbox.message_events_${m.id}`} className="mt-3 flex flex-wrap gap-2 text-[11px] text-fg-subtle">{m.events.slice(0, 5).map((e, i) => <span key={i} data-cmp={`inbox.message_event_${m.id}_${i}`} className="inline-flex items-center gap-1">{e.type === 'open' ? <Eye size={10} /> : e.type === 'click' ? <MousePointerClick size={10} /> : <AlertTriangle size={10} />} {e.type} {timeAgo(e.createdAt)}</span>)}</div>}
        </>
      )}
    </article>
  )
}

/**
 * LinkCompanyModal — attach a thread to a company: the sender becomes a lead of that company (created if needed).
 * The company is chosen with an auto-complete; a name that matches no company creates one (a single request, so
 * exactly one company is created, carrying the sender's email domain). For an unlinked thread the name is
 * pre-filled from the sender's domain. With `supplier` the company is marked as a supplier.
 */
function LinkCompanyModal({ thread, supplier = false, onClose, onLinked }: { thread: Thread; supplier?: boolean; onClose: () => void; onLinked: () => void }) {
  const toast = useToast()
  const [companies, setCompanies] = useState<Company[]>([])
  const senderEmail = thread.counterpart?.email
  const [pick, setPick] = useState<CompanyPick>({ id: null, name: thread.companyId ? '' : suggestCompanyName(senderEmail) })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    // Once the list is in, a pre-filled name that already exists resolves to that company instead of a new one.
    companiesApi.list().then((list) => { setCompanies(list); setPick((v) => (v.id ? v : { ...v, id: list.find((c) => c.name.trim().toLowerCase() === v.name.trim().toLowerCase())?.id ?? null })) }).catch(() => undefined)
  }, [])
  const name = pick.name.trim()
  const domain = companyDomainOf(senderEmail)
  async function link() {
    setBusy(true)
    try {
      const target = pick.id ? { companyId: pick.id } : { companyName: name }
      if (supplier) { await emailsApi.setSupplier(thread.id, target); toast.success('Sender set as supplier') }
      else { await emailsApi.linkCompany(thread.id, target); toast.success(pick.id ? 'Linked to company' : `Company "${name}" created and linked`) }
      onLinked()
    } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  const canSave = !!pick.id || name.length > 0
  return (
    <Modal cmp="linkcompany.modal" title={supplier ? 'Set sender as a supplier' : 'Link thread to a company'} onClose={onClose} footer={<><Button cmp="linkcompany.cancel_button" onClick={onClose}>Cancel</Button><Button cmp="linkcompany.save_button" variant="primary" disabled={!canSave || busy} onClick={() => void link()}>{busy ? 'Saving…' : supplier ? 'Set as supplier' : pick.id || !name ? 'Link' : 'Create and link'}</Button></>}>
      <p data-cmp="linkcompany.hint" className="text-sm text-fg-muted">Sender <span dir="auto" className="font-mono">{senderEmail ?? '—'}</span>{thread.leadName ? <> (lead <span dir="auto" className="font-medium text-fg">{thread.leadName}</span>)</> : null} will be attached to the chosen company{supplier ? ', which is marked as a supplier (a deal it already has is kept)' : ''}.</p>
      <CompanyPicker cmp="linkcompany.company_picker" label={supplier ? 'Supplier company' : 'Company'} companies={companies} value={pick} onChange={setPick} autoFocus />
      {name && <p data-cmp="linkcompany.status_text" className="text-xs text-fg-subtle">{pick.id ? 'Existing company.' : <>New company <span dir="auto" className="font-medium text-fg">{name}</span> will be created{domain ? <> with the domain <span className="font-mono">{domain}</span></> : null}.</>}</p>}
    </Modal>
  )
}
