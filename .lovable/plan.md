

## Make Base Credit Cost Configurable (Global)

The base credit rate (€10 per 10,000 credits) should be a global setting used by **all** quote types — standard quotes (credit pack pricing), enterprise contracts, and the production calculator.

### Changes

**1. `src/lib/quote-defaults.ts`**
- Add top-level `base_credit_price: number` (default: 10) and `base_credit_unit: number` (default: 10000) to `PricingConfig` (not nested under `production`)

**2. `src/pages/QuoteSettings.tsx`**
- Add a small "Base Credit Rate" card (or section at top) with two inputs: "Base Price (€)" and "Per Credits"

**3. `src/pages/QuoteBuilder.tsx`**
- Replace all hardcoded `(credits / 10000) * 10` with `(credits / cfg.base_credit_unit) * cfg.base_credit_price` in both standard quote credit pack calculations and production calculator cost

**4. `src/pages/QuoteDetail.tsx`**
- Same replacement for any credit cost display logic

3–4 files, ~20 lines changed.

