import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, User, DollarSign, Calendar, MapPin, Briefcase, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { Deal } from '@/components/DealCard';

interface Props {
  deal: Deal | null;
  open: boolean;
  onClose: () => void;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  try {
    return format(new Date(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

function Field({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value || value === '—') return null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
      {!Icon && <div className="w-4" />}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">{label}</p>
        <p className="text-sm text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

export function DealDetailPanel({ deal, open, onClose }: Props) {
  if (!deal) return null;

  const name = [deal.first_name, deal.last_name].filter(Boolean).join(' ') || 'Unknown';

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-background border-border/40">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-lg font-bold text-foreground">{deal.company || name}</SheetTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">{deal.status}</Badge>
            {deal.company_vertical && (
              <Badge variant="outline" className="text-[11px] font-normal">{deal.company_vertical}</Badge>
            )}
            {deal.company_size && (
              <Badge variant="outline" className="text-[11px] font-normal">{deal.company_size}</Badge>
            )}
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          {/* Contact */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">Contact</p>
          <Field icon={User} label="Name" value={name} />
          <Field icon={Briefcase} label="Job Title" value={deal.job_title} />
          <Field icon={MapPin} label="Country" value={deal.country} />

          <Separator className="my-3 bg-border/30" />

          {/* Company */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">Company</p>
          <Field icon={Building2} label="Company" value={deal.company} />
          <Field label="Vertical" value={deal.company_vertical} />
          <Field label="Size" value={deal.company_size} />

          <Separator className="my-3 bg-border/30" />

          {/* Financials */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">Deal</p>
          <Field icon={DollarSign} label="Deal Value" value={deal.deal_value ? fmtCurrency(deal.deal_value) : null} />
          <Field label="Actual ACV" value={deal.actual_acv ? fmtCurrency(deal.actual_acv) : null} />
          <Field icon={Calendar} label="Last Interaction" value={fmtDate(deal.last_interaction)} />
          <Field label="Closed Date" value={fmtDate(deal.closed_date)} />
          <Field label="Prospect Owner" value={deal.prospect_owner} />

          {deal.next_steps && (
            <>
              <Separator className="my-3 bg-border/30" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">Next Steps</p>
              <div className="flex items-start gap-3 py-2.5">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <p className="text-sm text-foreground leading-relaxed">{deal.next_steps}</p>
              </div>
            </>
          )}

          {deal.lost_reason && (
            <>
              <Separator className="my-3 bg-border/30" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">Lost Reason</p>
              <div className="flex items-start gap-3 py-2.5">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                <p className="text-sm text-destructive leading-relaxed">{deal.lost_reason}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
