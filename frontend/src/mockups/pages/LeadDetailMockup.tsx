import { ArrowLeft, Mail, Phone, Link as Linkedin, Sparkles, Calendar, Pencil, MoreHorizontal, MessageSquare, ArrowRightLeft, StickyNote } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Avatar, Badge, Button, Card, Select, Tabs, Textarea } from '../../components/ui'
import { byId, leads, statuses, threads } from '../data'

/** LeadDetailMockup — lead profile with enrichment, activity timeline and emails. */
export default function LeadDetailMockup() {
  const lead = leads[0]
  const company = byId.company(lead.companyId)
  const status = byId.status(lead.statusId)
  const myThreads = threads.filter((t) => t.leadId === lead.id)
  const timeline = [
    { id: 'a1', icon: <Mail size={12} />, text: 'Sarah replied: "Thanks Alex — the pricing looks reasonable…"', at: 'Today 10:42' },
    { id: 'a2', icon: <ArrowRightLeft size={12} />, text: 'Status changed Qualified → Proposal by Alex', at: 'Yesterday 16:10' },
    { id: 'a3', icon: <Mail size={12} />, text: 'Proposal sent · opened 2× · 1 link click', at: 'Yesterday 16:05' },
    { id: 'a4', icon: <Sparkles size={12} />, text: 'Lead enriched by AI (title, LinkedIn, company size)', at: 'Oct 12' },
    { id: 'a5', icon: <StickyNote size={12} />, text: 'Note: "Decision maker; budget approved for Q4."', at: 'Oct 10' },
  ]
  return (
    <MockupFrame name="lead-detail" title="Lead detail">
      <AppShell active="leads" title="Leads" actions={
        <>
          <Button cmp="lead.enrich_button" size="sm" variant="accent" icon={<Sparkles size={13} />}>Enrich</Button>
          <Button cmp="lead.email_button" size="sm" variant="primary" icon={<Mail size={13} />}>Email</Button>
          <Button cmp="lead.more_button" size="icon" variant="ghost"><MoreHorizontal size={16} /></Button>
        </>
      }>
        <div data-cmp="lead.root_div" className="p-5 flex flex-col gap-4">
          <a data-cmp="lead.back_link" className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"><ArrowLeft size={12} /> All leads</a>
          <header data-cmp="lead.header" className="card p-5 flex items-start gap-4">
            <Avatar cmp="lead.header_avatar" name={lead.name} size="lg" />
            <div data-cmp="lead.header_meta" className="flex-1 min-w-0">
              <div data-cmp="lead.header_row" className="flex items-center gap-3">
                <h2 data-cmp="lead.header_name" className="text-xl font-semibold">{lead.name}</h2>
                <Badge cmp="lead.header_status" color={status.color}>{status.name}</Badge>
                <Badge cmp="lead.header_score" tone="accent">Score {lead.score}</Badge>
                <Button cmp="lead.header_edit_button" size="sm" variant="ghost" icon={<Pencil size={12} />}>Edit</Button>
              </div>
              <p data-cmp="lead.header_title" className="text-fg-muted">{lead.title} at <a data-cmp="lead.header_company_link" className="text-primary hover:underline">{company.name}</a></p>
              <div data-cmp="lead.header_contacts" className="mt-2 flex items-center gap-4 text-sm text-fg-muted">
                <span data-cmp="lead.header_email" className="inline-flex items-center gap-1.5 font-mono text-xs"><Mail size={13} /> {lead.email}</span>
                <span data-cmp="lead.header_phone" className="inline-flex items-center gap-1.5 font-mono text-xs"><Phone size={13} /> +1 617 555 0142</span>
                <a data-cmp="lead.header_linkedin" className="inline-flex items-center gap-1.5 text-xs hover:text-fg"><Linkedin size={13} /> linkedin.com/in/sarahcohen</a>
              </div>
            </div>
            <div data-cmp="lead.header_side" className="flex flex-col gap-2 w-52">
              <Select cmp="lead.status_select" label="Status" defaultValue={lead.statusId} options={statuses.map((s) => ({ value: s.id, label: s.name }))} />
              <div data-cmp="lead.owner_row" className="flex items-center gap-2 text-xs text-fg-muted"><span>Owner</span><Avatar cmp="lead.owner_avatar" name={byId.user(lead.ownerId).name} size="xs" /><span data-cmp="lead.owner_name" className="text-fg">{byId.user(lead.ownerId).name}</span></div>
            </div>
          </header>
          <div data-cmp="lead.grid" className="grid xl:grid-cols-3 gap-4">
            <div data-cmp="lead.left_col" className="xl:col-span-2 flex flex-col gap-4">
              <Card cmp="lead.timeline_card" padded={false}>
                <Tabs cmp="lead.tabs" active="timeline" tabs={[{ id: 'timeline', label: 'Timeline' }, { id: 'emails', label: 'Emails', count: myThreads.length }, { id: 'meetings', label: 'Meetings', count: 1 }, { id: 'notes', label: 'Notes', count: 2 }]} />
                <div data-cmp="lead.compose_note" className="p-4 border-b border-border flex flex-col gap-2">
                  <Textarea cmp="lead.note_textarea" placeholder="Add a note… (@mention teammates)" className="min-h-16" />
                  <div data-cmp="lead.note_actions" className="flex justify-end gap-2"><Button cmp="lead.note_meeting_button" size="sm" variant="ghost" icon={<Calendar size={12} />}>Log meeting</Button><Button cmp="lead.note_save_button" size="sm" variant="primary">Add note</Button></div>
                </div>
                <ol data-cmp="lead.timeline_list" className="p-4 flex flex-col gap-4">
                  {timeline.map((t) => (
                    <li key={t.id} data-cmp={`lead.timeline_item_${t.id}`} className="flex gap-3 text-sm">
                      <span data-cmp={`lead.timeline_icon_${t.id}`} className="h-6 w-6 rounded-full bg-surface-3 text-fg-muted inline-flex items-center justify-center shrink-0">{t.icon}</span>
                      <div data-cmp={`lead.timeline_meta_${t.id}`} className="flex-1 min-w-0"><p data-cmp={`lead.timeline_text_${t.id}`}>{t.text}</p><p data-cmp={`lead.timeline_time_${t.id}`} className="text-xs text-fg-subtle">{t.at}</p></div>
                    </li>
                  ))}
                </ol>
              </Card>
              <Card cmp="lead.threads_card" title="Email threads" actions={<Button cmp="lead.threads_compose_button" size="sm" icon={<MessageSquare size={12} />}>New email</Button>} padded={false}>
                <ul data-cmp="lead.threads_list" className="divide-y divide-border">
                  {myThreads.map((t) => (
                    <li key={t.id} data-cmp={`lead.thread_item_${t.id}`} className="p-3 flex items-center gap-3 hover:bg-surface-2 cursor-pointer">
                      <div data-cmp={`lead.thread_meta_${t.id}`} className="flex-1 min-w-0"><div data-cmp={`lead.thread_subject_${t.id}`} className="text-sm font-medium truncate">{t.subject}</div><div data-cmp={`lead.thread_snippet_${t.id}`} className="text-xs text-fg-muted truncate">{t.snippet}</div></div>
                      {t.hasDraft && <Badge cmp={`lead.thread_draft_${t.id}`} tone="accent"><Sparkles size={10} /> Draft</Badge>}
                      <span data-cmp={`lead.thread_time_${t.id}`} className="text-xs text-fg-subtle">{t.lastAt}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            <div data-cmp="lead.right_col" className="flex flex-col gap-4">
              <Card cmp="lead.enrichment_card" title={<span className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-accent" /> AI enrichment</span>} actions={<span data-cmp="lead.enrichment_time" className="text-xs text-fg-subtle">Oct 12</span>}>
                <dl data-cmp="lead.enrichment_list" className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  {[['Seniority', 'VP / Executive'], ['Department', 'Customer Success'], ['Tenure', '3y 2m'], ['Location', 'Boston, MA'], ['Timezone', 'America/New_York'], ['Buying role', 'Decision maker']].map(([k, v]) => (
                    <div key={k} data-cmp={`lead.enrichment_row_${k}`} className="contents"><dt data-cmp={`lead.enrichment_key_${k}`} className="text-fg-muted">{k}</dt><dd data-cmp={`lead.enrichment_val_${k}`}>{v}</dd></div>
                  ))}
                </dl>
                <p data-cmp="lead.enrichment_summary" className="mt-3 text-sm text-fg-muted border-t border-border pt-3">Leads CS for 320-person telehealth company. Publicly posted about reducing patient intake time; strong fit for intake automation module.</p>
              </Card>
              <Card cmp="lead.company_card" title="Company">
                <div data-cmp="lead.company_row" className="flex items-center gap-3">
                  <span data-cmp="lead.company_logo" className="h-9 w-9 rounded bg-surface-3 inline-flex items-center justify-center font-semibold text-fg-muted">N</span>
                  <div data-cmp="lead.company_meta"><a data-cmp="lead.company_name" className="font-medium text-primary hover:underline">{company.name}</a><p data-cmp="lead.company_sub" className="text-xs text-fg-muted">{company.industry} · {company.size} · {company.location}</p></div>
                </div>
                <p data-cmp="lead.company_other_leads" className="mt-3 text-xs text-fg-muted">{company.leads - 1} other leads at this company</p>
              </Card>
              <Card cmp="lead.meeting_card" title="Next meeting">
                <div data-cmp="lead.meeting_row" className="flex items-center gap-3 text-sm"><span data-cmp="lead.meeting_icon" className="h-9 w-9 rounded bg-primary/10 text-primary inline-flex items-center justify-center"><Calendar size={16} /></span><div><p data-cmp="lead.meeting_title" className="font-medium">Pilot walkthrough</p><p data-cmp="lead.meeting_time" className="text-xs text-fg-muted">Tue, Oct 21 · 14:00–14:30 ET · Google Meet</p></div></div>
              </Card>
            </div>
          </div>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
