

## Slack-to-Pipeline Transcript Sync

### How It Works

```text
Granola → Slack channel (#sales-transcripts)
                ↓
   Edge function: sync-slack-transcripts
     1. Fetch recent messages via Slack connector
     2. Use AI to extract: company, attendees, emails, summary
     3. Match against deals by: company name → contact name → contact email
     4. Save as deal_note (note_type='transcript')
     5. Track last-synced timestamp for dedup
                ↓
   Transcripts appear in deal detail panel Notes tab
```

### Matching Strategy (priority order)

1. **Exact company name** match against `deals.company`
2. **Fuzzy company name** match (normalized, case-insensitive)
3. **Contact name** match against `deals.first_name` / `deals.last_name`
4. **Contact email** match against `deals.email`
5. If no match → flag for manual assignment

### What Gets Built

| Action | File | Description |
|--------|------|-------------|
| Connect | Slack connector | Scopes: `channels:history`, `channels:read` |
| Create | `supabase/functions/sync-slack-transcripts/index.ts` | Reads Slack channel, AI-extracts structured data, matches to deals, inserts `deal_notes` |
| Modify | `src/pages/Pipeline.tsx` | Add "Sync Transcripts" button in header |
| Insert | `pg_cron` job | Auto-sync every 15 minutes |

### No Database Migration Needed

- `deal_notes` already has `note_type` and `granola_meeting_id` columns
- `agent_settings` exists for storing sync state

### Prerequisites

1. Connect the Slack connector to this project
2. You provide the Slack channel name/ID where Granola posts
3. Build the edge function + cron job + UI button

