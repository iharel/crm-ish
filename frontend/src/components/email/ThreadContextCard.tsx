import { Link } from 'react-router-dom'
import { Mail, Phone, Globe, ExternalLink } from 'lucide-react'
import { companiesApi, leadsApi, statusesApi } from '../../api'
import { StatusBadge } from '../common/StatusBadge'
import { CompanyLogo } from '../companies/CompanyLogo'
import { Avatar, Skeleton } from '../ui'
import { useCachedResource } from '../../hooks/useCachedResource'
import { INBOX_MAX_AGE_MS, companyCache, leadCache, statusesCache } from '../../lib/inboxCache'

export interface ThreadContextCardProps { leadId: string | null; companyId: string | null }

/** ThreadContextCard — compact lead + company box shown beside a linked thread. */
export function ThreadContextCard({ leadId, companyId }: ThreadContextCardProps) {
  // Cached per id: switching between threads of the same lead/company re-renders this box instantly.
  const lead = useCachedResource(leadCache, leadId, async () => (await leadsApi.get(leadId!)).lead, INBOX_MAX_AGE_MS).data
  const company = useCachedResource(companyCache, companyId, async () => (await companiesApi.get(companyId!)).company, INBOX_MAX_AGE_MS).data
  const statuses = useCachedResource(statusesCache, 'all', () => statusesApi.list(), 5 * 60_000).data ?? []
  if (!leadId && !companyId) return null
  const status = lead?.statusId ? statuses.find((s) => s.id === lead.statusId) : undefined
  return (
    <div data-cmp="threadctx.card" className="border-b border-border p-3 flex flex-col gap-3 text-sm bg-surface-2/40">
      {leadId && (
        <Link data-cmp="threadctx.lead_link" to={`/leads/${leadId}`} className="group flex items-start gap-2.5 rounded-lg p-1.5 -m-1.5 hover:bg-surface-2">
          {lead ? <Avatar cmp="threadctx.lead_avatar" name={lead.name} size="sm" /> : <Skeleton cmp="threadctx.lead_avatar_skeleton" className="h-7 w-7 rounded-full shrink-0" />}
          <div data-cmp="threadctx.lead_meta" className="min-w-0 flex-1">
            <div data-cmp="threadctx.lead_top" className="flex items-center gap-1.5">
              {lead ? <span dir="auto" data-cmp="threadctx.lead_name" className="font-medium truncate">{lead.name}</span> : <Skeleton cmp="threadctx.lead_name_skeleton" className="h-3 w-28" />}
              {status && <StatusBadge cmp="threadctx.lead_status" status={status} />}
              <ExternalLink size={11} className="ml-auto text-fg-subtle opacity-0 group-hover:opacity-100 shrink-0" />
            </div>
            {!lead && <Skeleton cmp="threadctx.lead_line_skeleton" className="mt-1.5 h-2.5 w-36" />}
            {lead?.title && <p dir="auto" data-cmp="threadctx.lead_title" className="text-xs text-fg-muted truncate">{lead.title}</p>}
            {lead?.email && <p data-cmp="threadctx.lead_email" className="text-xs text-fg-subtle font-mono truncate inline-flex items-center gap-1"><Mail size={10} /> {lead.email}</p>}
            {lead?.phone && <p data-cmp="threadctx.lead_phone" className="text-xs text-fg-subtle font-mono truncate inline-flex items-center gap-1 ml-2"><Phone size={10} /> {lead.phone}</p>}
          </div>
        </Link>
      )}
      {companyId && (
        <Link data-cmp="threadctx.company_link" to={`/companies/${companyId}`} className="group flex items-start gap-2.5 rounded-lg p-1.5 -m-1.5 hover:bg-surface-2">
          {company ? <CompanyLogo cmp="threadctx.company_logo" name={company.name} logoUrl={company.logoUrl} size="sm" /> : <Skeleton cmp="threadctx.company_logo_skeleton" className="h-8 w-8 rounded-lg shrink-0" />}
          <div data-cmp="threadctx.company_meta" className="min-w-0 flex-1">
            <div data-cmp="threadctx.company_top" className="flex items-center gap-1.5">
              {company ? <span dir="auto" data-cmp="threadctx.company_name" className="font-medium truncate">{company.name}</span> : <Skeleton cmp="threadctx.company_name_skeleton" className="h-3 w-24" />}
              {company?.leadCount != null && <span data-cmp="threadctx.company_leads" className="text-[11px] text-fg-subtle shrink-0">{company.leadCount} {company.leadCount === 1 ? 'lead' : 'leads'}</span>}
              <ExternalLink size={11} className="ml-auto text-fg-subtle opacity-0 group-hover:opacity-100 shrink-0" />
            </div>
            {!company && <Skeleton cmp="threadctx.company_line_skeleton" className="mt-1.5 h-2.5 w-32" />}
            {company?.industry && <p dir="auto" data-cmp="threadctx.company_industry" className="text-xs text-fg-muted truncate">{company.industry}{company.location ? ` · ${company.location}` : ''}</p>}
            {company?.domain && <p data-cmp="threadctx.company_domain" className="text-xs text-fg-subtle font-mono truncate inline-flex items-center gap-1"><Globe size={10} /> {company.domain}</p>}
          </div>
        </Link>
      )}
    </div>
  )
}
