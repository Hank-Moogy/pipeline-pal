

## Plan: Quote Generator with Shared Pricing Config

### Key Change from Previous Plan
`quote_settings` becomes a **single shared pricing table** — one row of pricing data used by all users, not per-user configs. Any authenticated user can read it; only admins (or any authenticated user, depending on preference) can edit prices.

### Database

**Table: `quote_settings`**
- `id` (uuid, PK), `pricing` (jsonb), `updated_at` (timestamptz), `updated_by` (uuid, nullable)
- Single row containing all unit prices (hosting, licenses, credits, support, services, custom dev)
- RLS: all authenticated can SELECT; all authenticated can UPDATE (team-shared config)

**Table: `quotes`**
- `id`, `created_by` (uuid), `last_edited_by` (uuid), `deal_id` (nullable)
- `quote_number`, `version` (int, default 1), `parent_quote_id` (uuid, self-ref)
- `company_name`, `contact_person`, `contact_email`
- `status` (draft/sent/accepted/rejected), `hosting_model`
- `line_items` (jsonb snapshot), `total_arr`, `total_onetime`, `total_year1`
- `contract_discount`, `valid_until`, `notes`, `created_at`, `updated_at`
- RLS: all authenticated can CRUD (team-wide)

### Quote Settings as Shared Price List

The settings page is a single editable price table — not scoped per user. When any team member updates a price, it applies to all future quotes. Existing quotes retain their `line_items` snapshot so historical pricing is preserved.

Default pricing seeded on first load from constants:

```text
Hosting: SaaS €0, Customer Cloud €0, On-prem €15,000 installation
Licenses: Studio €1,800/user/yr, Enterprise TBD
Credits: Starter 10k/€10, Creator 30k/€28, Production 90k/€77
Support: Standard €0, Extended €5,000, Dedicated TAM €20,000
Services: Discovery €5,000, LoRa €1,000/day, Training Std €500, Adv €800, On-site €1,000, DevOps €1,000, Additional €500
Custom Dev: Low €2,000, Medium €5,000, High €15,000
```

### Pages & Routes

1. `/quotes` — list all quotes, showing creator/editor names, status, totals
2. `/quotes/new` (and `/quotes/:id/edit`) — builder form pulling prices from shared settings
3. `/quotes/:id` — detail view with version history
4. `/quotes/settings` — shared pricing config (single editable table)

### Version History
- New quote: version=1, parent_quote_id=NULL
- "Create New Version": inserts new row with incremented version, same parent_quote_id
- Quote list groups by parent, shows latest; expandable to see all versions

### Files
- **New**: `src/pages/Quotes.tsx`, `src/pages/QuoteBuilder.tsx`, `src/pages/QuoteDetail.tsx`, `src/pages/QuoteSettings.tsx`
- **New**: `src/hooks/useQuotes.ts`, `src/lib/quote-defaults.ts`, `src/lib/quote-pdf.ts`
- **Modify**: `src/App.tsx` (routes), `src/components/AppSidebar.tsx` (nav), `src/components/DealDetailPanel.tsx` ("Create Quote" button)
- **Migration**: create `quotes` and `quote_settings` tables with RLS

### Creator/Editor Display
- `created_by` and `last_edited_by` resolve to `profiles.display_name` via joins
- Shown in quote list and detail views

