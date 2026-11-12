import { ArrowLeft, Globe, Link as Linkedin, MapPin, Plus, Sparkles, Users, Pencil } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Avatar, Badge, Button, Card, Tabs } from '../../components/ui'
import { byId, companies, leads, threads } from '../data'

/** CompanyDetailMockup — company profile with linked leads and threads. */
export default function CompanyDetailMockup() {
  const c = companies[0]
  const cLeads = leads.filter((l) => l.companyId === c.id)
  const cThreads = threads.filter((t) => t.leadId && cLeads.some((l) => l.id === t.leadId))
  return (
    <MockupFrame name="company-detail" title="Company detail">
      <AppShell active="companies" title="Companies" actions={<><Button cmp="company.enrich_button" size="sm" variant="accent" icon={<Sparkles size={13} />}>Re-enrich</Button><Button cmp="company.edit_button" size="sm" icon={<Pencil size={13} />}>Edit</Button></>}>
        <div data-cmp="company.root_div" className="p-5 flex flex-col gap-4">
          <a data-cmp="company.back_link" className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"><ArrowLeft size={12} /> All companies</a>
          <header data-cmp="company.header" className="card p-5 flex items-start gap-4">
            <span data-cmp="company.logo" className="h-14 w-14 rounded-lg bg-surface-3 inline-flex items-center justify-center text-xl font-semibold text-fg-muted">{c.name[0]}</span>
            <div data-cmp="company.header_meta" className="flex-1">
              <div data-cmp="company.header_row" className="flex items-center gap-3"><h2 data-cmp="company.name" className="text-xl font-semibold">{c.name}</h2><Badge cmp="company.industry_badge">{c.industry}</Badge><Badge cmp="company.enriched_badge" tone="accent"><Sparkles size={10} /> Enriched Oct 12</Badge></div>
              <div data-cmp="company.links" className="mt-2 flex items-center gap-4 text-xs text-fg-muted">
                <a data-cmp="company.website_link" className="inline-flex items-center gap-1 hover:text-fg font-mono"><Globe size={12} /> {c.domain}</a>
                <a data-cmp="company.linkedin_link" className="inline-flex items-center gap-1 hover:text-fg"><Linkedin size={12} /> linkedin.com/company/northwind-health</a>
                <span data-cmp="company.location" className="inline-flex items-center gap-1"><MapPin size={12} /> {c.location}</span>
                <span data-cmp="company.size" className="inline-flex items-center gap-1"><Users size={12} /> {c.size} employees</span>
              </div>
              <p data-cmp="company.description" className="mt-3 text-sm text-fg-muted max-w-2xl">{c.description}</p>
            </div>
          </header>
          <div data-cmp="company.grid" className="grid xl:grid-cols-3 gap-4">
            <Card cmp="company.leads_card" className="xl:col-span-2" title={`Leads (${cLeads.length})`} actions={<Button cmp="company.leads_add_button" size="sm" icon={<Plus size={12} />}>Add lead</Button>} padded={false}>
              <ul data-cmp="company.leads_list" className="divide-y divide-border">
                {cLeads.map((l) => { const s = byId.status(l.statusId); return (
                  <li key={l.id} data-cmp={`company.lead_item_${l.id}`} className="p-3 flex items-center gap-3 hover:bg-surface-2 cursor-pointer">
                    <Avatar cmp={`company.lead_avatar_${l.id}`} name={l.name} size="sm" />
                    <div data-cmp={`company.lead_meta_${l.id}`} className="flex-1 min-w-0"><div data-cmp={`company.lead_name_${l.id}`} className="text-sm font-medium">{l.name}</div><div data-cmp={`company.lead_title_${l.id}`} className="text-xs text-fg-muted">{l.title} · {l.email}</div></div>
                    <Badge cmp={`company.lead_status_${l.id}`} color={s.color}>{s.name}</Badge>
                    <span data-cmp={`company.lead_score_${l.id}`} className="font-mono text-xs text-accent w-8 text-right">{l.score}</span>
                    <Avatar cmp={`company.lead_owner_${l.id}`} name={byId.user(l.ownerId).name} size="xs" />
                  </li>
                ) })}
              </ul>
            </Card>
            <Card cmp="company.enrichment_card" title={<span className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-accent" /> AI insights</span>}>
              <ul data-cmp="company.insights_list" className="text-sm flex flex-col gap-2">
                {['Raised $40M Series B (Mar 2026)', 'Hiring 6 roles in patient operations', 'Uses Epic EHR + Zendesk', 'Competitor evaluation: Zocdoc intake module', 'Compliance: HIPAA, SOC 2 Type II required'].map((t, i) => (
                  <li key={i} data-cmp={`company.insight_${i}`} className="flex gap-2"><span data-cmp={`company.insight_dot_${i}`} className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />{t}</li>
                ))}
              </ul>
              <p data-cmp="company.insights_sources" className="mt-3 text-xs text-fg-subtle border-t border-border pt-2">Sources: northwind.health, LinkedIn, Crunchbase (public)</p>
            </Card>
            <Card cmp="company.threads_card" className="xl:col-span-3" padded={false}>
              <Tabs cmp="company.tabs" active="emails" tabs={[{ id: 'emails', label: 'Email threads', count: cThreads.length }, { id: 'meetings', label: 'Meetings', count: 2 }, { id: 'notes', label: 'Notes', count: 3 }]} />
              <ul data-cmp="company.threads_list" className="divide-y divide-border">
                {cThreads.map((t) => (
                  <li key={t.id} data-cmp={`company.thread_item_${t.id}`} className="p-3 flex items-center gap-3 hover:bg-surface-2 cursor-pointer">
                    <Avatar cmp={`company.thread_avatar_${t.id}`} name={byId.lead(t.leadId!).name} size="sm" />
                    <div data-cmp={`company.thread_meta_${t.id}`} className="flex-1 min-w-0"><div data-cmp={`company.thread_subject_${t.id}`} className="text-sm font-medium truncate">{t.subject}</div><div data-cmp={`company.thread_snippet_${t.id}`} className="text-xs text-fg-muted truncate">{t.snippet}</div></div>
                    <span data-cmp={`company.thread_time_${t.id}`} className="text-xs text-fg-subtle">{t.lastAt}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
