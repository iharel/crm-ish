import { GripVertical, Plus, Trash2, Trophy, XCircle } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Badge, Button, Card, Input, Tabs, Toggle } from '../../components/ui'
import { statuses } from '../data'

/** SettingsStatusesMockup — configure the lead pipeline stages. */
export default function SettingsStatusesMockup() {
  return (
    <MockupFrame name="settings-statuses" title="Settings — Lead statuses">
      <AppShell active="settings" title="Settings">
        <div data-cmp="settings.root_div" className="p-5 flex flex-col gap-4 max-w-4xl">
          <Tabs cmp="settings.tabs" active="statuses" tabs={[{ id: 'general', label: 'General' }, { id: 'statuses', label: 'Lead statuses' }, { id: 'ai', label: 'AI behaviour' }, { id: 'notifications', label: 'Notifications' }, { id: 'appearance', label: 'Appearance' }]} />
          <Card cmp="settings.statuses_card" title="Pipeline stages" actions={<Button cmp="settings.statuses_add_button" size="sm" variant="primary" icon={<Plus size={12} />}>Add status</Button>} padded={false}>
            <ul data-cmp="settings.statuses_list" className="divide-y divide-border">
              {statuses.map((s) => (
                <li key={s.id} data-cmp={`settings.status_row_${s.id}`} className="px-4 py-3 flex items-center gap-3">
                  <GripVertical data-cmp={`settings.status_grip_${s.id}`} size={14} className="text-fg-subtle cursor-grab" />
                  <input data-cmp={`settings.status_color_${s.id}`} type="color" defaultValue={s.color} className="h-7 w-7 rounded border border-border bg-transparent cursor-pointer" />
                  <Input cmp={`settings.status_name_${s.id}`} defaultValue={s.name} className="w-56" />
                  <Badge cmp={`settings.status_preview_${s.id}`} color={s.color}>{s.name}</Badge>
                  <span data-cmp={`settings.status_spacer_${s.id}`} className="flex-1" />
                  <label data-cmp={`settings.status_won_label_${s.id}`} className="inline-flex items-center gap-1.5 text-xs text-fg-muted"><Trophy size={12} /><Toggle cmp={`settings.status_won_${s.id}`} checked={!!s.isWon} /></label>
                  <label data-cmp={`settings.status_lost_label_${s.id}`} className="inline-flex items-center gap-1.5 text-xs text-fg-muted"><XCircle size={12} /><Toggle cmp={`settings.status_lost_${s.id}`} checked={!!s.isLost} /></label>
                  <Button cmp={`settings.status_delete_${s.id}`} size="icon" variant="ghost" aria-label="Delete"><Trash2 size={13} /></Button>
                </li>
              ))}
            </ul>
            <div data-cmp="settings.statuses_footer" className="px-4 py-3 border-t border-border text-xs text-fg-muted flex items-center justify-between">
              <span data-cmp="settings.statuses_hint">Drag to reorder. Deleting a status asks where to move its leads. “Won”/“Lost” flags drive win-rate metrics.</span>
              <Button cmp="settings.statuses_save_button" size="sm" variant="primary">Save changes</Button>
            </div>
          </Card>
          <Card cmp="settings.default_card" title="Defaults">
            <div data-cmp="settings.default_grid" className="grid md:grid-cols-2 gap-4 text-sm">
              <div data-cmp="settings.default_status"><p className="font-medium">Default status for new leads</p><Badge cmp="settings.default_status_badge" color={statuses[0].color} className="mt-1">{statuses[0].name}</Badge></div>
              <div data-cmp="settings.default_inbound" className="flex items-start justify-between gap-3"><div><p className="font-medium">Auto-create lead from unknown inbound email</p><p className="text-xs text-fg-muted">Creates a lead + company (by domain) when a new sender writes in.</p></div><Toggle cmp="settings.default_inbound_toggle" checked /></div>
            </div>
          </Card>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
