

## Plan: MCP Server Edge Function for Claude Desktop

Build a Supabase Edge Function that exposes your pipeline data as MCP tools, so your team can query deals, identify stale follow-ups, and get next-best-action recommendations directly from Claude Desktop.

### Architecture

```text
Claude Desktop ──► Edge Function (mcp-server) ──► Supabase DB
                   (Hono + mcp-lite)               (deals, deal_contacts,
                   Bearer token auth                 deal_interactions, deal_notes)
```

### MCP Tools Exposed

| Tool | Description |
|------|-------------|
| `get_pipeline_summary` | Status counts, total value, stale deal count, deals by owner |
| `get_stale_deals` | Deals with no interaction in N days (default 7), sorted by value |
| `get_deal_details` | Full context for a deal: contacts, notes, recent interactions |
| `suggest_next_actions` | Prioritized list of deals needing follow-up with reasoning |
| `search_deals` | Search by company name, owner, status, or vertical |

### Changes

**1. Create `supabase/functions/mcp-server/index.ts`**
- Hono router with mcp-lite `StreamableHttpTransport`
- Bearer token auth checked on every request against a secret (`MCP_AUTH_TOKEN`)
- Uses Supabase service role client to query `deals`, `deal_contacts`, `deal_interactions`, `deal_notes`
- 5 tools as described above

**2. Create `supabase/functions/mcp-server/deno.json`**
- Import map with `mcp-lite@^0.10.0` and Hono

**3. Add `MCP_AUTH_TOKEN` secret**
- Simple bearer token the team enters into Claude Desktop config
- Will prompt you to set this value

**4. Update `supabase/config.toml`**
- Add function config block for `mcp-server` with `verify_jwt = false` (uses its own bearer auth)

### Claude Desktop Setup (for your team)

Each team member adds this to their Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mago-pipeline": {
      "url": "https://sriynkhsyfrgmipldclg.supabase.co/functions/v1/mcp-server",
      "headers": {
        "Authorization": "Bearer <MCP_AUTH_TOKEN value>"
      }
    }
  }
}
```

### What You Can Ask Claude

Once connected, you can ask Claude things like:
- "What's the current status of our pipeline?"
- "Which deals haven't had any interaction in the last 2 weeks?"
- "What should I prioritize today?"
- "Tell me everything about the [Company X] deal"
- "Which deals does [Owner] have that are stale?"

