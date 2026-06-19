## Change

In `supabase/functions/discover-leads/index.ts`, change `numResults: 20` → `numResults: 50` (line 56).

## Deduplication (already handled, no changes needed)

The function already dedupes results twice — bumping to 50 just feeds more candidates through the same filters:
1. **Within the batch** — results are deduped by normalized URL (lowercased, trailing slash stripped).
2. **Against existing leads** — each candidate is filtered out if its URL matches `lead_candidates.website` or its title matches `lead_candidates.company` for the current user.

So raising the limit cannot create duplicate `lead_candidates` rows — at worst Exa returns more overlap with what you already have and fewer net new leads get inserted. The returned/toasted count reflects only the newly inserted leads.

## Out of scope

No change to the discover-leads UI, the enrichment flow, or pagination — single Exa call, just with a larger `numResults`.