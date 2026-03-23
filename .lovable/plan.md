

## Plan: Decouple Pipeline + Safe CSV Upsert

### Overview
Remove week-based filtering from Pipeline, make it show all deals permanently. CSV upload becomes an upsert that conservatively updates only: **status**, **prospect_owner**, **next_steps** (if changed), and appends new notes from the CSV description field.

### 1. Add `useAllDeals()` hook
**File: `src/hooks/useDeals.ts`**
- New hook that fetches all deals joined through `uploads` for the current user (no upload_id filter)
- Query: `deals` inner join `uploads` on `upload_id` where `uploads.user_id = auth.uid()`

### 2. Decouple Pipeline from week selector
**File: `src/pages/Pipeline.tsx`**
- Remove `WeekSelector` component and `selectedUploadId` state
- Switch from `useDealsForUpload(selectedUploadId)` to `useAllDeals()`
- Update query cache keys accordingly

### 3. Smart CSV upsert logic
**File: `src/components/CsvUpload.tsx`**

For each parsed CSV row, match against existing deals by `external_id` (primary) or `first_name + last_name + company` (fallback):

**If match found:**
- Update `status` and `prospect_owner` always
- Update `next_steps` only if the CSV value differs from the existing value
- If CSV `description` field is non-empty and differs from existing, insert it as a new `deal_note` with `note_type: 'note'` and `author: 'CSV Import'`
- All other fields (contacts, notes, transcripts, interactions, deal_value, etc.) are preserved untouched

**If new:** Insert as a full new deal row linked to the new upload record

### 4. Dashboard uses live data
**File: `src/pages/Dashboard.tsx`**
- Primary metrics computed from `useAllDeals()` (current pipeline state)
- Keep `WeekSelector` for WoW historical comparison against past upload snapshots

### Files modified
- `src/hooks/useDeals.ts` — add `useAllDeals()`
- `src/pages/Pipeline.tsx` — remove WeekSelector, use `useAllDeals()`
- `src/components/CsvUpload.tsx` — upsert logic with selective field updates + note creation
- `src/pages/Dashboard.tsx` — use `useAllDeals()` for primary metrics

### No database migration needed
Existing schema supports all changes.

