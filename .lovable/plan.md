

## Granola Transcript Sync -- Implementation Plan

### What was found

I scanned your last 30 days of Granola meetings (7 meetings) against all deals in the database, matching on company name and contact name/email. Two matches were identified:

| Meeting | Date | Matched Deal | Match Reason |
|---|---|---|---|
| UGO NICOLAS and Samori Osei | Mar 20 | Ugo Nicolas @ Blump Studio (Discovery Meeting) | Name + email match |
| Mago Intro with Sam (Ben Sharp-Fox) | Mar 19 | James Thomas @ Prime Video & Amazon MGM Studios | Company domain match (amazon.com) |

5 meetings had no matching deal (Kinetyca, WeMake, Abdul Razaq, Calculator, Vĩ Hào Trần).

### Implementation Plan

#### Step 1: Add `note_type` column to `deal_notes`
- Add a `note_type` text column (default `'note'`) to distinguish regular notes from transcripts
- Values: `'note'` (default) or `'transcript'`

#### Step 2: Insert the two matched transcripts
- Insert the Blump Studio transcript into `deal_notes` for deal `7468f10a` with `note_type = 'transcript'`
- Insert the Amazon/Ben Sharp-Fox transcript into `deal_notes` for deal `b68eda24` with `note_type = 'transcript'`
- Author will be set to `'Granola'`, content will be the full transcript text

#### Step 3: Update the UI to show transcript vs note labels
- In the Notes tab of the deal detail panel, display a badge/label distinguishing "Note" from "Transcript"
- Style transcripts differently (e.g., different icon or color) so they're easy to identify
- Update the `useNotesForDeal` hook and types to include `note_type`

#### Step 4: Build the edge function for automated sync
- Create a `sync-granola-transcripts` edge function that:
  - Fetches recent Granola meetings via the MCP gateway
  - Matches meetings to deals by company name and contact name/email
  - Fetches transcripts for matched meetings
  - Inserts them as `note_type = 'transcript'` if not already synced
  - Tracks synced meeting IDs to avoid duplicates
- Schedule it to run twice daily via pg_cron or an external trigger

### Technical Details
- The `deal_notes` table needs a schema migration for the new `note_type` column
- The edge function will use the Granola connector gateway for authentication
- Duplicate prevention: store the Granola `meeting_id` in a new column or check by author + date to avoid re-importing

