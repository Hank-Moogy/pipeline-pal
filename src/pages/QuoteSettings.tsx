import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, FileDown } from 'lucide-react';
import { generatePricingCatalogPdf } from '@/lib/quote-pdf';
import { useQuoteSettings, useUpdateQuoteSettings } from '@/hooks/useQuotes';
import { DEFAULT_PRICING, type PricingConfig } from '@/lib/quote-defaults';
import { toast } from 'sonner';

function PriceInput({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">€</span>
        <Input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value) || 0)}
          className="w-28 h-8 text-sm text-right"
        />
        {suffix && <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

export default function QuoteSettings() {
  const { data: settings, isLoading } = useQuoteSettings();
  const updateSettings = useUpdateQuoteSettings();
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);

  useEffect(() => {
    if (settings?.pricing) {
      setPricing(settings.pricing as unknown as PricingConfig);
    }
  }, [settings]);

  const update = (path: string[], value: number) => {
    setPricing(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(pricing);
      toast.success('Pricing updated');
    } catch {
      toast.error('Failed to save pricing');
    }
  };

  if (isLoading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quote Pricing Config</h1>
            <p className="text-sm text-muted-foreground">Shared pricing used for all new quotes</p>
          </div>
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Changes
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Hosting</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(pricing.hosting).map(([key, h]) => (
                <div key={key}>
                  <p className="text-xs font-medium text-muted-foreground mt-2 mb-1">{h.label}</p>
                  <PriceInput label="Annual" value={h.annual} onChange={v => update(['hosting', key, 'annual'], v)} suffix="/yr" />
                  <PriceInput label="Installation" value={h.installation} onChange={v => update(['hosting', key, 'installation'], v)} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Licenses</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(pricing.licenses).map(([key, l]) => (
                <div key={key}>
                  <p className="text-xs font-medium text-muted-foreground mt-2 mb-1">{l.label}</p>
                  <PriceInput label="Price/User/Year" value={l.price_per_user_year} onChange={v => update(['licenses', key, 'price_per_user_year'], v)} suffix="/user/yr" />
                  <PriceInput label="Credits/Year" value={l.credits_per_year} onChange={v => update(['licenses', key, 'credits_per_year'], v)} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Credit Packs</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(pricing.credits).map(([key, c]) => (
                <div key={key}>
                  <p className="text-xs font-medium text-muted-foreground mt-2 mb-1">{c.label}</p>
                  <PriceInput label="Credits" value={c.credits} onChange={v => update(['credits', key, 'credits'], v)} />
                  <PriceInput label="Price" value={c.price} onChange={v => update(['credits', key, 'price'], v)} suffix="/pack" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Support & SLA</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(pricing.support).map(([key, s]) => (
                <PriceInput key={key} label={s.label} value={s.annual} onChange={v => update(['support', key, 'annual'], v)} suffix="/yr" />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Professional Services</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(pricing.services).map(([key, s]) => (
                <PriceInput key={key} label={`${s.label} (${s.unit})`} value={s.price} onChange={v => update(['services', key, 'price'], v)} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Custom Development</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(pricing.custom_dev).map(([key, c]) => (
                <div key={key}>
                  <PriceInput label={c.label} value={c.price} onChange={v => update(['custom_dev', key, 'price'], v)} />
                  <p className="text-xs text-muted-foreground ml-1">{c.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
