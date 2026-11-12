import { Filter, LayoutList, Kanban, Plus, Sparkles, Mail, MoreHorizontal } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Avatar, Badge, Button } from '../../components/ui'
import { byId, leads, statuses } from '../data'

/** LeadsKanbanMockup — configurable status columns with lead cards. */
export default function LeadsKanbanMockup() {
  return (
    <MockupFrame name="leads-kanban" title="Leads — Kanban">
      <AppShell active="leads" title="Leads" actions={
        <>
          <div data-cmp="leads.view_switch" className="inline-flex rounded-[var(--radius)] border border-border overflow-hidden">
            <button data-cmp="leads.view_kanban_button" aria-pressed className="h-8 px-2.5 inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary"><Kanban size={13} /> Kanban</button>
            <button data-cmp="leads.view_list_button" className="h-8 px-2.5 inline-flex items-center gap-1.5 text-xs text-fg-muted hover:bg-surface-2"><LayoutList size={13} /> List</button>
          </div>
          <Button cmp="leads.filter_button" size="sm" icon={<Filter size={13} />}>Filter</Button>
          <Button cmp="leads.add_button" size="sm" variant="primary" icon={<Plus size={13} />}>New lead</Button>
        </>
      }>
        <div data-cmp="leads.kanban_board" className="h-full flex gap-3 p-4 overflow-x-auto">
          {statuses.map((s) => {
            const col = leads.filter((l) => l.statusId === s.id)
            return (
              <section key={s.id} data-cmp={`leads.kanban_col_${s.id}`} className="w-72 shrink-0 flex flex-col rounded-[var(--radius)] bg-surface-2/70 border border-border max-h-full">
                <header data-cmp={`leads.kanban_col_header_${s.id}`} className="h-10 px-3 flex items-center gap-2 border-b border-border">
                  <span data-cmp={`leads.kanban_col_dot_${s.id}`} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span data-cmp={`leads.kanban_col_name_${s.id}`} className="text-sm font-medium flex-1">{s.name}</span>
                  <span data-cmp={`leads.kanban_col_count_${s.id}`} className="text-xs font-mono text-fg-muted">{col.length}</span>
                  <button data-cmp={`leads.kanban_col_more_${s.id}`} className="text-fg-subtle hover:text-fg"><MoreHorizontal size={14} /></button>
                </header>
                <div data-cmp={`leads.kanban_col_body_${s.id}`} className="flex-1 overflow-auto p-2 flex flex-col gap-2">
                  {col.map((l) => {
                    const c = byId.company(l.companyId)
                    return (
                      <article key={l.id} data-cmp={`leads.kanban_card_${l.id}`} draggable className="card p-3 flex flex-col gap-2 cursor-grab hover:border-border-strong transition-colors">
                        <div data-cmp={`leads.kanban_card_top_${l.id}`} className="flex items-start gap-2">
                          <Avatar cmp={`leads.kanban_card_avatar_${l.id}`} name={l.name} size="sm" />
                          <div data-cmp={`leads.kanban_card_meta_${l.id}`} className="min-w-0 flex-1">
                            <div data-cmp={`leads.kanban_card_name_${l.id}`} className="text-sm font-medium truncate">{l.name}</div>
                            <div data-cmp={`leads.kanban_card_title_${l.id}`} className="text-xs text-fg-muted truncate">{l.title} · {c.name}</div>
                          </div>
                          <span data-cmp={`leads.kanban_card_score_${l.id}`} className="font-mono text-xs text-accent">{l.score}</span>
                        </div>
                        <div data-cmp={`leads.kanban_card_badges_${l.id}`} className="flex items-center gap-1.5 flex-wrap">
                          <Badge cmp={`leads.kanban_card_source_${l.id}`}>{l.source}</Badge>
                          {l.enriched && <Badge cmp={`leads.kanban_card_enriched_${l.id}`} tone="accent"><Sparkles size={10} /> Enriched</Badge>}
                        </div>
                        <div data-cmp={`leads.kanban_card_footer_${l.id}`} className="flex items-center justify-between text-[11px] text-fg-subtle">
                          <span data-cmp={`leads.kanban_card_activity_${l.id}`} className="inline-flex items-center gap-1"><Mail size={11} /> {l.lastActivity}</span>
                          <Avatar cmp={`leads.kanban_card_owner_${l.id}`} name={byId.user(l.ownerId).name} size="xs" />
                        </div>
                      </article>
                    )
                  })}
                  <button data-cmp={`leads.kanban_col_add_${s.id}`} className="h-8 rounded-[var(--radius)] border border-dashed border-border-strong text-xs text-fg-muted hover:text-fg hover:bg-surface inline-flex items-center justify-center gap-1"><Plus size={12} /> Add</button>
                </div>
              </section>
            )
          })}
        </div>
      </AppShell>
    </MockupFrame>
  )
}
