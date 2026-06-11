## Strip Mago-specific restrictions from the project

You don't need to rebuild anything. The Mago coupling is shallow — it lives in a handful of lines across 5 files plus one Google Cloud setting. Removing it takes one pass.

### What's actually locked to Mago

| # | Where | What it does | Fix |
|---|---|---|---|
| 1 | `src/pages/Auth.tsx` (lines 33–34) | Blocks sign-up/sign-in for any email not ending in `@mago.studio` | Delete the domain check. App becomes open to any email. |
| 2 | `src/components/DealDetailPanel.tsx` (line 47) — `OWNER_OPTIONS = ['Alvaro', 'Andre', 'Samori']` | Hardcoded owner dropdown | Replace with a configurable list (env var, settings table, or just a longer hardcoded list — your call). |
| 3 | `src/pages/Pipeline.tsx` (lines 243–245) | Same three owners hardcoded again in the filter dropdown | Same fix as #2, share one constant. |
| 4 | Gmail OAuth (Google Cloud Console, not code) | OAuth consent screen is set to "Internal" → restricts to mago.studio workspace users | Switch the consent screen to "External" in Google Cloud Console, or create a fresh OAuth app under your new account and swap `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` secrets. |

### What's cosmetic (rename when convenient, won't block anything)

- `src/components/AppSidebar.tsx` — "Mago Growth OS" brand label
- `src/pages/Auth.tsx` — "Mago Growth OS" title
- `src/lib/quote-pdf.ts` — `hello@mago.studio` footer, `/images/mago-logo.png`, "Mago-Pricing-Catalog.pdf" filename
- `src/components/DealDetailPanel.tsx` (lines 786–826) — interaction timeline colors emails from `@mago.studio` differently (blue vs amber). Just visual.
- `supabase/functions/mcp-server/index.ts` — MCP server name `"mago-pipeline"`
- Memory entries that reference Mago/owners (will be updated post-edit)

### What does NOT need rebuilding

- Database schema — no Mago-specific tables or columns
- RLS policies — already team-collaborative (`authenticated` role, no domain check)
- Edge functions — none gate on email domain
- Auth provider — standard Supabase email + (optionally) Google. Removing the domain check makes it generic.

### Recommended scope for the first pass

Two execution modes — pick one:

**A. Minimal "unlock" (5 min):** Remove items #1–#3 above. Leave branding/cosmetics as-is. You can immediately invite non-Mago users and assign deals to anyone.

**B. Full white-label (15 min):** A + rename brand string to something neutral (or take a `VITE_APP_NAME` env var), make owners configurable via a tiny `team_members` table or an `agent_settings` row, and remove the Mago email tinting in the interaction timeline.

### Out of scope (deferred)

- Replacing the quote PDF branding/logo (you'll want a new logo file)
- Migrating Gmail OAuth credentials (depends on whether you keep using the same Google Cloud project)
- Updating project memory entries — done after the code change lands

### Question before I write code

Do you want **A (minimal unlock)** or **B (full white-label with configurable owners)**?
