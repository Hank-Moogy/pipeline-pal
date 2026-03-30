

## Generate Pricing Catalog PDF from Quote Settings

Add a "Download PDF" button to the Quote Settings page that generates a clean, branded PDF summarizing all service categories with their prices and quantities.

### What it will produce

A single PDF document with the Mago logo and company address header, followed by sections for each pricing category:

- **Hosting** — model name, annual fee, installation fee
- **Licenses** — type, price/user/year, credits/year
- **Credit Packs** — tier, credits per pack, price per pack
- **Support & SLA** — tier, annual price
- **Professional Services** — service name, unit, price
- **Custom Development** — effort level, price, description

### Technical changes

**File: `src/pages/QuoteSettings.tsx`**
- Add a "Download PDF" button next to "Save Changes"
- Import and call a new `generatePricingCatalogPdf` function on click, passing the current `pricing` state

**File: `src/lib/quote-pdf.ts`**
- Add a new exported function `generatePricingCatalogPdf(pricing: PricingConfig)`
- Reuse the same logo + company address header pattern from `generateQuotePdf`
- Render each category as a titled section with a simple two-column table (item | price)
- Use `formatEur` for all prices
- Output filename: `Mago-Pricing-Catalog.pdf`

Two files changed, ~80 lines added total.

