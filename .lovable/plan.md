

# Intel Graph Engine Integration Plan

## Overview

Replace the mock lead generation with a real AI-powered discovery, enrichment, and outreach pipeline using Exa search API and Lovable AI (Gemini). This involves 3 new edge functions, database schema changes, and frontend updates.

## Prerequisites

**EXA_API_KEY** is required but not yet configured. Before implementation begins, you will be prompted to add this secret. Exa provides the web/company search capability. LOVABLE_API_KEY is already available.

---

## Step 1 — Database Migration

Add enrichment columns to `lead_candidates`:

| Column | Type | Purpose |
|---|---|---|
| `summary` | text | AI-generated company summary |
| `fit_score` | integer | 1-10 fit score |
| `fit_reason` | text | Why they scored this way |
| `pain_points` | text[] | Identified pain points |
| `tech_stack` | text[] | Known tools/tech |
| `product_hooks` | text[] | Angles to pitch |
| `champions` | jsonb | Key decision-makers found |
| `recent_signals` | text[] | News, funding, projects |
| `research_depth` | text | 'basic' or 'enriched' |
| `last_enriched_at` | timestamptz | When last enriched |
| `studio_type` | text | Animation, VFX, Post |
| `website` | text | Company website |
| `region` | text | US, EU, etc. |
| `employee_count` | text | Headcount range |
| `funding_stage` | text | Seed, A, B, etc. |
| `location` | text | City/country |

---

## Step 2 — Edge Function: `discover-leads`

New function at `supabase/functions/discover-leads/index.ts`.

- Accepts `{ query, userId }` from the frontend
- Calls Exa search API (`search` endpoint, `category: "company"`) with the user's query
- Also runs a set of pre-configured ICP discovery queries (from the spec) if the query matches certain patterns
- Deduplicates results against existing `lead_candidates` for this user (by company name + website)
- Inserts new leads into `lead_candidates` with `research_depth: 'basic'`, `status: 'pending'`
- Returns the inserted leads

Requires: `EXA_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 3 — Edge Function: `enrich-lead`

New function at `supabase/functions/enrich-lead/index.ts`.

4-phase pipeline per lead:
1. **Company search** (Exa): studio profile, tech stack, recent projects
2. **People search** (Exa): CTOs, Heads of Tech, VFX Supervisors
3. **News search** (Exa): recent projects, awards, AI adoption, funding
4. **AI analysis** (Gemini via Lovable AI): scores based on fit signals from the ICP spec, outputs structured data via tool calling

Accepts `{ leadId }` or `{ leadIds }` for bulk enrichment.
Updates `lead_candidates` row with all enrichment columns.

Requires: `EXA_API_KEY`, `LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 4 — Edge Function: `generate-outreach`

New function at `supabase/functions/generate-outreach/index.ts`.

- Accepts `{ leadId }` with enriched lead data
- Uses Lovable AI (Gemini) to generate personalized outreach email
- System prompt references VFX/animation pain points (render costs, deadline pressure, manual rotoscoping) and positions the product as pipeline acceleration
- Stores draft in `outreach_emails` table linked to the lead
- Returns the generated email

Requires: `LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 5 — Frontend: Replace Mock Search

**File: `src/pages/agents/LeadGen.tsx`**
- Replace `generateMockLeads()` call with `supabase.functions.invoke('discover-leads', { body: { query } })`
- Handle loading states and errors

**File: `src/lib/mock-leads.ts`**
- Keep as fallback but no longer imported in production flow

---

## Step 6 — Frontend: Update Results Table

**File: `src/components/agents/lead-gen/LeadResultsTable.tsx`**
- Add columns: Fit Score (color-coded badge), Studio Type, Region, Location
- Add "Enrich" button per row (calls `enrich-lead`) and bulk "Enrich Selected" button
- Add "Generate Outreach" action button on enriched leads
- Show champions as expandable tooltip/popover
- Show pain points and tech stack as small badges

**Update `LeadResult` interface** to include all new fields.

---

## Step 7 — Frontend: Update Filters

**File: `src/components/agents/lead-gen/LeadFilters.tsx`**
- Add filter sections: Studio Type (Animation/VFX/Post), Fit Score range (slider), Region (US/EU/Other)
- Wire filters to client-side filtering of results

---

## Execution Order

1. Request EXA_API_KEY secret from user
2. Run database migration (add columns)
3. Create `discover-leads` edge function
4. Create `enrich-lead` edge function
5. Create `generate-outreach` edge function
6. Update frontend (LeadGen page, results table, filters)
7. Remove mock lead dependency

