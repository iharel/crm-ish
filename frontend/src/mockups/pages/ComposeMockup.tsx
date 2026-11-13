import { Send, Sparkles, Paperclip, Calendar, Eye, Link2, Wand2, ChevronDown } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Badge, Button, Card, Input, Toggle } from '../../components/ui'

/** ComposeMockup — new email with AI assist, scheduling and tracking options. */
export default function ComposeMockup() {
  return (
    <MockupFrame name="compose" title="Compose email">
      <AppShell active="inbox" title="Inbox">
        <div data-cmp="compose.root_div" className="p-6 grid xl:grid-cols-[1fr_320px] gap-4 h-full">
          <Card cmp="compose.card" title="New email" actions={<Badge cmp="compose.from_badge">From alex@acme-demo.example <ChevronDown size={10} /></Badge>} padded={false} className="flex flex-col">
            <div data-cmp="compose.fields" className="divide-y divide-border">
              <div data-cmp="compose.to_row" className="flex items-center gap-3 px-4 h-11 text-sm"><span data-cmp="compose.to_label" className="w-14 text-fg-muted">To</span><Badge cmp="compose.to_chip" tone="primary">Sarah Cohen &lt;sarah@northwind.health&gt;</Badge><input data-cmp="compose.to_input" className="flex-1 bg-transparent outline-none" placeholder="Add recipient…" /><button data-cmp="compose.cc_button" className="text-xs text-fg-muted hover:text-fg">Cc/Bcc</button></div>
              <div data-cmp="compose.subject_row" className="flex items-center gap-3 px-4 h-11 text-sm"><span data-cmp="compose.subject_label" className="w-14 text-fg-muted">Subject</span><input data-cmp="compose.subject_input" className="flex-1 bg-transparent outline-none" defaultValue="Following up — pilot next steps" /></div>
            </div>
            <div data-cmp="compose.editor_wrap" className="flex-1 flex flex-col">
              <div data-cmp="compose.toolbar" className="flex items-center gap-1 px-3 h-10 border-b border-border text-xs text-fg-muted">
                {['B', 'I', 'U', '•', '1.', '🔗'].map((t, i) => <button key={i} data-cmp={`compose.fmt_${i}`} className="h-7 w-7 rounded hover:bg-surface-2 font-semibold">{t}</button>)}
                <span data-cmp="compose.toolbar_sep" className="w-px h-5 bg-border mx-1" />
                <Button cmp="compose.ai_write_button" size="sm" variant="accent" icon={<Wand2 size={12} />}>Write with AI</Button>
                <Button cmp="compose.ai_tone_button" size="sm" variant="ghost" icon={<Sparkles size={12} />}>Improve tone</Button>
                <Button cmp="compose.insert_slots_button" size="sm" variant="ghost" icon={<Calendar size={12} />}>Insert times</Button>
              </div>
              <textarea data-cmp="compose.body_textarea" className="flex-1 min-h-64 p-4 bg-transparent outline-none resize-none text-sm leading-relaxed" defaultValue={`Hi Sarah,\n\nFollowing up on our call — here are the next steps for the 3-clinic pilot:\n\n1. Legal review of the BAA (attached)\n2. IT walkthrough — Tue 14:00 or Thu 10:00 ET, or pick a slot: https://cal.com/alex/30\n3. Kick-off the week after signature\n\nBest,\nAlex`} />
            </div>
            <footer data-cmp="compose.footer" className="flex items-center gap-2 px-4 h-14 border-t border-border bg-surface-2/50">
              <Button cmp="compose.send_button" variant="primary" icon={<Send size={13} />}>Send</Button>
              <Button cmp="compose.schedule_send_button" variant="ghost" size="sm">Schedule send</Button>
              <Button cmp="compose.attach_button" variant="ghost" size="icon" aria-label="Attach"><Paperclip size={14} /></Button>
              <span data-cmp="compose.attachment_chip" className="inline-flex items-center gap-1.5 text-xs text-fg-muted border border-border rounded px-2 py-1"><Paperclip size={11} /> BAA-template.pdf</span>
              <span data-cmp="compose.footer_spacer" className="flex-1" />
              <Button cmp="compose.discard_button" variant="ghost" size="sm">Discard</Button>
            </footer>
          </Card>
          <div data-cmp="compose.side" className="flex flex-col gap-4">
            <Card cmp="compose.options_card" title="Options">
              <div data-cmp="compose.options_list" className="flex flex-col gap-3 text-sm">
                <div data-cmp="compose.opt_track_open" className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><Eye size={14} className="text-fg-muted" /> Track opens (pixel)</span><Toggle cmp="compose.opt_track_open_toggle" checked /></div>
                <div data-cmp="compose.opt_track_click" className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><Link2 size={14} className="text-fg-muted" /> Track link clicks</span><Toggle cmp="compose.opt_track_click_toggle" checked /></div>
                <div data-cmp="compose.opt_link_lead" className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><Sparkles size={14} className="text-fg-muted" /> Log to lead timeline</span><Toggle cmp="compose.opt_link_lead_toggle" checked /></div>
              </div>
            </Card>
            <Card cmp="compose.context_card" title="Lead context">
              <dl data-cmp="compose.context_list" className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                <dt data-cmp="compose.context_lead_dt" className="text-fg-muted">Lead</dt><dd data-cmp="compose.context_lead_dd">Sarah Cohen</dd>
                <dt data-cmp="compose.context_company_dt" className="text-fg-muted">Company</dt><dd data-cmp="compose.context_company_dd">Northwind Health</dd>
                <dt data-cmp="compose.context_status_dt" className="text-fg-muted">Status</dt><dd data-cmp="compose.context_status_dd"><Badge cmp="compose.context_status" color="#d97706">Proposal</Badge></dd>
                <dt data-cmp="compose.context_last_dt" className="text-fg-muted">Last email</dt><dd data-cmp="compose.context_last_dd">Today 10:42 (inbound)</dd>
                <dt data-cmp="compose.context_open_dt" className="text-fg-muted">Open rate</dt><dd data-cmp="compose.context_open_dd" className="font-mono">4 / 5</dd>
              </dl>
            </Card>
            <Card cmp="compose.templates_card" title="Templates">
              <ul data-cmp="compose.templates_list" className="text-sm flex flex-col gap-1">
                {['Follow-up after call', 'Proposal cover note', 'Meeting confirmation', 'Re-engage silent lead'].map((t, i) => <li key={i} data-cmp={`compose.template_${i}`} className="px-2 py-1.5 rounded hover:bg-surface-2 cursor-pointer">{t}</li>)}
              </ul>
            </Card>
            <Input cmp="compose.schedule_link_input" label="Your scheduling link" defaultValue="https://cal.com/alex/30" hint="Inserted by 'Insert times'." />
          </div>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
