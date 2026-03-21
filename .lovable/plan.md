

# Gmail Integration + Unified Touchpoints Timeline

## Sync Strategy
- **On deal open**: auto-sync emails for that deal's contact email (~1-2s)
- **On app load**: background sync for all connected users' deals
- **Manual "Sync" button**: per-deal on-demand refresh
- Access tokens auto-refresh using the refresh token (tokens expire hourly, refresh is seamless)

## Implementation Steps

### 1. Store Secrets
Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as edge function secrets.

### 2. Database Migration
**`gmail_tokens`** — `id`, `user_id` (unique), `access_token`, `refresh_token`, `expires_at`, `email`, `created_at`, `updated_at`. RLS: `user_id = auth.uid()`.

**`deal_interactions`** — `id`, `deal_id` (FK deals), `user_id`, `interaction_type` (email_sent/email_received/call/meeting/note/linkedin), `subject`, `body`, `contact_email`, `occurred_at`, `source` (manual/gmail_sync/ai_generated), `external_id` (unique per user for dedup), `metadata` (jsonb), `created_at`. RLS: `user_id = auth.uid()`.

### 3. Edge Functions

**`gmail-auth`** — Returns Google OAuth URL with `gmail.readonly` scope, `access_type=offline`, `prompt=consent`. Uses `GOOGLE_CLIENT_ID`.

**`gmail-callback`** — Exchanges auth code for tokens, stores in `gmail_tokens`, redirects back to app.

**`sync-gmail`** — Accepts `dealId`. Reads user's token, refreshes if expired (using refresh token + Google's token endpoint), queries Gmail API with `from:{email} OR to:{email}`, inserts new `deal_interactions` deduped by `external_id`.

### 4. Frontend

**`useGmailConnection` hook** — checks `gmail_tokens` for current user, provides `isConnected`, `connectGmail()`, `syncDealEmails(dealId)`.

**App-load sync** — trigger background sync for user's deals when gmail is connected.

**Deal-open sync** — auto-call `syncDealEmails(dealId)` when Touchpoints tab is opened.

**TouchpointsTab redesign** — merge `deal_interactions` + `outreach_emails` into chronological timeline. Show "Connect Gmail" button (if not connected), "Sync" button + last-synced timestamp (if connected), and "Log Interaction" form (type, subject, body, date).

### 5. Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create `gmail_tokens` + `deal_interactions` |
| `supabase/functions/gmail-auth/index.ts` | Create |
| `supabase/functions/gmail-callback/index.ts` | Create |
| `supabase/functions/sync-gmail/index.ts` | Create |
| `src/hooks/useGmailConnection.ts` | Create |
| `src/components/DealDetailPanel.tsx` | Modify Touchpoints tab |

