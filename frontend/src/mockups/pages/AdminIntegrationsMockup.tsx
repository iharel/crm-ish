import { CheckCircle2, Copy, ExternalLink, KeyRound, Mail, Calendar, Sparkles, RefreshCw } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Avatar, Badge, Button, Card, Input, Select } from '../../components/ui'
import { users } from '../data'

/** AdminIntegrationsMockup — Google OAuth client, LLM keys, connected accounts. */
export default function AdminIntegrationsMockup() {
  return (
    <MockupFrame name="admin-integrations" title="Admin — Integrations">
      <AppShell active="integrations" title="Integrations">
        <div data-cmp="integrations.root_div" className="p-5 grid xl:grid-cols-2 gap-4">
          <Card cmp="integrations.google_card" title={<span className="inline-flex items-center gap-2"><Mail size={14} /> Google Workspace OAuth</span>} actions={<Badge cmp="integrations.google_status" tone="success"><CheckCircle2 size={10} /> Configured</Badge>}>
            <div data-cmp="integrations.google_form" className="flex flex-col gap-3">
              <Input cmp="integrations.google_client_id" label="Client ID" defaultValue="8123…apps.googleusercontent.com" className="font-mono" />
              <Input cmp="integrations.google_client_secret" label="Client secret" type="password" defaultValue="••••••••••••••••" className="font-mono" />
              <Input cmp="integrations.google_redirect" label="Redirect URI" defaultValue="https://crm.acme-demo.example/api/google/callback" className="font-mono" hint="Add this URI in Google Cloud Console → Credentials." />
              <Input cmp="integrations.google_pubsub" label="Pub/Sub topic (Gmail push)" defaultValue="projects/acme-demo-crm/topics/gmail-push" className="font-mono" hint="Optional; polling every 2 min is used when empty." />
              <div data-cmp="integrations.google_scopes" className="text-xs text-fg-muted"><span className="font-medium text-fg">Scopes:</span> gmail.modify · gmail.send · calendar.events · userinfo.email</div>
              <div data-cmp="integrations.google_actions" className="flex gap-2 justify-end"><Button cmp="integrations.google_test_button" size="sm" icon={<RefreshCw size={12} />}>Test</Button><Button cmp="integrations.google_save_button" size="sm" variant="primary">Save</Button></div>
            </div>
          </Card>
          <Card cmp="integrations.llm_card" title={<span className="inline-flex items-center gap-2"><Sparkles size={14} /> AI providers</span>} actions={<Badge cmp="integrations.llm_status" tone="success"><CheckCircle2 size={10} /> Active</Badge>}>
            <div data-cmp="integrations.llm_form" className="flex flex-col gap-3">
              <Input cmp="integrations.anthropic_key" label="Anthropic API key" type="password" defaultValue="sk-ant-••••••••" leading={<KeyRound size={14} />} className="font-mono" />
              <div data-cmp="integrations.llm_models" className="grid grid-cols-2 gap-3">
                <Select cmp="integrations.draft_model" label="Draft model" options={[{ value: 'claude-sonnet-5', label: 'claude-sonnet-5' }, { value: 'claude-opus-5-5', label: 'claude-opus-5-5' }]} />
                <Select cmp="integrations.enrich_model" label="Enrichment model" options={[{ value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5' }, { value: 'claude-sonnet-5', label: 'claude-sonnet-5' }]} />
              </div>
              <Input cmp="integrations.voyage_key" label="Voyage AI key (embeddings)" type="password" defaultValue="pa-••••••••" leading={<KeyRound size={14} />} className="font-mono" />
              <div data-cmp="integrations.llm_actions" className="flex gap-2 justify-end"><Button cmp="integrations.llm_save_button" size="sm" variant="primary">Save</Button></div>
            </div>
          </Card>
          <Card cmp="integrations.accounts_card" title="Connected accounts" className="xl:col-span-2" padded={false}>
            <ul data-cmp="integrations.accounts_list" className="divide-y divide-border text-sm">
              {users.map((u) => (
                <li key={u.id} data-cmp={`integrations.account_${u.id}`} className="px-4 py-3 flex items-center gap-3">
                  <Avatar cmp={`integrations.account_avatar_${u.id}`} name={u.name} size="sm" />
                  <div className="w-48"><p data-cmp={`integrations.account_name_${u.id}`} className="font-medium">{u.name}</p><p data-cmp={`integrations.account_email_${u.id}`} className="text-xs text-fg-muted font-mono">{u.email}</p></div>
                  <div data-cmp={`integrations.account_badges_${u.id}`} className="flex gap-2 flex-1">
                    {u.gmail ? <Badge cmp={`integrations.account_gmail_${u.id}`} tone="success"><Mail size={10} /> Gmail · watch active</Badge> : <Badge cmp={`integrations.account_gmail_${u.id}`} tone="neutral"><Mail size={10} /> Gmail not connected</Badge>}
                    {u.calendar ? <Badge cmp={`integrations.account_cal_${u.id}`} tone="success"><Calendar size={10} /> Calendar</Badge> : <Badge cmp={`integrations.account_cal_${u.id}`} tone="neutral"><Calendar size={10} /> Calendar</Badge>}
                  </div>
                  <span data-cmp={`integrations.account_sync_${u.id}`} className="text-xs text-fg-subtle">{u.gmail ? 'synced 1m ago' : '—'}</span>
                  <Button cmp={`integrations.account_action_${u.id}`} size="sm" variant={u.gmail ? 'ghost' : 'secondary'} icon={<ExternalLink size={12} />}>{u.gmail ? 'Reconnect' : 'Send connect link'}</Button>
                </li>
              ))}
            </ul>
          </Card>
          <Card cmp="integrations.webhook_card" title="Public endpoints" className="xl:col-span-2">
            <div data-cmp="integrations.webhook_grid" className="grid md:grid-cols-3 gap-3 text-xs">
              {[['Gmail push webhook', 'POST /api/webhooks/gmail'], ['Open pixel', 'GET /t/o/:token.gif'], ['Click redirect', 'GET /t/c/:token?u=']].map(([k, v]) => (
                <div key={k} data-cmp={`integrations.endpoint_${k}`} className="rounded-[var(--radius)] border border-border bg-surface-2 p-3 flex items-center justify-between gap-2"><div><p className="text-fg-muted">{k}</p><code className="font-mono">{v}</code></div><Button cmp={`integrations.endpoint_copy_${k}`} size="icon" variant="ghost" aria-label="Copy"><Copy size={12} /></Button></div>
              ))}
            </div>
          </Card>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
