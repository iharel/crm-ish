import { lazy, type LazyExoticComponent, type ComponentType } from 'react'

export interface MockupEntry {
  /** URL slug and copyable name, e.g. `leads-kanban`. */
  name: string
  title: string
  description: string
  group: 'Auth' | 'Leads' | 'Companies' | 'Email' | 'Knowledge' | 'Calendar' | 'Admin' | 'System'
  component: LazyExoticComponent<ComponentType>
}

/** registry — every mockup, lazy-loaded. `/design/index` lists these. */
export const mockups: MockupEntry[] = [
  { name: 'login', title: 'Login', description: 'Email/password sign-in with theme toggle.', group: 'Auth', component: lazy(() => import('./pages/LoginMockup')) },
  { name: 'dashboard', title: 'Dashboard', description: 'Pipeline KPIs, activity feed, inbox summary.', group: 'System', component: lazy(() => import('./pages/DashboardMockup')) },
  { name: 'leads-kanban', title: 'Leads — Kanban', description: 'Configurable status columns with drag cards.', group: 'Leads', component: lazy(() => import('./pages/LeadsKanbanMockup')) },
  { name: 'leads-list', title: 'Leads — List', description: 'Filterable dense table view.', group: 'Leads', component: lazy(() => import('./pages/LeadsListMockup')) },
  { name: 'lead-detail', title: 'Lead detail', description: 'Profile, enrichment, timeline, linked emails.', group: 'Leads', component: lazy(() => import('./pages/LeadDetailMockup')) },
  { name: 'lead-form', title: 'Lead create/edit', description: 'Modal form with company picker.', group: 'Leads', component: lazy(() => import('./pages/LeadFormMockup')) },
  { name: 'companies', title: 'Companies', description: 'Company list with lead counts and enrichment state.', group: 'Companies', component: lazy(() => import('./pages/CompaniesMockup')) },
  { name: 'suppliers', title: 'Suppliers', description: 'Suppliers tab of the Companies page: supplier companies, contacts and optional deal.', group: 'Companies', component: lazy(() => import('./pages/SuppliersMockup')) },
  { name: 'company-detail', title: 'Company detail', description: 'Profile, linked leads, enrichment, threads.', group: 'Companies', component: lazy(() => import('./pages/CompanyDetailMockup')) },
  { name: 'inbox', title: 'Inbox', description: 'Threads, reading pane, inline images & attachments, AI suggested reply.', group: 'Email', component: lazy(() => import('./pages/InboxMockup')) },
  { name: 'compose', title: 'Compose email', description: 'New email with AI assist and tracking.', group: 'Email', component: lazy(() => import('./pages/ComposeMockup')) },
  { name: 'tracking', title: 'Email tracking', description: 'Open/click/bounce analytics.', group: 'Email', component: lazy(() => import('./pages/TrackingMockup')) },
  { name: 'knowledge', title: 'Company knowledge', description: 'Documents & websites for RAG.', group: 'Knowledge', component: lazy(() => import('./pages/KnowledgeMockup')) },
  { name: 'calendar', title: 'Calendar & scheduling', description: 'Scheduling link, Google Calendar, meetings.', group: 'Calendar', component: lazy(() => import('./pages/CalendarMockup')) },
  { name: 'admin-users', title: 'Admin — Users', description: 'User CRUD and roles.', group: 'Admin', component: lazy(() => import('./pages/AdminUsersMockup')) },
  { name: 'admin-integrations', title: 'Admin — Integrations', description: 'Google OAuth client, LLM keys, connected accounts.', group: 'Admin', component: lazy(() => import('./pages/AdminIntegrationsMockup')) },
  { name: 'settings-statuses', title: 'Settings — Lead statuses', description: 'Configure pipeline stages.', group: 'Admin', component: lazy(() => import('./pages/SettingsStatusesMockup')) },
  { name: 'notifications', title: 'Notifications', description: 'Realtime notification center.', group: 'System', component: lazy(() => import('./pages/NotificationsMockup')) },
]
