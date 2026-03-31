

## Extend MCP Server with Write Tools & Quote Access

### Current State
The MCP server (`supabase/functions/mcp-server/index.ts`) has 5 read-only tools covering pipeline summary, stale deals, deal details, next actions, and search. It uses bearer token auth via `MCP_AUTH_TOKEN`.

### New Tools to Add

**Tool 6: `update_deal_status`**
- Input: `deal_id` (or `company_name`), `new_status`, optional `lost_reason`
- Resolves deal by ID or company name, updates status (and `lost_reason` if closing as lost)
- Returns confirmation with old → new status

**Tool 7: `add_deal_note`**
- Input: `deal_id` (or `company_name`), `content`, optional `author`
- Inserts a new row into `deal_notes`
- Returns confirmation

**Tool 8: `add_interaction`**
- Input: `deal_id` (or `company_name`), `interaction_type` (email/call/meeting/other), `subject`, optional `body`, optional `contact_email`, optional `occurred_at`
- Inserts into `deal_interactions` (uses service role, sets a system user_id)
- Returns confirmation

**Tool 9: `get_deal_quotes`**
- Input: `deal_id` (or `company_name`)
- Queries `quotes` table filtering by `deal_id`
- Returns quote number, name, type, status, totals, valid_until, line items summary

### Implementation Details

**Single file change:** `supabase/functions/mcp-server/index.ts`

- Add a shared `resolveDeal(sb, { deal_id, company_name })` helper to avoid duplicating the lookup logic across tools
- Write tools use the service role key (already configured) so RLS isn't a blocker
- For `add_interaction`, we need a `user_id` — we'll use a "system" approach: query the first user from `profiles` or accept an optional `user_id` parameter
- No database changes needed — all tables and columns already exist

### Security Note
The MCP server already validates `MCP_AUTH_TOKEN` on every request, so write access is gated behind that shared secret. Only team members with the token in their Claude Desktop config can make changes.

### How Your Team Uses It
Your team connects Claude Desktop to this MCP server (same as today). They can now say things like:
- "Move the Acme deal to Negotiation"
- "Add a note to the Nike deal: they want a demo next Tuesday"
- "Log a call with Adidas about pricing concerns"
- "Show me all quotes for the BMW deal"

