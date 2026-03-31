

## Add "Production Calculator" Quote Type (Final)

### Iteration Rate Logic (Clarified)

The iteration rate represents additional rendering time needed due to re-renders/iterations. It adds more minutes of rendering based on shot difficulty:

- Simple → 70% more rendering time
- Medium → 80% more rendering time  
- Complex → 90% more rendering time

**Formula:**
```text
effective_render_seconds = base_length_seconds × (1 + iteration_rate)
rendering_credits = effective_render_seconds × credits_per_second × difficulty_multiplier
image_gen_credits = image_gen_count × (some configurable credit cost)
subtotal_credits = rendering_credits + image_gen_credits
total_credits = subtotal_credits × (1 + buffer_percent / 100)
total_cost = (total_credits / 10000) × 10 × (1 - credit_discount)
```

Example: 5 min (300s), Medium difficulty (1.5×, 80% iteration)
- Effective render time = 300 × 1.80 = 540s
- Rendering credits = 540 × 169 × 1.5 = 136,890
- + 20% buffer = 164,268 credits

### Technical changes (5 files)

**1. `src/lib/quote-defaults.ts`**
- Add `production` to `PricingConfig`: `credits_per_second` (169), `buffer_percent` (20), `difficulty` map with `multiplier` + `iteration_rate` per level
- Add `ProductionLineItems` type

**2. `src/pages/QuoteSettings.tsx`**
- Add "Production" card: base rate, buffer %, per-difficulty multiplier + iteration rate

**3. `src/pages/QuoteBuilder.tsx`**
- Add `production_calculator` quote type
- When selected: show production calculator card (length, shots, image gens, difficulty selector, read-only iteration rate display, credit discount)
- Keep description, services, custom dev, notes
- Live-calculated outputs showing effective render time, credits breakdown, and cost

**4. `src/pages/QuoteDetail.tsx`**
- Detect `production_calculator` → render production breakdown with effective render time, credits, buffer, cost

**5. `src/lib/quote-pdf.ts`**
- Handle `production_calculator`: description below title, production breakdown, services, total summary

No database changes needed.

