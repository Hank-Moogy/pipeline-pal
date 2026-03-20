import { useState, useMemo, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUploads, useDealsForUpload } from '@/hooks/useDeals';
import { WeekSelector } from '@/components/WeekSelector';
import { DealCard } from '@/components/DealCard';
import { DealDetailPanel } from '@/components/DealDetailPanel';
import type { Deal } from '@/components/DealCard';
import { Badge } from '@/components/ui/badge';
import { STAGE_ORDER } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, TrendingUp, BarChart3, Kanban, Search, Bot } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

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
  const queryClient = useQueryClient();
  const { data: uploads = [] } = useUploads();
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (uploads.length > 0 && !selectedUploadId) {
      setSelectedUploadId(uploads[0].id);
    }
  }, [uploads, selectedUploadId]);

  const { data: deals = [] } = useDealsForUpload(selectedUploadId);

  const filteredDeals = useMemo(() => {
    if (!search.trim()) return deals;
    const q = search.toLowerCase();
    return deals.filter((d) => {
      const name = [d.first_name, d.last_name].filter(Boolean).join(' ').toLowerCase();
      const company = (d.company || '').toLowerCase();
      return name.includes(q) || company.includes(q);
    });
  }, [deals, search]);

  const columns = useMemo(() => {
    const grouped: Record<string, typeof filteredDeals> = {};
    for (const stage of STAGE_ORDER) {
      grouped[stage] = [];
    }
    for (const deal of filteredDeals) {
      const status = deal.status || '';
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(deal);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => (b.deal_value || 0) - (a.deal_value || 0));
    }
    return grouped;
  }, [filteredDeals]);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { draggableId, destination } = result;
      if (!destination) return;

      const newStatus = destination.droppableId;
      const deal = deals.find((d) => d.id === draggableId);
      if (!deal || deal.status === newStatus) return;

      // Optimistic update
      queryClient.setQueryData(['deals', selectedUploadId], (old: typeof deals | undefined) =>
        (old || []).map((d) => (d.id === draggableId ? { ...d, status: newStatus } : d)),
      );

      const { error } = await supabase
        .from('deals')
        .update({ status: newStatus })
        .eq('id', draggableId);

      if (error) {
        toast.error('Failed to move deal');
        queryClient.invalidateQueries({ queryKey: ['deals', selectedUploadId] });
      } else {
        toast.success(`Moved to ${newStatus}`);
      }
    },
    [deals, selectedUploadId, queryClient],
  );

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
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-56 h-9 bg-secondary/60 border-border/40 text-sm placeholder:text-muted-foreground/60"
              />
            </div>
            <WeekSelector
              uploads={uploads}
              selected={selectedUploadId}
              onSelect={setSelectedUploadId}
              label="Week"
            />
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 p-4 sm:p-6 min-w-max">
            {STAGE_ORDER.map((stage) => {
              const stageDeals = columns[stage] || [];
              const totalValue = stageDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0);

              return (
                <Droppable droppableId={stage} key={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex w-72 shrink-0 flex-col rounded-xl border border-border/30 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-secondary/70 border-primary/30' : 'bg-secondary/40'
                      }`}
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
                      <div className="flex-1 px-2 pb-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                        <div className="space-y-2 min-h-[40px]">
                          {stageDeals.map((deal, index) => (
                            <Draggable key={deal.id} draggableId={deal.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={dragSnapshot.isDragging ? 'opacity-90 rotate-[1deg]' : ''}
                                >
                                  <DealCard deal={deal} onClick={setSelectedDeal} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {stageDeals.length === 0 && (
                            <div className="py-8 text-center text-xs text-muted-foreground/60">
                              No deals
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </div>
      </DragDropContext>

      <DealDetailPanel
        deal={selectedDeal}
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        uploadId={selectedUploadId}
      />
    </div>
  );
}
