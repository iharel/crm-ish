# Email signature — design (2026-10-20)

## Why
Reps type their sign-off by hand in every email, so it comes out inconsistent and sometimes missing. Sent AI drafts don't have one at all.

## What
- **Settings → Signature** tab: a plain-text editor with a live preview, plus two toggles:
  - **Add to new emails**, off by default.
  - **Add to replies**, on by default. This also covers AI drafts that get sent.
- **Compose window:**
  - Shows a muted preview of the signature under the body, with a per-email on/off toggle and an **Edit** link.
  - When the user has no signature, it shows an "Add one in Settings" link instead.
- The signature is appended **server-side at send time** and is never inserted into the textarea:
  - Text body gets `\n\n-- \n<text>`.
  - HTML body gets an escaped `<div class="looper-signature">` with clickable links and email addresses.
  - It is added before the click-tracking rewrite, so links in the signature are tracked as well.

## Decisions
- **No schema change.** Stored in the existing `settings` table under the key `signature:<userId>` as JSON `{text, enabled, onReplies}`.
- **Plain text only** in v1, max 2000 characters. There is no rich-text or image editor, which keeps sanitizing simple.
- **Precedence:**
  1. An explicit `includeSignature` sent from compose wins.
  2. Otherwise the reply/new default applies.
  3. An empty signature is never added.
- **API:**
  - `GET /auth/signature` and `PUT /auth/signature` (authenticated, scoped to the current user).
  - `includeSignature?: boolean` added to the send and reply endpoints.
- **Layers:**
  - Router (zod) → `authController` → `signatureManager` → `settingsRepository`.
  - `emailManager.send` calls `signatureManager.applies` and `signatureManager.render`.
