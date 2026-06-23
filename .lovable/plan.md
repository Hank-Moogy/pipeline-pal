Create a Word document at `/mnt/documents/Mago_LeadGen_Process.docx` explaining the current Lead Gen workflow, written for the growth team (non-technical, straightforward).

## Document outline

**Title:** How Mago's Lead Gen Works (and Why The Lists Beat Generic Outreach Tools)

1. **Why this is different** — short intro: most outreach tools query a static B2B database (Apollo/Lusha-style). Ours queries the live web through Exa's neural search, filtered by AI against a custom ICP, then enriched in layers. Result: leads are matched on *what the company actually does today*, not on a stale firmographic tag.

2. **Step 1 — Writing the ICP**
   - The ICP is a free-text description, not a checkbox form. Exa is a neural search engine, so it reads the ICP like a human would.
   - Precision matters: include vertical, company type, signals (recent projects, tech stack, hiring), geography, and exclusions. Vague ICPs return vague lists.
   - Example of a weak vs strong ICP.
   - Above the results, the full ICP query is shown (expandable) so the team can see exactly what was searched.

3. **Step 2 — Saving ICPs**
   - Any ICP can be saved and re-run later. Good for recurring searches (e.g. "EU animation studios hiring CG supervisors") without rewriting the prompt.

4. **Step 3 — How a search runs (and how duplicates are avoided)**
   - One search = 50 results from Exa (`category: company`, neural auto mode, with page highlights).
   - Two dedup passes:
     1. Within the batch: same URL collapsed.
     2. Against your history: any company URL or name already in `lead_candidates` is dropped before insert.
   - Only brand-new leads from this query are shown in the result table — never mixed with old pending leads.

5. **Step 4 — Exa free tier**
   - Exa free tier = $10 in credits, no expiry. A 50-result company search with highlights costs roughly $0.005–$0.025 depending on content, so we can run hundreds of searches before paying anything. Beyond that, paid tiers start at $49/mo. *(Will verify exact current Exa pricing via web search while writing.)*

6. **Step 5 — Lead enrichment (the AI pass)**
   - For each lead we click "Enrich", we run 3 parallel Exa searches: company overview, leadership/LinkedIn, recent news 2024-2025.
   - Gemini 2.5 Flash reads all of it and returns a structured profile: summary, company type, fit score (1-10), fit reasoning, pain points, tech stack, product hooks, decision-makers (champions), recent signals, region, headcount, funding stage, location.
   - This is why our scores are explainable — every score has a written reason tied to actual sourced research.

7. **Step 6 — Promoting to the pipeline**
   - Approved leads move into `deals` with all enrichment carried over (champions become contacts).
   - At this point the lead has *context* (why they fit) but usually no verified email.

8. **Step 7 — Contact enrichment cascade**
   - For each contact missing an email, we hit providers in order and stop at the first verified hit:
     1. **Apollo.io** — best for B2B people-match (LinkedIn URL or name+company+domain). Returns `verified` / `likely` / `guessed` status → confidence 0.95 / 0.7 / 0.5.
     2. **Hunter.io** — fallback when Apollo misses; uses domain + first/last name; returns a 0–100 score.
     3. (Findymail slot reserved for the future.)
   - Domain is inferred from the company name when not provided.
   - Every attempt is logged (`tried[]` with provider + reason) so we can see *why* a provider missed.
   - Stops at first hit → we don't burn credits on multiple providers for the same contact.

9. **Why our lists are better — one-paragraph summary**
   - Live web search (not a stale DB) + custom ICP read by AI + AI-scored fit with reasoning + multi-provider email cascade. Generic tools give you a filtered list of companies; we give you a list of companies *with the reason they fit and the people to contact*.

## Technical details (for reference, kept short at the end)

- Search: `supabase/functions/discover-leads/index.ts` — Exa `/search`, `numResults: 50`, dedup by URL + company against `lead_candidates`.
- Enrichment: `supabase/functions/enrich-lead/index.ts` — 3x Exa + Gemini 2.5 Flash tool-call.
- Email cascade: `supabase/functions/find-email-cascade/index.ts` — Apollo → Hunter, first-hit wins.

## Production

- Generated with `docx` npm package, Arial, plain professional styling (no purple gradients, matches Mago's clean aesthetic).
- After generation: convert each page to image, visually QA, fix anything broken, then deliver.
- Final file: `/mnt/documents/Mago_LeadGen_Process.docx` shown via `<presentation-artifact>`.

Length target: ~3–4 pages.