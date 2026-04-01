

## Add Gmail Send & Draft Tools to MCP Server

### What This Does
Adds two new MCP tools so your team can send emails or create Gmail drafts directly from Claude, using the connected Gmail account's OAuth tokens.

### Prerequisites
1. **Upgrade Gmail OAuth scope** — The current integration only has `gmail.readonly`. You need to add `gmail.send` in your Google Cloud Console for the OAuth client, then update the code to request both scopes.
2. **Users must re-authenticate Gmail** — After the scope change, each user needs to reconnect Gmail to grant the new `gmail.send` permission.

### Changes

**1. `supabase/functions/gmail-auth/index.ts`**
- Change scope from `gmail.readonly` to `gmail.readonly gmail.send`

**2. `supabase/functions/mcp-server/index.ts`**
Add two new tools and a shared Gmail helper:

**Shared helper: `getGmailAccessToken(sb, userEmail?)`**
- Looks up `gmail_tokens` table (picks a token — either by email or first available)
- Refreshes if expired (same pattern as `sync-gmail`)
- Returns `{ accessToken, email }` or throws

**Tool 10: `draft_email`**
- Inputs: `deal_id` or `company_name`, `to` (email), `subject`, `body`, `user_email` (optional — to pick which Gmail account)
- Creates a draft in Gmail via `POST /gmail/v1/users/me/drafts` with a base64url-encoded RFC 2822 message
- Also logs the action as a `deal_interaction` with type `email_drafted`
- Returns: draft ID, subject, recipient

**Tool 11: `send_email`**
- Same inputs as `draft_email`
- Sends immediately via `POST /gmail/v1/users/me/messages/send`
- Logs as `deal_interaction` with type `email_sent`
- Returns: message ID, subject, recipient

Both tools construct the email with proper `From`, `To`, `Subject`, and `Content-Type: text/html` headers using the authenticated Gmail address.

### Security Notes
- MCP auth token gates all access (same as existing tools)
- Gmail tokens are retrieved server-side using service role — no credentials exposed
- The MCP server picks the Gmail token from the database, so it sends from whoever connected Gmail

### Usage from Claude
After implementation, your team can say:
- *"Draft a follow-up email to the Nike deal contact about next steps"*
- *"Send a quick check-in to the Adidas deal contact"*

Claude will use deal context to compose the email, then call `draft_email` or `send_email`.

### Files Modified
1. `supabase/functions/gmail-auth/index.ts` — add `gmail.send` scope
2. `supabase/functions/mcp-server/index.ts` — add helper + 2 tools (~80 lines)

