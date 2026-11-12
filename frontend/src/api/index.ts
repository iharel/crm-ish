/** api — per-domain API modules over the common http layer. Errors become ApiError. */
import { http } from '../http/httpClient'
import { call } from './apiError'
import type { BuildInfo, Signature, CompanySuggestion, AiSettings, Activity, Citation, Company, CompanyInput, Dashboard, Deal, DealInput, DealListItem, Draft, GoogleAccount, GoogleConfig, ImportResult, KnowledgeSource, Lead, LeadInput, Task, TaskInput, LeadStatus, Meeting, Message, Notification, Slot, Thread, TrackingOverview, User } from '../types'

export const authApi = {
  login: (email: string, password: string) => call(() => http.post<{ accessToken: string; user: User }>('/auth/login', { email, password })),
  logout: () => call(() => http.post<{ ok: true }>('/auth/logout')),
  me: () => call(() => http.get<User>('/auth/me')),
  changePassword: (currentPassword: string, newPassword: string) => call(() => http.post<{ ok: true }>('/auth/change-password', { currentPassword, newPassword })),
  signature: () => call(() => http.get<Signature>('/auth/signature')),
  setSignature: (d: Signature) => call(() => http.put<Signature>('/auth/signature', d)),
  updateProfile: (d: Partial<Pick<User, 'name' | 'schedulingLink' | 'timezone' | 'workingHoursStart' | 'workingHoursEnd'>>) => call(() => http.patch<User>('/auth/profile', d)),
}
export const usersApi = {
  list: () => call(() => http.get<User[]>('/users')),
  create: (d: { email: string; name: string; role: 'admin' | 'member'; password: string }) => call(() => http.post<User>('/users', d)),
  update: (id: string, d: { name?: string; role?: 'admin' | 'member'; isActive?: boolean; email?: string }) => call(() => http.patch<User>(`/users/${id}`, d)),
  resetPassword: (id: string, password: string) => call(() => http.post<{ ok: true }>(`/users/${id}/reset-password`, { password })),
  remove: (id: string) => call(() => http.delete<{ ok: true }>(`/users/${id}`)),
}
export const statusesApi = {
  list: () => call(() => http.get<LeadStatus[]>('/lead-statuses')),
  create: (d: { name: string; color: string; isWon?: boolean; isLost?: boolean; isDefault?: boolean }) => call(() => http.post<LeadStatus>('/lead-statuses', d)),
  update: (id: string, d: Partial<{ name: string; color: string; isWon: boolean; isLost: boolean; isDefault: boolean }>) => call(() => http.patch<LeadStatus>(`/lead-statuses/${id}`, d)),
  reorder: (ids: string[]) => call(() => http.post<LeadStatus[]>('/lead-statuses/reorder', { ids })),
  remove: (id: string, moveTo?: string) => call(() => http.delete<{ ok: true }>(`/lead-statuses/${id}${moveTo ? `?moveTo=${moveTo}` : ''}`)),
}
const qs = (o: Record<string, string | number | undefined>) => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => (v !== undefined && v !== '') && p.set(k, String(v))); const s = p.toString(); return s ? `?${s}` : '' }
export const leadsApi = {
  list: (f: { q?: string; statusId?: string; ownerId?: string; companyId?: string; archived?: string} = {}) => call(() => http.get<Lead[]>(`/leads${qs(f)}`)),
  get: (id: string) => call(() => http.get<{ lead: Lead; activities: Activity[]; threads: Thread[]; drafts: Draft[]; meetings: Meeting[] }>(`/leads/${id}`)),
  create: (d: LeadInput & { firstName: string }) => call(() => http.post<Lead>('/leads', d)),
  update: (id: string, d: LeadInput) => call(() => http.patch<Lead>(`/leads/${id}`, d)),
  /** Move in the pipeline; with a company the lead's deal moves (`dealId` picks one when the company has several). */
  move: (id: string, statusId: string, dealId?: string) => call(() => http.post<Lead>(`/leads/${id}/move`, { statusId, dealId })),
  archive: (id: string, archived: boolean) => call(() => http.post<Lead>(`/leads/${id}/archive`, { archived })),
  remove: (id: string) => call(() => http.delete<{ ok: true }>(`/leads/${id}`)),
  addNote: (id: string, text: string) => call(() => http.post<Activity>(`/leads/${id}/activities`, { text })),
  enrich: (id: string) => call(() => http.post<Lead>(`/leads/${id}/enrich`)),
  importFile: (file: File, dryRun: boolean) => { const f = new FormData(); f.append('file', file); return call(() => http.upload<ImportResult>(`/leads/import?dryRun=${dryRun}`, f)) },
}
export const companiesApi = {
  /** `kind`: 'supplier' = suppliers only, 'company' = everything else; omitted = both. */
  list: (q?: string, kind?: 'company' | 'supplier') => call(() => http.get<Company[]>(`/companies${qs({ q, kind })}`)),
  get: (id: string) => call(() => http.get<{ company: Company; deals: Deal[]; leads: Lead[]; threads: Thread[] }>(`/companies/${id}`)),
  create: (d: CompanyInput & { name: string }) => call(() => http.post<Company>('/companies', d)),
  update: (id: string, d: CompanyInput) => call(() => http.patch<Company>(`/companies/${id}`, d)),
  remove: (id: string) => call(() => http.delete<{ ok: true }>(`/companies/${id}`)),
  enrich: (id: string) => call(() => http.post<Company>(`/companies/${id}/enrich`)),
  checkDomain: (domain: string) => call(() => http.get<{ company: CompanySuggestion | null }>(`/companies/check-domain${qs({ domain })}`)),
  suggestions: (id: string) => call(() => http.get<{ leads: Lead[]; threads: Thread[] }>(`/companies/${id}/suggestions`)),
  acceptSuggestions: (id: string, d: { leadIds?: string[]; threadIds?: string[] }) => call(() => http.post<{ linked: number }>(`/companies/${id}/suggestions/accept`, d)),
}
export const dealsApi = {
  /** The deals view: deals that have leads, newest activity first. */
  list: (f: { q?: string; statusId?: string; ownerId?: string; archived?: string } = {}) => call(() => http.get<DealListItem[]>(`/deals${qs(f)}`)),
  /** Split: add another deal to a company. */
  create: (companyId: string, d: DealInput & { name: string; leadIds?: string[] }) => call(() => http.post<Deal>(`/companies/${companyId}/deals`, d)),
  update: (id: string, d: DealInput) => call(() => http.patch<Deal>(`/deals/${id}`, d)),
  setLeads: (id: string, leadIds: string[]) => call(() => http.put<Deal>(`/deals/${id}/leads`, { leadIds })),
  remove: (id: string) => call(() => http.delete<{ ok: true }>(`/deals/${id}`)),
}
export const googleApi = {
  config: () => call(() => http.get<GoogleConfig>('/google/oauth-config')),
  saveConfig: (d: { clientId: string; clientSecret?: string; redirectUri: string; pubsubTopic?: string | null }) => call(() => http.put<GoogleConfig>('/google/oauth-config', d)),
  connectUrl: () => call(() => http.get<{ url: string }>('/google/connect-url')),
  account: () => call(() => http.get<GoogleAccount | null>('/google/account')),
  disconnect: () => call(() => http.delete<{ ok: true }>('/google/account')),
  accounts: () => call(() => http.get<{ id: string; userId: string; email: string; status: string; lastSyncAt: string | null; lastError: string | null }[]>('/google/accounts')),
}
export interface SendInput { to: string[]; cc?: string[]; bcc?: string[]; subject: string; bodyText: string; threadId?: string; leadId?: string | null; trackOpens?: boolean; trackClicks?: boolean; /** Omitted = the sender's signature defaults. */ includeSignature?: boolean }
export const emailsApi = {
  threads: (f: { q?: string; filter?: string; leadId?: string; companyId?: string; before?: string; limit?: number } = {}) => call(() => http.get<Thread[]>(`/emails/threads${qs(f)}`)),
  remove: (threadId: string) => call(() => http.delete<{ ok: true }>(`/emails/threads/${threadId}`)),
  convert: (threadId: string) => call(() => http.post<Thread>(`/emails/threads/${threadId}/convert`)),
  thread: (id: string) => call(() => http.get<{ thread: Thread; messages: Message[] }>(`/emails/threads/${id}`)),
  messageHtml: (messageId: string) => call(() => http.get<{ id: string; bodyHtml: string }>(`/emails/messages/${messageId}/html`)),
  markRead: (id: string) => call(() => http.post<{ ok: true }>(`/emails/threads/${id}/read`)),
  unread: () => call(() => http.get<{ unread: number }>('/emails/unread')),
  send: (d: SendInput) => call(() => http.post<{ thread: Thread; message: Message }>('/emails/send', d)),
  reply: (threadId: string, d: Partial<SendInput> & { bodyText: string }) => call(() => http.post<{ thread: Thread; message: Message }>(`/emails/threads/${threadId}/reply`, d)),
  link: (threadId: string, leadId: string | null) => call(() => http.post<Thread>(`/emails/threads/${threadId}/link`, { leadId })),
  /** Link to an existing company (`companyId`) or to one by name (`companyName`: reused when it exists, created otherwise — with the sender's domain). */
  linkCompany: (threadId: string, target: { companyId: string } | { companyName: string }) => call(() => http.post<Thread>(`/emails/threads/${threadId}/link`, target)),
  /** Set the thread's peer as a supplier contact. Fails with code COMPANY_REQUIRED when the sender's company cannot be worked out (free-mail address). */
  setSupplier: (threadId: string, d: { companyId?: string; companyName?: string } = {}) => call(() => http.post<Thread>(`/emails/threads/${threadId}/supplier`, d)),
  archive: (threadId: string, archived: boolean) => call(() => http.post<Thread & { gmailSynced: boolean }>(`/emails/threads/${threadId}/archive`, { archived })),
  sync: () => call(() => http.post<{ imported: number }>('/emails/sync')),
  syncOlder: () => call(() => http.post<{ imported: number; scanned: number; hasMore: boolean; oldest: string | null }>('/emails/sync/older')),
}
export const draftsApi = {
  list: (f: { threadId?: string; leadId?: string; status?: string } = {}) => call(() => http.get<Draft[]>(`/drafts${qs(f)}`)),
  generate: (d: { threadId?: string; leadId?: string; kind: 'reply' | 'new' | 'follow_up'; instructions?: string }) => call(() => http.post<Draft>('/drafts/generate', d)),
  update: (id: string, d: { subject?: string; bodyText?: string }) => call(() => http.patch<Draft>(`/drafts/${id}`, d)),
  dismiss: (id: string) => call(() => http.post<Draft>(`/drafts/${id}/dismiss`)),
  send: (id: string, d: { to?: string[]; subject?: string; bodyText?: string } = {}) => call(() => http.post<{ thread: Thread; message: Message }>(`/drafts/${id}/send`, d)),
}
export const tasksApi = {
  list: (f: { status?: 'open' | 'done' | 'all'; leadId?: string; companyId?: string; threadId?: string; dueBefore?: string } = {}) => call(() => http.get<Task[]>(`/tasks${qs(f)}`)),
  openCount: (f: { threadId?: string; leadId?: string; companyId?: string }) => call(() => http.get<{ open: number }>(`/tasks/open-count${qs(f)}`)),
  create: (d: TaskInput & { title: string }) => call(() => http.post<Task>('/tasks', d)),
  update: (id: string, d: TaskInput) => call(() => http.patch<Task>(`/tasks/${id}`, d)),
  remove: (id: string) => call(() => http.delete<{ ok: true }>(`/tasks/${id}`)),
  suggest: (threadId: string) => call(() => http.post<{ title: string; summary: string; model: string }>('/tasks/suggest', { threadId })),
}
export const knowledgeApi = {
  list: () => call(() => http.get<{ sources: KnowledgeSource[]; stats: { sources: number; chunks: number; embeddingModel: string } }>('/knowledge/sources')),
  upload: (files: File[]) => { const f = new FormData(); files.forEach((x) => f.append('files', x)); return call(() => http.upload<KnowledgeSource[]>('/knowledge/upload', f)) },
  website: (url: string, crawl: boolean, depth: number) => call(() => http.post<KnowledgeSource>('/knowledge/website', { url, crawl, depth })),
  reindex: (id: string) => call(() => http.post<KnowledgeSource>(`/knowledge/sources/${id}/reindex`)),
  remove: (id: string) => call(() => http.delete<{ ok: true }>(`/knowledge/sources/${id}`)),
  search: (query: string) => call(() => http.post<Citation[]>('/knowledge/search', { query })),
}
export const calendarApi = {
  week: (from: string, to: string) => call(() => http.get<{ busy: { start: string; end: string; title?: string }[]; meetings: Meeting[] }>(`/calendar/week?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)),
  slots: (n = 3) => call(() => http.get<Slot[]>(`/calendar/slots?n=${n}`)),
  create: (d: { leadId?: string | null; title: string; start: string; end: string; attendees?: string[]; description?: string; meet?: boolean }) => call(() => http.post<Meeting>('/calendar/meetings', d)),
}
export const versionApi = { get: () => call(() => http.get<BuildInfo>('/version')) }
export const dashboardApi = { get: () => call(() => http.get<Dashboard>('/dashboard')) }
export const notificationsApi = {
  list: () => call(() => http.get<{ items: Notification[]; unread: number }>('/notifications')),
  markRead: (id: string) => call(() => http.patch<{ ok: true }>(`/notifications/${id}/read`)),
  markAllRead: () => call(() => http.post<{ ok: true }>('/notifications/read-all')),
}
export const trackingApi = { overview: (days = 30) => call(() => http.get<TrackingOverview>(`/tracking/overview?days=${days}`)) }
export const settingsApi = {
  ai: () => call(() => http.get<AiSettings>('/settings/ai')),
  saveAi: (d: { anthropicApiKey?: string; voyageApiKey?: string; draftModel?: string; enrichModel?: string }) => call(() => http.put<AiSettings>('/settings/ai', d)),
  workspace: () => call(() => http.get<{ autoCreateLeads: boolean; autoDraftReplies: boolean }>('/settings/workspace')),
  saveWorkspace: (d: { autoCreateLeads?: boolean; autoDraftReplies?: boolean }) => call(() => http.put<{ autoCreateLeads: boolean; autoDraftReplies: boolean }>('/settings/workspace', d)),
}
