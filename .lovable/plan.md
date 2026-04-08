

## Agent-Native Architecture: API Keys, Audit Log & REST API

### What We're Building

Three things that turn Roxy into an agent-first platform:

1. **Agent API Keys** — Users create named API keys (e.g. "Claude Desktop", "n8n") with scoped permissions from Settings. Keys authenticate agents against a REST API.

2. **Audit Log** — Every action (from UI or API) is logged with who did it (human or agent), what they did, and when.

3. **REST API** — A new `api-v1` edge function exposing all current MCP tools as standard REST endpoints. The MCP server becomes a thin wrapper calling the same logic.

### Database Migration

Two new tables + RLS:

```sql
-- Agent API keys
CREATE TABLE public.agent_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,  -- first 8 chars for display (e.g. "roxy_a1b2...")
  scopes jsonb NOT NULL DEFAULT '["read"]',
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL,       -- 'human' or 'agent'
  actor_id uuid NOT NULL,         -- user_id or agent_key_id
  actor_label text,               -- display name or agent name
  action text NOT NULL,           -- 'deal.update', 'email.send', etc.
  resource_type text,
  resource_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

RLS: `agent_api_keys` — users can only manage their own keys. `audit_log` — all authenticated users can read, insert is open to authenticated (edge functions use service role).

### REST API Edge Function (`api-v1`)

A new Hono-based edge function that:
- Authenticates via `Authorization: Bearer <agent_api_key>` — looks up key hash in `agent_api_keys`, checks scopes
- Exposes endpoints mirroring every MCP tool:
  - `GET /deals` — list/search (scope: `read`)
  - `GET /deals/:id` — detail (scope: `read`)
  - `POST /deals/:id/notes` — add note (scope: `write`)
  - `POST /deals/:id/status` — update status (scope: `write`)
  - `POST /deals/:id/interactions` — log interaction (scope: `write`)
  - `GET /pipeline/summary` — pipeline stats (scope: `read`)
  - `GET /pipeline/stale` — stale deals (scope: `read`)
  - `GET /pipeline/actions` — suggested actions (scope: `read`)
  - `GET /deals/:id/quotes` — deal quotes (scope: `read`)
  - `POST /email/draft` — create draft (scope: `email`)
  - `POST /email/send` — send email (scope: `email`)
- Writes to `audit_log` on every call
- Updates `last_used_at` on the API key

### MCP Server Update

Update `mcp-server/index.ts` auth middleware to accept agent API keys in addition to the shared `MCP_AUTH_TOKEN` (backward compatible). Each tool handler will also write to `audit_log`.

### Settings UI: Agent Access Section

New section in `src/pages/Settings.tsx`:
- **Create Key** — form with agent name + scope checkboxes (Read, Write, Email)
- **Key List** — shows key prefix, agent name, scopes, last used, active/revoked status
- **Revoke** — toggle `is_active` to false
- The full key is shown only once on creation (we store a SHA-256 hash)

### Activity Feed

New component showing recent audit log entries — visible in Settings or as a standalone page. Shows "Claude updated Nike deal status" or "Samori added a note via UI".

### Implementation Order
1. Migration: create `agent_api_keys` and `audit_log` tables with RLS
2. Settings UI: Agent Access section (create/list/revoke keys)
3. `api-v1` edge function with key auth + audit logging
4. Update `mcp-server` to support agent key auth
5. Activity feed component in Settings

### Files Created/Modified
- 1 migration (2 tables + RLS + index)
- `supabase/functions/api-v1/index.ts` (new — ~300 lines)
- `supabase/functions/api-v1/deno.json` (new)
- `supabase/functions/mcp-server/index.ts` (update auth)
- `src/pages/Settings.tsx` (add Agent Access section)
- `src/hooks/useAgentKeys.ts` (new — CRUD for API keys)
- `src/components/AgentKeyManager.tsx` (new — UI component)
- `src/components/AuditFeed.tsx` (new — activity log display)

