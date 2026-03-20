import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, User, DollarSign, Calendar, MapPin, Briefcase, FileText, AlertTriangle, MessageSquare, Send, Loader2, Info, Mail, Phone, Link2, ChevronDown } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useNotesForDeal, useAddNote, useUpdateDeal, useDistinctOwners } from '@/hooks/useDeals';
import { toast } from 'sonner';
import { getVerticalColors } from '@/lib/vertical-colors';
import type { Deal } from '@/components/DealCard';

interface Props {
  deal: Deal | null;
  open: boolean;
  onClose: () => void;
  uploadId?: string | null;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null) {
  if (!d) return null;
  try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
}

function Field({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value) return null;
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

function CollapsibleDescription({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  // Parse into paragraphs, clean up whitespace
  const paragraphs = text.split(/\n\s*\n|\n/).map(p => p.trim()).filter(Boolean);
  const preview = paragraphs[0] || '';
  const isLong = paragraphs.length > 1 || preview.length > 120;

  return (
    <div className="flex items-start gap-3 py-2.5">
      <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Description</p>
        <div className={`text-sm text-foreground leading-relaxed ${!open && isLong ? 'line-clamp-2' : ''}`}>
          {paragraphs.map((p, i) => (
            <p key={i} className={i > 0 ? 'mt-1.5' : ''}>{p}</p>
          ))}
        </div>
        {isLong && (
          <button
            onClick={() => setOpen(!open)}
            className="text-[11px] text-primary hover:underline mt-1 flex items-center gap-0.5"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            {open ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
}

function OwnerSelect({ deal, uploadId }: { deal: Deal; uploadId?: string | null }) {
  const { data: owners = [] } = useDistinctOwners(uploadId ?? null);
  const updateDeal = useUpdateDeal();

  const handleChange = async (value: string) => {
    try {
      await updateDeal.mutateAsync({ dealId: deal.id, updates: { prospect_owner: value } });
      toast.success('Owner updated');
    } catch {
      toast.error('Failed to update owner');
    }
  };

  return (
    <div className="flex items-start gap-3 py-2.5">
      <User className="h-4 w-4 mt-2.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70 mb-1">Prospect Owner</p>
        <Select value={deal.prospect_owner || undefined} onValueChange={handleChange}>
          <SelectTrigger className="h-8 text-sm bg-secondary/40 border-border/40">
            <SelectValue placeholder="Select owner…" />
          </SelectTrigger>
          <SelectContent>
            {owners.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function DetailsTab({ deal, uploadId }: { deal: Deal; uploadId?: string | null }) {
  const name = [deal.first_name, deal.last_name].filter(Boolean).join(' ') || 'Unknown';
  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 pb-6 pr-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">Contact</p>
        <Field icon={User} label="Name" value={name} />
        <Field icon={Briefcase} label="Job Title" value={deal.job_title} />
        <Field icon={Mail} label="Email" value={
          deal.email ? <a href={`mailto:${deal.email}`} className="text-primary hover:underline">{deal.email}</a> : null
        } />
        <Field icon={Phone} label="Phone" value={
          deal.phone ? <a href={`tel:${deal.phone}`} className="text-primary hover:underline">{deal.phone}</a> : null
        } />
        <Field icon={Link2} label="LinkedIn" value={
          deal.linkedin_url ? <a href={deal.linkedin_url.startsWith('http') ? deal.linkedin_url : `https://${deal.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">{deal.linkedin_url.replace(/https?:\/\/(www\.)?/, '')}</a> : null
        } />
        <Field icon={MapPin} label="Country" value={deal.country} />
        {deal.address && <Field label="Address" value={deal.address} />}
        {deal.description && <CollapsibleDescription text={deal.description} />}

        <Separator className="my-3 bg-border/30" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">Company</p>
        <Field icon={Building2} label="Company" value={deal.company} />
        <Field label="Vertical" value={
          deal.company_vertical ? (() => {
            const vc = getVerticalColors(deal.company_vertical);
            return (
              <Badge variant="outline" className={`text-[11px] font-medium ${vc.bg} ${vc.text} ${vc.border}`}>
                {deal.company_vertical}
              </Badge>
            );
          })() : null
        } />
        <Field label="Size" value={deal.company_size} />

        <Separator className="my-3 bg-border/30" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">Deal</p>
        <Field icon={DollarSign} label="Deal Value" value={deal.deal_value ? fmtCurrency(deal.deal_value) : null} />
        <Field label="Actual ACV" value={deal.actual_acv ? fmtCurrency(deal.actual_acv) : null} />
        <Field icon={Calendar} label="Last Interaction" value={fmtDate(deal.last_interaction)} />
        <Field label="Closed Date" value={fmtDate(deal.closed_date)} />
        <OwnerSelect deal={deal} uploadId={uploadId} />

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
    </ScrollArea>
  );
}

function NotesTab({ dealId }: { dealId: string }) {
  const [newNote, setNewNote] = useState('');
  const { data: notes = [], isLoading } = useNotesForDeal(dealId);
  const addNote = useAddNote();

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    try {
      await addNote.mutateAsync({ dealId, content: newNote.trim() });
      setNewNote('');
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="space-y-3 pb-4 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 py-10 text-center">No notes yet — add one below</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="rounded-lg bg-secondary/50 border border-border/30 p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  {note.author && <span className="text-xs font-medium text-foreground">{note.author}</span>}
                  <span className="text-[10px] text-muted-foreground/70 shrink-0">
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {note.content}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border/40 pt-3 space-y-2">
        <Textarea
          placeholder="Write a note…"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="min-h-[72px] resize-none bg-secondary/40 border-border/40 text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd(); }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/50">⌘ + Enter to send</span>
          <Button size="sm" onClick={handleAdd} disabled={!newNote.trim() || addNote.isPending} className="gap-1.5">
            {addNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Add Note
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DealDetailPanel({ deal, open, onClose, uploadId }: Props) {
  const { data: notes = [] } = useNotesForDeal(deal?.id ?? null);

  if (!deal) return null;
  const name = [deal.first_name, deal.last_name].filter(Boolean).join(' ') || 'Unknown';

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 bg-background border-border/40 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-3 shrink-0">
          <SheetTitle className="text-lg font-bold text-foreground">{deal.company || name}</SheetTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">{deal.status}</Badge>
            {deal.company_vertical && (() => {
              const vc = getVerticalColors(deal.company_vertical);
              return (
                <Badge variant="outline" className={`text-[11px] font-medium ${vc.bg} ${vc.text} ${vc.border}`}>
                  {deal.company_vertical}
                </Badge>
              );
            })()}
            {deal.company_size && (
              <Badge variant="outline" className="text-[11px] font-normal">{deal.company_size}</Badge>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0 px-6 pb-6">
          <TabsList className="w-full shrink-0 bg-secondary/50">
            <TabsTrigger value="details" className="flex-1 gap-1.5 text-xs">
              <Info className="h-3.5 w-3.5" />
              Details
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              Notes
              {notes.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">{notes.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="flex-1 mt-4 min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
            <DetailsTab deal={deal} uploadId={uploadId} />
          </TabsContent>
          <TabsContent value="notes" className="flex-1 mt-4 min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
            <NotesTab dealId={deal.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
