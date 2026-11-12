# Tasks from email — design (2026-10-20) — schema APPROVED by owner 2026-10-20 (private to creator)

## Why
Emails often contain things to do ("send the quote", "book a demo", "check SSO support"). Today they live only in the user's head. A task list turns an email into a tracked item that links back to the thread and to the lead/company.

## What
| Area | Decision |
|---|---|
| Create | From the inbox: context menu **Create task…** and a button in the reading header. A modal opens pre-filled by AI (title + 1–3 sentence summary of what needs to be done, from the last inbound message and the thread) with a **Regenerate** button; the user edits and saves. Manual creation (no AI) from the Tasks page and from a lead/company page. |
| Fields | title, summary, status `open` / `done`, optional due date, assignee (defaults to creator), links: thread (optional), lead (optional), company (optional, auto-filled from the lead). |
| Tasks page | Sidebar entry **Tasks** (Work section). Filters: Open / Done / All, Mine / Everyone, due soon. Each row: checkbox (done), title, summary (clamped), chips linking to the email thread, lead and company, due date, assignee. Right-click: Open email · Open lead · Mark done · Delete. |
| Where else | Lead detail and company detail show the caller's open tasks in a small card with an Add button. Inbox reading header has a **Task** button with an open-count badge. (Dashboard stat deferred.) |
| Privacy | **Owner decision:** tasks are private to their creator (`created_by = caller` on every read/write). `assignee_id` is stored (defaults to creator) so tasks can be spread across the team later without a schema change. |
| AI | `POST /tasks/suggest { threadId }` → `{ title, summary }` via the draft model (Anthropic) with a stub fallback (subject + first sentence). No knowledge-base retrieval needed. |

## API
- `GET /tasks?status=open|done|all&mine=true&leadId&companyId&threadId`
- `POST /tasks { title, summary?, dueAt?, assigneeId?, threadId?, leadId?, companyId? }`
- `PATCH /tasks/:id { title?, summary?, status?, dueAt?, assigneeId? }`
- `DELETE /tasks/:id`
- `POST /tasks/suggest { threadId }`
- Socket `task:updated` for live refresh.

## Schema (new table — needs owner approval)
```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
  due_at TEXT,
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  thread_id TEXT REFERENCES email_threads(id) ON DELETE SET NULL,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_thread ON tasks(thread_id);
```
Migration file on approval: `backend/src/db/migrations/003_tasks.sql` (applied automatically by `dbAccessor.migrate()`).

## Implementation (2026-10-20)
- Migration `backend/src/db/migrations/003_tasks.sql` (indexes on owner+status+due, lead, company, thread).
- Backend: `repositories/taskRepository.ts`, `managers/taskManager.ts` (links resolved from thread → lead → company; AI suggestion via the draft model with stub fallback), `controllers/taskController.ts`, routes under `/tasks`, socket `task:updated` (to the owner only).
- Frontend: `components/tasks/TaskModal.tsx` (AI prefill + Regenerate when created from a thread), `TaskList.tsx` (checkbox, due badge, links, context menu), `TasksCard.tsx` (lead/company pages), `pages/TasksPage.tsx` (Open / Done / All), sidebar **Tasks**, inbox context-menu **Create task…** and header **Task** button.
- Due dates are stored as `YYYY-MM-DD` strings (no timezone); overdue / today / within 2 days get red / amber badges.
