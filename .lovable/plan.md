

## Remove Unmatched Transcript Logging

Currently, when a transcript doesn't match any deal, the edge function logs it with `console.log` and increments an `unmatched` counter. The change is to simply skip unmatched transcripts silently.

### Change

**File: `supabase/functions/sync-slack-transcripts/index.ts`**
- Remove the `console.log` line at line 304 that logs unmatched transcripts
- Remove the `unmatched` counter variable and its increment
- Remove `unmatched` from the response JSON
- Keep the `else` block empty or remove it entirely — just skip silently

This is a minimal change: unmatched transcripts will simply be ignored with no log output or tracking.

