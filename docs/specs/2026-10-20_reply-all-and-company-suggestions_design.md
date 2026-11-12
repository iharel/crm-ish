# Reply all & company suggestions by domain — design (2026-10-20)

## 1. Reply all
**Why:** replies today go to the last sender only; multi-party threads lose the other recipients.
**What:** a "Reply all" button in the reading header and in the thread context menu. Recipients come from the latest inbound message (or the latest message when the thread has only outbound mail): **To** = its sender; **Cc** = its To + Cc minus the user's own Gmail address and the sender, de-duplicated by address. `ComposeModal` gains a `cc` prop and a "Reply all" title. Sending reuses the existing reply endpoint (already accepts `cc`).

## 2. Company suggestions by email domain
**Why:** inbound mail and leads often match an existing company by their email domain but stay unlinked when the sender is not yet a lead. Linking should be a one-click confirmation, not a search.
**What:**
- `companyManager.suggestForEmail(email)`: ignores free-mail domains; matches a company whose `domain` equals the email domain or a parent of it (`mail.acme.com` → `acme.com`), or whose website host matches. Returns `{ id, name, domain }`.
- **Threads**: `ThreadDto.suggestedCompany` when the thread has no company and its counterpart matches. Inbox list shows a dashed "Acme Corp?" chip; the reading header's generic "Link to company" becomes "Link to Acme Corp"; the right panel shows a suggestion box with "Link" and "Choose another". Accepting uses the existing link endpoint with `companyId` (creates the lead if needed).
- **Leads**: `LeadDto.suggestedCompany` when the lead has no company and its email matches. Lead detail "Company" card offers "Link to Acme Corp".
- **Company page**: `GET /companies/:id/suggestions` → leads (no company, matching domain) and the user's threads (no company, matching counterpart). `POST /companies/:id/suggestions/accept { leadIds?, threadIds? }` links them in bulk. A "Suggested" card lists them with per-row and "Link all" actions.
- Suggestion only: nothing is linked automatically (owner expectation: *suggest*). Existing auto-creation (`autoCreateLeads`) is unchanged.

## Decisions
- Matching is domain-based only (no fuzzy name matching) to keep suggestions trustworthy.
- Parent-domain matching stops at the registrable domain heuristically: the last two labels (three when the second-level label is a known public suffix such as `co`, `com`, `org`, `ac`, `gov`).
- No schema change.
