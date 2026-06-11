## Remove the VFX/Animation ICP from Lead Gen

Strip all hardcoded VFX/Animation/Studio assumptions so Lead Gen works for any ICP, driven purely by the user's search query. No replacement ICP, no presets — just neutral defaults until ICP profiles are built later.

### Edge functions

**`discover-leads`**
- Delete `ICP_QUERIES` (12 VFX/animation queries) and `NEGATIVE_KEYWORDS` (Runway, Pika, etc.)
- Query Exa with the user's query only — no auto-appended ICP terms, no competitor filtering
- Keep dedup logic and `source: "exa_discovery"`

**`enrich-lead`**
- Replace VFX-specific system prompt with a neutral B2B lead analyst prompt (generic fit-scoring 1–10 based on the user's query context and recent signals)
- Exa queries become: `${companyName} company overview`, `${companyName} leadership team`, `${companyName} news 2024 2025` — no VFX/Houdini/Nuke terms
- Drop `studio_type` enum from the tool schema; replace with a free-string `company_type`
- Stop writing `studio_type` to the DB (column stays for backward compat, just unused)

**`generate-outreach`**
- Replace VFX/AI-video copywriter prompt with a generic B2B cold-outreach prompt (concise, personalized, peer tone, low-friction CTA)
- Drop `STUDIO TYPE` line from the context block

### Frontend

**`LeadFilters.tsx`**
- Remove the "Studio Type" filter section entirely
- Drop `studioType` from `LeadFilterValues` and `emptyFilters`

**`LeadGen.tsx`**
- Remove the `studioType` filter check in `filteredLeads`
- Stop reading `l.studio_type` when mapping discovered leads

**`LeadResultsTable.tsx`**
- Replace the `studio_type || vertical` cell with `vertical` only (or hide if both empty)
- Remove `studio_type` from the `LeadResult` type

### Database
- No schema change. `lead_candidates.studio_type` stays as a nullable column for older rows. Will be revisited when configurable ICP profiles land.

### Out of scope (deferred)
- ICP presets / configurable ICP profiles per user
- `agent_settings` row for ICP
- Renaming `studio_type` column

### Files touched
- `supabase/functions/discover-leads/index.ts`
- `supabase/functions/enrich-lead/index.ts`
- `supabase/functions/generate-outreach/index.ts`
- `src/components/agents/lead-gen/LeadFilters.tsx`
- `src/components/agents/lead-gen/LeadResultsTable.tsx`
- `src/pages/agents/LeadGen.tsx`
