# Looper CRM — Product Requirements Document

## Problem
Sales conversations live in Gmail, lead state lives in spreadsheets, and company knowledge lives in people's heads. Replies are slow and inconsistent.

## Goal
One local-first workspace where the team tracks leads, companies and deals, reads and answers Gmail threads, gets AI-drafted replies grounded in its own documents, and sends documents for signature — with meeting scheduling and delivery tracking built in.

## Users
- **Admin** — sets up Google OAuth and the AI key, manages users, configures pipeline stages, uploads company knowledge.
- **Member** — owns leads, connects Gmail and Calendar, works the inbox, sends AI drafts and documents for signature.

## Main features

### Leads, companies and deals
- Leads with configurable pipeline stages, in Kanban and list views. Create, edit, archive and delete; right-click menus for the common actions.
- Companies have many leads, one or more email domains, a logo and their own page (deal, leads, tasks, AI insights, mail threads).
- A deal belongs to one company and carries a name, stage, owner, amount and expected close date. Every company starts with one deal and can be split into several.
- The pipeline stage lives on the deal, so all leads of a single-deal company move together.
- The Leads page switches between Leads and Deals.
- Import leads from CSV, TSV or Excel with a preview; existing emails are skipped and companies are matched automatically.
- AI enrichment fills in title, industry, size, a summary and social links.

### Suppliers
- A company can be marked as a supplier and shows in its own tab of the Companies page.
- A supplier has no deal by default, and its contacts stay out of the pipeline and dashboard numbers. A deal can still be added.
- AI reply drafts know when the other side is a supplier, so they do not pitch.

### Gmail inbox
- Each user connects their own Gmail account; mail syncs in near real time and stays private to that user.
- HTML mail is shown safely, with inline images, attachment thumbnails and downloads. Remote images load only on request.
- Tabs: Inbox, Threads, Sent, Unread, Unlinked, Archived, All.
- Send new emails, reply and reply all through the user's Gmail, with an optional per-user signature.
- Threads link to a company; a sender whose email domain matches a known company is suggested, never linked automatically.
- Archive syncs both ways with Gmail. Older Gmail history can be loaded on demand.
- Unknown senders become leads only when the user asks (automatic creation is an admin option).

### AI-suggested replies and knowledge
- Reply drafts are generated on request, grounded in the company's own knowledge, and cite their sources. Automatic drafting is an admin option.
- Knowledge: upload documents or scan website pages; each item shows its indexing status.

### Calendar and scheduling
- Each user connects Google Calendar and sets a scheduling link and working hours.
- The AI proposes meeting slots and books meetings.

### Email tracking
- Open, click and bounce events are shown per message and in the inbox list.

### Tasks
- Create a task from an email with an AI-suggested title and summary. Tasks link to the thread, lead and company, and are private to their creator.

### Document signing
- Send 1–10 PDFs as one signing request; signers get back one merged, signed PDF with a certificate page.
- Fields: signature (drawn or typed), initials, full name, date signed, text and checkbox. Each field belongs to one signer and is required or optional.
- Recipients are signers or copy recipients, picked from the company's contacts, team members or any typed email. Signing order is optional.
- Each recipient gets a private link and needs no account. An emailed 6-digit code before opening is optional. Consent to sign electronically is recorded.
- Reminders are set when sending, can be sent manually, and a request can have an expiry date.
- A signer can decline with a reason. The sender can void, duplicate or save a request as a template. A sent request cannot be edited.
- The activity record keeps time, IP and browser, plus a fingerprint of each original file and of the signed result.
- A request is visible to its sender and to admins; other users see only its status on the company page.
- This is a simple electronic signature with an audit trail, not a certificate-based digital signature.

### Dashboard
- Pipeline totals and win rate (counted by deal), mail awaiting a reply, and the hottest leads.

### General
- Email and password login with admin and member roles; admins manage users.
- Live updates and notifications without refreshing.
- Dark and light themes; resizable and collapsible panels.
- Hebrew and English content is shown in its own text direction; the interface itself is in English.

## Non-functional
- Local-first: data is stored in SQLite, with no cloud dependency except Google and the AI provider.
- API failures return a 4XX status with a structured error.
- Readable contrast in both themes.

## Success metrics
- Median time from inbound email to reply under 10 minutes with AI drafts.
- All inbound emails from known leads linked automatically.
- More than half of AI drafts sent with minor or no edits.
