/** Mock data shared by all mockups. Shapes mirror the design-doc data model. */

export interface MockStatus { id: string; name: string; color: string; isWon?: boolean; isLost?: boolean }
export interface MockUser { id: string; name: string; email: string; role: 'admin' | 'member'; active: boolean; gmail?: string; calendar?: boolean; schedulingLink?: string }
export interface MockCompany { id: string; name: string; domain: string; industry: string; size: string; location: string; leads: number; enriched: boolean; description: string }
export interface MockLead { id: string; name: string; title: string; email: string; companyId: string; statusId: string; ownerId: string; score: number; source: string; lastActivity: string; enriched: boolean }
export interface MockMessage { id: string; from: string; to: string; direction: 'in' | 'out'; at: string; body: string; status?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced'; /** Inline image shown inside the body (mockup only). */ inlineImage?: boolean; attachments?: MockAttachment[] }
export interface MockAttachment { id: string; filename: string; mime: string; size: string; image?: boolean }
export interface MockThread { id: string; subject: string; leadId?: string; unread: boolean; lastAt: string; snippet: string; messages: MockMessage[]; hasDraft?: boolean }
export interface MockSource { id: string; type: 'document' | 'website'; title: string; status: 'pending' | 'processing' | 'ready' | 'failed'; chunks: number; updated: string }

export const statuses: MockStatus[] = [
  { id: 'new', name: 'New', color: '#64748b' },
  { id: 'contacted', name: 'Contacted', color: '#2563eb' },
  { id: 'qualified', name: 'Qualified', color: '#7c3aed' },
  { id: 'proposal', name: 'Proposal', color: '#d97706' },
  { id: 'won', name: 'Won', color: '#059669', isWon: true },
  { id: 'lost', name: 'Lost', color: '#dc2626', isLost: true },
]

export const users: MockUser[] = [
  { id: 'u1', name: 'Alex Morgan', email: 'alex@acme-demo.example', role: 'admin', active: true, gmail: 'alex@acme-demo.example', calendar: true, schedulingLink: 'https://cal.com/alex/30' },
  { id: 'u2', name: 'Maya Levi', email: 'maya@acme-demo.example', role: 'member', active: true, gmail: 'maya@acme-demo.example', calendar: true, schedulingLink: 'https://calendly.com/maya' },
  { id: 'u3', name: 'Tom Ben-David', email: 'tom@acme-demo.example', role: 'member', active: true },
  { id: 'u4', name: 'Noa Katz', email: 'noa@acme-demo.example', role: 'member', active: false, gmail: 'noa@acme-demo.example' },
]

export const companies: MockCompany[] = [
  { id: 'c1', name: 'Northwind Health', domain: 'northwind.health', industry: 'Healthcare', size: '200-500', location: 'Boston, US', leads: 3, enriched: true, description: 'Telehealth platform for regional clinics. Series B, ~320 employees. Recently expanded into patient-intake automation.' },
  { id: 'c2', name: 'Acme Logistics', domain: 'acmelogistics.com', industry: 'Logistics', size: '1000+', location: 'Rotterdam, NL', leads: 2, enriched: true, description: 'Freight forwarding and last-mile delivery across EU.' },
  { id: 'c3', name: 'Brightline Legal', domain: 'brightline.law', industry: 'Legal', size: '50-200', location: 'London, UK', leads: 1, enriched: false, description: '' },
  { id: 'c4', name: 'Pixelforge Studio', domain: 'pixelforge.io', industry: 'Design agency', size: '10-50', location: 'Berlin, DE', leads: 2, enriched: true, description: 'Product design studio serving fintech clients.' },
  { id: 'c5', name: 'Granite Bank', domain: 'granitebank.com', industry: 'Banking', size: '1000+', location: 'Zurich, CH', leads: 1, enriched: false, description: '' },
]

export const leads: MockLead[] = [
  { id: 'l1', name: 'Sarah Cohen', title: 'VP Customer Success', email: 'sarah@northwind.health', companyId: 'c1', statusId: 'proposal', ownerId: 'u1', score: 86, source: 'Website', lastActivity: '2h ago', enriched: true },
  { id: 'l2', name: 'David Park', title: 'Head of Operations', email: 'david.park@acmelogistics.com', companyId: 'c2', statusId: 'qualified', ownerId: 'u2', score: 72, source: 'Referral', lastActivity: '5h ago', enriched: true },
  { id: 'l3', name: 'Emma Wright', title: 'Managing Partner', email: 'emma@brightline.law', companyId: 'c3', statusId: 'new', ownerId: 'u3', score: 41, source: 'LinkedIn', lastActivity: '1d ago', enriched: false },
  { id: 'l4', name: 'Lukas Meyer', title: 'Founder', email: 'lukas@pixelforge.io', companyId: 'c4', statusId: 'contacted', ownerId: 'u2', score: 58, source: 'Inbound email', lastActivity: '3h ago', enriched: true },
  { id: 'l5', name: 'Anna Keller', title: 'Head of Digital', email: 'a.keller@granitebank.com', companyId: 'c5', statusId: 'new', ownerId: 'u1', score: 35, source: 'Event', lastActivity: '2d ago', enriched: false },
  { id: 'l6', name: 'James Liu', title: 'CTO', email: 'james@northwind.health', companyId: 'c1', statusId: 'qualified', ownerId: 'u1', score: 79, source: 'Website', lastActivity: '6h ago', enriched: true },
  { id: 'l7', name: 'Priya Nair', title: 'Procurement Lead', email: 'priya@acmelogistics.com', companyId: 'c2', statusId: 'won', ownerId: 'u2', score: 93, source: 'Referral', lastActivity: '1w ago', enriched: true },
  { id: 'l8', name: 'Marco Rossi', title: 'Design Director', email: 'marco@pixelforge.io', companyId: 'c4', statusId: 'lost', ownerId: 'u3', score: 20, source: 'Cold outreach', lastActivity: '3w ago', enriched: true },
  { id: 'l9', name: 'Rachel Gold', title: 'Clinic Director', email: 'rachel@northwind.health', companyId: 'c1', statusId: 'contacted', ownerId: 'u2', score: 64, source: 'Website', lastActivity: '1d ago', enriched: true },
]

export const threads: MockThread[] = [
  {
    id: 't1', subject: 'Re: Proposal for Northwind pilot', leadId: 'l1', unread: true, lastAt: '10:42', hasDraft: true,
    snippet: 'Thanks Alex — the pricing looks reasonable. Could you clarify the onboarding timeline and whether HIPAA...',
    messages: [
      { id: 'm1', from: 'alex@acme-demo.example', to: 'sarah@northwind.health', direction: 'out', at: 'Yesterday 16:05', status: 'opened', body: 'Hi Sarah,\n\nAttached is the proposal for the 3-clinic pilot we discussed. Pricing is per seat with a 20% pilot discount for the first 6 months.\n\nBest,\nAlex' },
      { id: 'm2', from: 'sarah@northwind.health', to: 'alex@acme-demo.example', direction: 'in', at: 'Today 10:42', inlineImage: true, attachments: [{ id: 'a1', filename: 'clinic-floorplan.png', mime: 'image/png', size: '412 KB', image: true }, { id: 'a2', filename: 'reception-photo.jpg', mime: 'image/jpeg', size: '1.2 MB', image: true }, { id: 'a3', filename: 'Northwind-requirements.pdf', mime: 'application/pdf', size: '86 KB' }, { id: 'a4', filename: 'agent-roster.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: '24 KB' }], body: 'Thanks Alex — the pricing looks reasonable. Could you clarify the onboarding timeline and whether HIPAA compliance documentation is available before legal review?\n\nSarah' },
    ],
  },
  {
    id: 't2', subject: 'Intro from Daniel — Acme Logistics', leadId: 'l2', unread: true, lastAt: '09:15', hasDraft: true,
    snippet: 'Hi Maya, Daniel suggested I reach out. We are evaluating tools for our EU support team...',
    messages: [{ id: 'm3', from: 'david.park@acmelogistics.com', to: 'maya@acme-demo.example', direction: 'in', at: 'Today 09:15', body: 'Hi Maya,\n\nDaniel suggested I reach out. We are evaluating tools for our EU support team (about 40 agents). Do you support Dutch and German?\n\nDavid' }],
  },
  {
    id: 't3', subject: 'Quick question about pricing tiers', leadId: 'l4', unread: false, lastAt: 'Yesterday',
    snippet: 'Is there a plan for agencies with multiple client workspaces?',
    messages: [{ id: 'm4', from: 'lukas@pixelforge.io', to: 'maya@acme-demo.example', direction: 'in', at: 'Yesterday 14:20', body: 'Is there a plan for agencies with multiple client workspaces?\n\nLukas' }],
  },
  {
    id: 't4', subject: 'Delivery Status Notification (Failure)', unread: false, lastAt: 'Mon',
    snippet: 'Address not found. Your message wasn\'t delivered to kate@oldcompany.com...',
    messages: [{ id: 'm5', from: 'mailer-daemon@googlemail.com', to: 'alex@acme-demo.example', direction: 'in', at: 'Mon 08:01', status: 'bounced', body: 'Address not found. Your message wasn\'t delivered to kate@oldcompany.com because the address couldn\'t be found.' }],
  },
  {
    id: 't5', subject: 'Follow-up: webinar recording', leadId: 'l9', unread: false, lastAt: 'Sun',
    snippet: 'Hi Rachel, here is the recording and the slides from last week\'s session...',
    messages: [{ id: 'm6', from: 'maya@acme-demo.example', to: 'rachel@northwind.health', direction: 'out', at: 'Sun 11:30', status: 'clicked', body: 'Hi Rachel, here is the recording and the slides from last week\'s session.\n\nMaya' }],
  },
]

export const sources: MockSource[] = [
  { id: 's1', type: 'document', title: 'Acme Demo Product Overview 2026.pdf', status: 'ready', chunks: 142, updated: '2d ago' },
  { id: 's2', type: 'document', title: 'Security & HIPAA whitepaper.pdf', status: 'ready', chunks: 88, updated: '2d ago' },
  { id: 's3', type: 'website', title: 'https://www.acme-demo.example/pricing', status: 'ready', chunks: 12, updated: '5h ago' },
  { id: 's4', type: 'website', title: 'https://www.acme-demo.example/docs', status: 'processing', chunks: 310, updated: 'now' },
  { id: 's5', type: 'document', title: 'Case study — Northwind pilot.docx', status: 'failed', chunks: 0, updated: '1h ago' },
  { id: 's6', type: 'document', title: 'Onboarding playbook.md', status: 'ready', chunks: 37, updated: '1w ago' },
]

export const draftReply = {
  subject: 'Re: Proposal for Northwind pilot',
  body: `Hi Sarah,

Great to hear the pricing works for you.

Onboarding timeline — a 3-clinic pilot typically takes 2 weeks: week 1 for SSO and intake-form configuration, week 2 for staff training and go-live. We can start the week after signature.

HIPAA — yes. I've attached our Security & HIPAA whitepaper, and we sign a BAA as part of the pilot agreement, so legal can review both in parallel.

Would Tuesday 14:00 or Thursday 10:00 (ET) work for a 30-minute walkthrough with your IT lead? You can also pick any slot here: https://cal.com/alex/30

Best,
Alex`,
  citations: [
    { source: 'Onboarding playbook.md', snippet: 'Standard pilot onboarding: 2 weeks. Week 1 SSO + intake forms; week 2 training and go-live.' },
    { source: 'Security & HIPAA whitepaper.pdf', snippet: 'Acme Demo signs a Business Associate Agreement (BAA) with all healthcare customers.' },
  ],
  confidence: 0.91,
}

export const notifications = [
  { id: 'n1', type: 'email', title: 'New reply from Sarah Cohen', body: 'Re: Proposal for Northwind pilot', at: '2m ago', read: false },
  { id: 'n2', type: 'draft', title: 'AI draft ready', body: 'Suggested reply for David Park (Acme Logistics)', at: '9m ago', read: false },
  { id: 'n3', type: 'enrich', title: 'Lead enriched', body: 'James Liu — CTO at Northwind Health', at: '1h ago', read: false },
  { id: 'n4', type: 'tracking', title: 'Email opened', body: 'Rachel Gold opened "Follow-up: webinar recording"', at: '3h ago', read: true },
  { id: 'n5', type: 'bounce', title: 'Email bounced', body: 'kate@oldcompany.com — address not found', at: 'Mon', read: true },
  { id: 'n6', type: 'meeting', title: 'Meeting booked', body: 'Sarah Cohen — Tue 14:00 ET', at: 'Mon', read: true },
]

export const byId = {
  company: (id: string) => companies.find((c) => c.id === id)!,
  lead: (id: string) => leads.find((l) => l.id === id)!,
  user: (id: string) => users.find((u) => u.id === id)!,
  status: (id: string) => statuses.find((s) => s.id === id)!,
}
