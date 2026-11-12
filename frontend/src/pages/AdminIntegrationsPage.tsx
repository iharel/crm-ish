import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, KeyRound, Mail, Sparkles, AlertCircle } from 'lucide-react'
import { googleApi, settingsApi } from '../api'
import { errorMessage } from '../api/apiError'
import { AppShell } from '../components/shell/AppShell'
import { PageState } from '../components/common/PageState'
import { Avatar, Badge, Button, Card, Input, Select, Toggle } from '../components/ui'
import { useToast } from '../contexts/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { clipboardService } from '../services/clipboardService'
import { VendorLink } from '../components/common/VendorLink'
import { VENDOR_LINKS } from '../lib/vendorLinks'
import { timeAgo } from '../lib/format'

/** AdminIntegrationsPage — Google OAuth client, AI providers, connected accounts, workspace defaults. */
export default function AdminIntegrationsPage() {
  const toast = useToast()
  const google = useAsync(() => googleApi.config())
  const ai = useAsync(() => settingsApi.ai())
  const accounts = useAsync(() => googleApi.accounts())
  const ws = useAsync(() => settingsApi.workspace())
  const [g, setG] = useState({ clientId: '', clientSecret: '', redirectUri: '', pubsubTopic: '' })
  const [a, setA] = useState({ anthropicApiKey: '', voyageApiKey: '', draftModel: '', enrichModel: '' })
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => { if (google.data) setG({ clientId: google.data.clientId, clientSecret: '', redirectUri: google.data.redirectUri, pubsubTopic: google.data.pubsubTopic }) }, [google.data])
  useEffect(() => { if (ai.data) setA((x) => ({ ...x, draftModel: ai.data!.draftModel, enrichModel: ai.data!.enrichModel })) }, [ai.data])
  async function saveGoogle() { setBusy('google'); try { await googleApi.saveConfig({ clientId: g.clientId, clientSecret: g.clientSecret || undefined, redirectUri: g.redirectUri, pubsubTopic: g.pubsubTopic || null }); toast.success('Google OAuth saved'); await google.reload(true) } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(null) } }
  async function saveAi() { setBusy('ai'); try { await settingsApi.saveAi(a); setA((x) => ({ ...x, anthropicApiKey: '', voyageApiKey: '' })); toast.success('AI settings saved'); await ai.reload(true) } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(null) } }
  const copy = async (v: string) => { await clipboardService.copy(v); toast.success('Copied') }
  return (
    <AppShell title="Integrations">
      <div data-cmp="integrations.root_div" className="p-6 grid xl:grid-cols-2 gap-5 animate-fade-in">
        {google.error ? <PageState cmp="integrations.google" error={google.error} onRetry={() => void google.reload()} /> : (
          <Card cmp="integrations.google_card" title={<span className="inline-flex items-center gap-2"><Mail size={14} /> Google Workspace OAuth</span>} actions={<span data-cmp="integrations.google_header_actions" className="inline-flex items-center gap-3"><VendorLink cmp="integrations.google_console" href={VENDOR_LINKS.googleCredentials}>Open Google Cloud Console</VendorLink>{google.data?.configured ? <Badge cmp="integrations.google_status" tone="success"><CheckCircle2 size={10} /> Configured</Badge> : <Badge cmp="integrations.google_status" tone="warning"><AlertCircle size={10} /> Not configured</Badge>}</span>}>
            <div data-cmp="integrations.google_form" className="flex flex-col gap-3">
              <p data-cmp="integrations.google_help" className="text-xs text-fg-muted">Create an OAuth client (Web application) in Google Cloud Console, enable the Gmail and Calendar APIs, and add the redirect URI below. Users then connect their own Gmail in Settings.</p>
              <div data-cmp="integrations.google_links" className="flex flex-wrap gap-x-4 gap-y-1">
                <VendorLink cmp="integrations.google_link_credentials" href={VENDOR_LINKS.googleCredentials}>OAuth credentials</VendorLink>
                <VendorLink cmp="integrations.google_link_consent" href={VENDOR_LINKS.googleOAuthConsent}>Consent screen</VendorLink>
                <VendorLink cmp="integrations.google_link_gmail" href={VENDOR_LINKS.googleEnableGmail}>Enable Gmail API</VendorLink>
                <VendorLink cmp="integrations.google_link_calendar" href={VENDOR_LINKS.googleEnableCalendar}>Enable Calendar API</VendorLink>
              </div>
              <Input cmp="integrations.google_client_id" label="Client ID" value={g.clientId} onChange={(e) => setG({ ...g, clientId: e.target.value })} className="font-mono" hint={<VendorLink cmp="integrations.google_client_id" href={VENDOR_LINKS.googleCredentials}>Find or create the client ID in Google Cloud Console → Credentials</VendorLink>} />
              <Input cmp="integrations.google_client_secret" label="Client secret" type="password" value={g.clientSecret} onChange={(e) => setG({ ...g, clientSecret: e.target.value })} placeholder={google.data?.hasSecret ? '•••••••• (stored, leave blank to keep)' : ''} className="font-mono" />
              <Input cmp="integrations.google_redirect" label="Redirect URI" value={g.redirectUri} onChange={(e) => setG({ ...g, redirectUri: e.target.value })} className="font-mono" hint={<>Must match exactly in <VendorLink cmp="integrations.google_redirect" href={VENDOR_LINKS.googleCredentials}>Google Cloud Console → Credentials</VendorLink>.</>} />
              <Input cmp="integrations.google_pubsub" label="Pub/Sub topic (optional, Gmail push)" value={g.pubsubTopic} onChange={(e) => setG({ ...g, pubsubTopic: e.target.value })} className="font-mono" hint={<>Polling every 2 minutes is used when empty. <VendorLink cmp="integrations.google_pubsub" href={VENDOR_LINKS.googlePubSubTopics}>Manage Pub/Sub topics</VendorLink></>} />
              <div data-cmp="integrations.google_scopes" className="text-xs text-fg-muted"><span className="font-medium text-fg">Scopes:</span> {google.data?.scopes.join(' · ')}</div>
              <div data-cmp="integrations.google_actions" className="flex justify-end"><Button cmp="integrations.google_save_button" size="sm" variant="primary" disabled={busy === 'google' || !g.clientId} onClick={() => void saveGoogle()}>Save</Button></div>
            </div>
          </Card>
        )}
        <Card cmp="integrations.llm_card" title={<span className="inline-flex items-center gap-2"><Sparkles size={14} /> AI providers</span>} actions={<span data-cmp="integrations.llm_header_actions" className="inline-flex items-center gap-3"><VendorLink cmp="integrations.anthropic_console" href={VENDOR_LINKS.anthropicKeys}>Open Anthropic Console</VendorLink>{ai.data?.anthropicConfigured ? <Badge cmp="integrations.llm_status" tone="success"><CheckCircle2 size={10} /> Active</Badge> : <Badge cmp="integrations.llm_status" tone="warning"><AlertCircle size={10} /> Stub mode</Badge>}</span>}>
          <div data-cmp="integrations.llm_form" className="flex flex-col gap-3">
            <Input cmp="integrations.anthropic_key" label="Anthropic API key" type="password" value={a.anthropicApiKey} onChange={(e) => setA({ ...a, anthropicApiKey: e.target.value })} placeholder={ai.data?.anthropicConfigured ? '•••••••• (stored)' : 'sk-ant-…'} leading={<KeyRound size={14} />} className="font-mono" hint={<VendorLink cmp="integrations.anthropic_key" href={VENDOR_LINKS.anthropicKeys}>Create or manage keys in the Anthropic Console</VendorLink>} />
            <div data-cmp="integrations.llm_models" className="grid grid-cols-2 gap-3">
              <Select cmp="integrations.draft_model" label="Draft model" value={a.draftModel} onChange={(e) => setA({ ...a, draftModel: e.target.value })} options={[{ value: 'claude-sonnet-5', label: 'claude-sonnet-5' }, { value: 'claude-opus-5-5', label: 'claude-opus-5-5' }, { value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5' }]} />
              <Select cmp="integrations.enrich_model" label="Enrichment model" value={a.enrichModel} onChange={(e) => setA({ ...a, enrichModel: e.target.value })} options={[{ value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5' }, { value: 'claude-sonnet-5', label: 'claude-sonnet-5' }]} />
            </div>
            <Input cmp="integrations.voyage_key" label="Voyage AI key (embeddings)" type="password" value={a.voyageApiKey} onChange={(e) => setA({ ...a, voyageApiKey: e.target.value })} placeholder={ai.data?.voyageConfigured ? '•••••••• (stored)' : 'pa-… (optional; offline hashing embedder used when empty)'} leading={<KeyRound size={14} />} className="font-mono" hint={<VendorLink cmp="integrations.voyage_key" href={VENDOR_LINKS.voyageKeys}>Create or manage keys in the Voyage AI dashboard</VendorLink>} />
            <p data-cmp="integrations.embedding_model" className="text-xs text-fg-muted">Embedding model: <span className="font-mono">{ai.data?.embeddingModel}</span> · <VendorLink cmp="integrations.anthropic_models" href={VENDOR_LINKS.anthropicModels}>Claude model reference</VendorLink></p>
            <div data-cmp="integrations.llm_actions" className="flex justify-end"><Button cmp="integrations.llm_save_button" size="sm" variant="primary" disabled={busy === 'ai'} onClick={() => void saveAi()}>Save</Button></div>
          </div>
        </Card>
        <Card cmp="integrations.accounts_card" title="Connected Google accounts" className="xl:col-span-2" padded={false}>
          <ul data-cmp="integrations.accounts_list" className="divide-y divide-border text-sm">
            {(accounts.data ?? []).map((acc) => <li key={acc.id} data-cmp={`integrations.account_${acc.id}`} className="px-4 py-3 flex items-center gap-3"><Avatar cmp={`integrations.account_avatar_${acc.id}`} name={acc.email} size="sm" /><span dir="auto" data-cmp={`integrations.account_email_${acc.id}`} className="font-mono text-xs flex-1">{acc.email}</span><Badge cmp={`integrations.account_status_${acc.id}`} tone={acc.status === 'error' ? 'danger' : 'success'}>{acc.status}</Badge><span data-cmp={`integrations.account_sync_${acc.id}`} className="text-xs text-fg-subtle">{acc.lastSyncAt ? `synced ${timeAgo(acc.lastSyncAt)}` : 'never synced'}</span>{acc.lastError && <span data-cmp={`integrations.account_error_${acc.id}`} className="text-xs text-danger truncate max-w-xs">{acc.lastError}</span>}</li>)}
            {accounts.data && !accounts.data.length && <li data-cmp="integrations.accounts_empty" className="p-6 text-center text-fg-muted">No one has connected Gmail yet. Each user connects in Settings → Email.</li>}
          </ul>
        </Card>
        <Card cmp="integrations.workspace_card" title="Workspace defaults">
          <div data-cmp="integrations.workspace_list" className="flex flex-col gap-3 text-sm">
            <div data-cmp="integrations.ws_autocreate" className="flex items-start justify-between gap-3"><div><p>Auto-create leads from unknown inbound email</p><p className="text-xs text-fg-muted">Off by default: unknown senders stay “Unlinked” until you right-click → Create lead. On: a lead + company (by domain) is created for every new business sender.</p></div><Toggle cmp="integrations.ws_autocreate_toggle" checked={ws.data?.autoCreateLeads ?? false} onChange={async (v) => { try { await settingsApi.saveWorkspace({ autoCreateLeads: v }); await ws.reload(true) } catch (e) { toast.error(errorMessage(e)) } }} /></div>
            <div data-cmp="integrations.ws_autodraft" className="flex items-start justify-between gap-3"><div><p>Auto-draft replies for inbound email</p><p className="text-xs text-fg-muted">Off by default: you ask for a draft from the inbox draft panel. On: an AI draft is generated for every inbound message.</p></div><Toggle cmp="integrations.ws_autodraft_toggle" checked={ws.data?.autoDraftReplies ?? false} onChange={async (v) => { try { await settingsApi.saveWorkspace({ autoDraftReplies: v }); await ws.reload(true) } catch (e) { toast.error(errorMessage(e)) } }} /></div>
          </div>
        </Card>
        <Card cmp="integrations.endpoints_card" title="Public endpoints">
          <div data-cmp="integrations.endpoints_grid" className="grid gap-2 text-xs">
            {[['Google OAuth callback', google.data?.redirectUri ?? ''], ['Gmail push webhook', google.data?.webhookUrl ?? ''], ['Open pixel', `${location.origin}/t/o/:token.gif`], ['Click redirect', `${location.origin}/t/c/:token?u=`]].map(([k, v]) => <div key={k} data-cmp={`integrations.endpoint_${k}`} className="rounded-lg border border-border bg-surface-2 p-3 flex items-center justify-between gap-2"><div className="min-w-0"><p className="text-fg-muted">{k}</p><code className="font-mono truncate block">{v}</code></div><Button cmp={`integrations.endpoint_copy_${k}`} size="icon" variant="ghost" aria-label="Copy" onClick={() => void copy(v)}><Copy size={12} /></Button></div>)}
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
