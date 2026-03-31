

## Fix MCP Server — Correct mcp-lite API Signature

### Root Cause
The `mcp-lite` library's `.tool()` method expects:
```typescript
mcpServer.tool("tool_name", { description, inputSchema, handler })
```
But the current code passes everything in a single object:
```typescript
mcpServer.tool({ name, description, inputSchema, handler })  // WRONG
```
This causes `inputSchema` to be undefined inside the library, crashing the function on boot.

### Fix
**Single file:** `supabase/functions/mcp-server/index.ts`

Change all 9 `mcpServer.tool()` calls from the single-object pattern to the positional pattern:

```typescript
// Before (broken)
mcpServer.tool({
  name: "get_pipeline_summary",
  description: "...",
  inputSchema: { ... },
  handler: async () => { ... },
});

// After (correct)
mcpServer.tool("get_pipeline_summary", {
  description: "...",
  inputSchema: { ... },
  handler: async () => { ... },
});
```

Apply this same change to all 9 tools:
1. `get_pipeline_summary`
2. `get_stale_deals`
3. `get_deal_details`
4. `suggest_next_actions`
5. `search_deals`
6. `update_deal_status`
7. `add_deal_note`
8. `add_interaction`
9. `get_deal_quotes`

No logic changes needed — just move the `name` field out of the options object and into the first argument position.

