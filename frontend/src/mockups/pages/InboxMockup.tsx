import { Archive, Reply, Sparkles, Send, Pencil, X, Link2, Eye, MousePointerClick, AlertTriangle, RefreshCw, Paperclip, Calendar, Search, Download, FileText, FileSpreadsheet, Image as ImageIcon } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { ResizeHandle } from '../../components/common/ResizeHandle'
import { AppShell } from '../AppShell'
import { Avatar, Badge, Button, Tabs, cn } from '../../components/ui'
import { byId, draftReply, threads } from '../data'

const statusMeta = {
  sent: { label: 'Sent', icon: <Send size={10} />, tone: 'neutral' as const },
  delivered: { label: 'Delivered', icon: <Send size={10} />, tone: 'info' as const },
  opened: { label: 'Opened', icon: <Eye size={10} />, tone: 'success' as const },
  clicked: { label: 'Clicked', icon: <MousePointerClick size={10} />, tone: 'accent' as const },
  bounced: { label: 'Bounced', icon: <AlertTriangle size={10} />, tone: 'danger' as const },
}

/** InboxMockup — three-pane inbox with AI suggested reply. */
export default function InboxMockup() {
  const active = threads[0]
  const lead = byId.lead(active.leadId!)
  return (
    <MockupFrame name="inbox" title="Inbox">
      <AppShell active="inbox" title="Inbox" actions={<><Badge cmp="inbox.account_badge" tone="success">alex@acme-demo.example · synced 1m ago</Badge><Button cmp="inbox.sync_button" size="sm" variant="ghost" icon={<RefreshCw size={13} />}>Sync</Button><Button cmp="inbox.compose_button" size="sm" variant="primary" icon={<Pencil size={13} />}>Compose</Button></>}>
        <div data-cmp="inbox.root_div" className="h-full flex">
          <aside data-cmp="inbox.list_aside" className="w-[320px] shrink-0 border-r border-border flex flex-col min-h-0 bg-surface">
            <div data-cmp="inbox.list_header" className="p-3 flex flex-col gap-2 border-b border-border">
              <div data-cmp="inbox.search" className="flex items-center gap-2 h-8 px-2.5 rounded-[var(--radius)] border border-border bg-surface-2 text-sm text-fg-subtle"><Search size={13} /> Search mail</div>
              <Tabs cmp="inbox.tabs" active="all" tabs={[{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread', count: 2 }, { id: 'drafts', label: 'AI drafts', count: 2 }, { id: 'unlinked', label: 'Unlinked', count: 1 }]} />
            </div>
            <ul data-cmp="inbox.thread_list" className="flex-1 overflow-auto divide-y divide-border">
              {threads.map((t) => {
                const l = t.leadId ? byId.lead(t.leadId) : undefined
                const isActive = t.id === active.id
                return (
                  <li key={t.id} data-cmp={`inbox.thread_item_${t.id}`} className={cn('p-3 flex gap-3 cursor-pointer', isActive ? 'bg-primary/10' : 'hover:bg-surface-2')}>
                    <Avatar cmp={`inbox.thread_avatar_${t.id}`} name={l?.name ?? 'Mailer Daemon'} size="sm" />
                    <div data-cmp={`inbox.thread_meta_${t.id}`} className="flex-1 min-w-0">
                      <div data-cmp={`inbox.thread_top_${t.id}`} className="flex items-center justify-between gap-2"><span data-cmp={`inbox.thread_name_${t.id}`} className={cn('text-sm truncate', t.unread && 'font-semibold')}>{l?.name ?? 'Mail Delivery Subsystem'}</span><span data-cmp={`inbox.thread_time_${t.id}`} className="text-[11px] text-fg-subtle shrink-0">{t.lastAt}</span></div>
                      <p data-cmp={`inbox.thread_subject_${t.id}`} className="text-xs truncate">{t.subject}</p>
                      <p data-cmp={`inbox.thread_snippet_${t.id}`} className="text-xs text-fg-muted truncate">{t.snippet}</p>
                      <div data-cmp={`inbox.thread_badges_${t.id}`} className="mt-1 flex gap-1.5">
                        {t.hasDraft && <Badge cmp={`inbox.thread_draft_${t.id}`} tone="accent"><Sparkles size={10} /> Draft</Badge>}
                        {!l && <Badge cmp={`inbox.thread_unlinked_${t.id}`} tone="warning"><Link2 size={10} /> Unlinked</Badge>}
                        {l && <Badge cmp={`inbox.thread_company_${t.id}`}>{byId.company(l.companyId).name}</Badge>}
                      </div>
                    </div>
                    {t.unread && <span data-cmp={`inbox.thread_unread_${t.id}`} className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                  </li>
                )
              })}
            </ul>
          </aside>
          <ResizeHandle cmp="inbox.list_handle" panelSide="left" label="thread list" collapsed={false} onToggle={() => undefined} />
          <section data-cmp="inbox.reading_section" className="flex-1 flex flex-col min-h-0 min-w-0">
            <header data-cmp="inbox.reading_header" className="h-12 px-4 flex items-center gap-2 border-b border-border bg-surface">
              <h2 data-cmp="inbox.reading_subject" className="font-semibold truncate flex-1">{active.subject}</h2>
              <Button cmp="inbox.reading_link_button" size="sm" variant="ghost" icon={<Link2 size={12} />}>{lead.name}</Button>
              <Button cmp="inbox.reading_archive_button" size="icon" variant="ghost" aria-label="Archive"><Archive size={14} /></Button>
            </header>
            <div data-cmp="inbox.messages" className="flex-1 overflow-auto p-4 flex flex-col gap-4">
              {active.messages.map((m) => (
                <article key={m.id} data-cmp={`inbox.message_${m.id}`} className={cn('card p-4 max-w-3xl', m.direction === 'out' && 'self-end bg-surface-2')}>
                  <div data-cmp={`inbox.message_head_${m.id}`} className="flex items-center gap-2 text-xs text-fg-muted mb-2">
                    <Avatar cmp={`inbox.message_avatar_${m.id}`} name={m.direction === 'in' ? lead.name : 'Alex Morgan'} size="xs" />
                    <span data-cmp={`inbox.message_from_${m.id}`} className="font-medium text-fg">{m.direction === 'in' ? lead.name : 'You'}</span>
                    <span data-cmp={`inbox.message_addr_${m.id}`} className="font-mono">&lt;{m.from}&gt;</span>
                    <span data-cmp={`inbox.message_time_${m.id}`} className="ml-auto">{m.at}</span>
                    {m.status && <Badge cmp={`inbox.message_status_${m.id}`} tone={statusMeta[m.status].tone}>{statusMeta[m.status].icon} {statusMeta[m.status].label}</Badge>}
                  </div>
                  <pre data-cmp={`inbox.message_body_${m.id}`} className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{m.body}</pre>
                  {m.inlineImage && (
                    <div data-cmp={`inbox.message_html_${m.id}`} className="email-html mt-2">
                      <button type="button" data-cmp={`inbox.message_remote_${m.id}`} className="mb-2 inline-flex items-center gap-1 rounded-md border border-border bg-surface-3 px-2 py-0.5 text-[11px] text-fg-muted hover:text-fg"><ImageIcon size={11} /> Load remote images</button>
                      <div data-cmp={`inbox.message_inline_image_${m.id}`} className="h-40 w-72 rounded-md border border-border bg-brand-gradient/20 grid place-items-center text-xs text-fg-muted">inline image (cid:floorplan@northwind) — 720×400</div>
                    </div>
                  )}
                  {m.attachments && (
                    <div data-cmp={`inbox.message_attachments_${m.id}`} className="mt-3 flex flex-col gap-2">
                      <div data-cmp={`inbox.message_attachments_head_${m.id}`} className="flex items-center gap-1 text-[11px] text-fg-subtle"><Paperclip size={11} /> {m.attachments.length} attachments</div>
                      <div data-cmp={`inbox.message_attachments_gallery_${m.id}`} className="flex flex-wrap gap-2">
                        {m.attachments.filter((a) => a.image).map((a) => (
                          <button key={a.id} type="button" data-cmp={`inbox.message_attachments_image_${a.id}`} title={`${a.filename} · ${a.size}`} className="group relative h-28 w-36 overflow-hidden rounded-lg border border-border bg-surface-2">
                            <span data-cmp={`inbox.message_attachments_thumb_${a.id}`} className="h-full w-full grid place-items-center bg-gradient-to-br from-surface-2 to-surface-3 text-fg-subtle"><ImageIcon size={22} /></span>
                            <span data-cmp={`inbox.message_attachments_image_name_${a.id}`} className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-left text-[11px] text-white">{a.filename}</span>
                          </button>
                        ))}
                      </div>
                      <div data-cmp={`inbox.message_attachments_files_${m.id}`} className="flex flex-wrap gap-2">
                        {m.attachments.filter((a) => !a.image).map((a) => (
                          <span key={a.id} data-cmp={`inbox.message_attachments_file_${a.id}`} className="inline-flex max-w-xs items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs hover:bg-surface-3 cursor-pointer">
                            <span data-cmp={`inbox.message_attachments_file_icon_${a.id}`} className="text-fg-muted">{a.mime.includes('sheet') ? <FileSpreadsheet size={14} /> : <FileText size={14} />}</span>
                            <span data-cmp={`inbox.message_attachments_file_name_${a.id}`} className="truncate">{a.filename}</span>
                            <span data-cmp={`inbox.message_attachments_file_size_${a.id}`} className="font-mono text-[10px] text-fg-subtle">{a.size}</span>
                            <Download size={12} className="text-fg-subtle" />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {m.direction === 'out' && <div data-cmp={`inbox.message_attach_${m.id}`} className="mt-3 inline-flex items-center gap-1.5 text-xs text-fg-muted border border-border rounded px-2 py-1"><Paperclip size={11} /> Northwind-pilot-proposal.pdf</div>}
                </article>
              ))}
            </div>
            <footer data-cmp="inbox.reply_footer" className="p-3 border-t border-border bg-surface flex gap-2">
              <Button cmp="inbox.reply_button" icon={<Reply size={13} />}>Reply</Button>
              <Button cmp="inbox.reply_ai_button" variant="accent" icon={<Sparkles size={13} />}>Use AI draft</Button>
              <Button cmp="inbox.reply_meeting_button" variant="ghost" icon={<Calendar size={13} />}>Propose times</Button>
            </footer>
          </section>
          <ResizeHandle cmp="inbox.side_handle" panelSide="right" label="context panel" collapsed={false} onToggle={() => undefined} />
          <aside data-cmp="inbox.draft_aside" className="w-[360px] shrink-0 border-l border-border bg-surface flex flex-col min-h-0">
            <header data-cmp="inbox.draft_header" className="h-12 px-4 flex items-center gap-2 border-b border-border">
              <Sparkles size={14} className="text-accent" /><span data-cmp="inbox.draft_title" className="font-semibold text-sm flex-1">Suggested reply</span>
              <Badge cmp="inbox.draft_confidence" tone="accent">{Math.round(draftReply.confidence * 100)}% confident</Badge>
            </header>
            <div data-cmp="inbox.draft_body" className="flex-1 overflow-auto p-4 flex flex-col gap-3">
              <pre data-cmp="inbox.draft_text" className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{draftReply.body}</pre>
              <div data-cmp="inbox.draft_citations" className="border-t border-border pt-3">
                <p data-cmp="inbox.draft_citations_title" className="text-xs font-medium text-fg-muted mb-2">Grounded on</p>
                <ul data-cmp="inbox.draft_citations_list" className="flex flex-col gap-2">
                  {draftReply.citations.map((c, i) => (
                    <li key={i} data-cmp={`inbox.draft_citation_${i}`} className="rounded-[var(--radius)] border border-border bg-surface-2 p-2 text-xs"><p data-cmp={`inbox.draft_citation_src_${i}`} className="font-medium font-mono truncate">{c.source}</p><p data-cmp={`inbox.draft_citation_snip_${i}`} className="text-fg-muted mt-0.5">{c.snippet}</p></li>
                  ))}
                </ul>
              </div>
              <div data-cmp="inbox.draft_slots" className="border-t border-border pt-3">
                <p data-cmp="inbox.draft_slots_title" className="text-xs font-medium text-fg-muted mb-2 inline-flex items-center gap-1"><Calendar size={11} /> Proposed slots (from your calendar)</p>
                <div data-cmp="inbox.draft_slots_list" className="flex gap-2 flex-wrap">{['Tue 14:00', 'Thu 10:00'].map((s) => <Badge key={s} cmp={`inbox.draft_slot_${s}`} tone="primary">{s} ET</Badge>)}</div>
              </div>
            </div>
            <footer data-cmp="inbox.draft_footer" className="p-3 border-t border-border grid grid-cols-3 gap-2">
              <Button cmp="inbox.draft_dismiss_button" size="sm" variant="ghost" icon={<X size={12} />}>Dismiss</Button>
              <Button cmp="inbox.draft_edit_button" size="sm" icon={<Pencil size={12} />}>Edit</Button>
              <Button cmp="inbox.draft_send_button" size="sm" variant="primary" icon={<Send size={12} />}>Send</Button>
            </footer>
          </aside>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
