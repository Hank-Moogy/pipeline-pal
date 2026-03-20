import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUploads, useDealsForUpload } from '@/hooks/useDeals';
import { WeekSelector } from '@/components/WeekSelector';
import { DealCard } from '@/components/DealCard';
import { DealDetailPanel } from '@/components/DealDetailPanel';
import type { Deal } from '@/components/DealCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { STAGE_ORDER } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { LogOut, TrendingUp, BarChart3, Kanban } from 'lucide-react';
import { Link } from 'react-router-dom';

const COLUMN_COLORS: Record<string, string> = {
  'Lead': 'bg-[hsl(210,80%,55%)]',
  'Prospect': 'bg-[hsl(200,70%,50%)]',
  'Email follow up': 'bg-[hsl(190,60%,45%)]',
  'Discovery Meeting': 'bg-[hsl(38,92%,50%)]',
  'Tech Qualification': 'bg-[hsl(32,85%,48%)]',
  'Design proposal': 'bg-[hsl(280,55%,55%)]',
  'Committed': 'bg-[hsl(142,60%,45%)]',
  'Closed-won': 'bg-[hsl(142,70%,35%)]',
  'Closed-lost': 'bg-destructive',
  'Recycle': 'bg-muted-foreground',
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function Pipeline() {
  const { signOut } = useAuth();
  const { data: uploads = [] } = useUploads();
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  useEffect(() => {
    if (uploads.length > 0 && !selectedUploadId) {
      setSelectedUploadId(uploads[0].id);
    }
  }, [uploads, selectedUploadId]);

  const { data: deals = [] } = useDealsForUpload(selectedUploadId);

  const columns = useMemo(() => {
    const grouped: Record<string, typeof deals> = {};
    for (const stage of STAGE_ORDER) {
      grouped[stage] = [];
    }
    for (const deal of deals) {
      const status = deal.status || '';
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(deal);
    }
    // Sort each column by deal_value descending
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => (b.deal_value || 0) - (a.deal_value || 0));
    }
    return grouped;
  }, [deals]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Deal Tracker</h1>
            <nav className="ml-6 flex items-center gap-1">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Button variant="secondary" size="sm" className="gap-1.5 pointer-events-none">
                <Kanban className="h-4 w-4" />
                Pipeline
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <WeekSelector
              uploads={uploads}
              selected={selectedUploadId}
              onSelect={setSelectedUploadId}
              label="Week"
            />
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 p-4 sm:p-6 min-w-max">
          {STAGE_ORDER.map((stage) => {
            const stageDeals = columns[stage] || [];
            const totalValue = stageDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0);

            return (
              <div
                key={stage}
                className="flex w-72 shrink-0 flex-col rounded-xl bg-secondary/40 border border-border/30"
              >
                {/* Column header */}
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${COLUMN_COLORS[stage] || 'bg-muted-foreground'}`} />
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                        {stage}
                      </h3>
                    </div>
                    <Badge variant="secondary" className="text-[11px] font-medium h-5 px-1.5">
                      {stageDeals.length}
                    </Badge>
                  </div>
                  {totalValue > 0 && (
                    <p className="text-[11px] text-muted-foreground pl-[18px]">
                      {fmtCurrency(totalValue)}
                    </p>
                  )}
                </div>

                {/* Cards */}
                <ScrollArea className="flex-1 px-2 pb-2" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                  <div className="space-y-2">
                      <DealCard key={deal.id} deal={deal} onClick={setSelectedDeal} />
                    ))}
                    {stageDeals.length === 0 && (
                      <div className="py-8 text-center text-xs text-muted-foreground/60">
                        No deals
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
