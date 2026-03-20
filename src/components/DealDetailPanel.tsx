import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, User, DollarSign, Calendar, MapPin, Briefcase, FileText, AlertTriangle, MessageSquare, Send, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useNotesForDeal, useAddNote } from '@/hooks/useDeals';
import { toast } from 'sonner';
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
  const [newNote, setNewNote] = useState('');
  const { data: notes = [], isLoading: notesLoading } = useNotesForDeal(deal?.id ?? null);
  const addNote = useAddNote();

  if (!deal) return null;

  const name = [deal.first_name, deal.last_name].filter(Boolean).join(' ') || 'Unknown';

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await addNote.mutateAsync({ dealId: deal.id, content: newNote.trim() });
      setNewNote('');
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { onClose(); setNewNote(''); } }}>
      <SheetContent className="w-full sm:max-w-lg p-0 bg-background border-border/40 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-2 shrink-0">
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

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-1 pb-4">
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

            {/* Notes */}
            <Separator className="my-3 bg-border/30" />
            <div className="flex items-center gap-2 px-1">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Notes {notes.length > 0 && `(${notes.length})`}
              </p>
            </div>

            {notesLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : notes.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 py-4 text-center">No notes yet</p>
            ) : (
              <div className="space-y-3 pt-2">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-lg bg-secondary/50 border border-border/30 p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      {note.author && (
                        <span className="text-xs font-medium text-foreground">{note.author}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground/70 shrink-0">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Add note input — pinned to bottom */}
        <div className="shrink-0 border-t border-border/40 p-4 space-y-2 bg-background">
          <Textarea
            placeholder="Write a note…"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[72px] resize-none bg-secondary/40 border-border/40 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleAddNote();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/50">⌘ + Enter to send</span>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNote.trim() || addNote.isPending}
              className="gap-1.5"
            >
              {addNote.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Add Note
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
