import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, User, Users, DollarSign, Calendar, MapPin, Briefcase, FileText, AlertTriangle, MessageSquare, Send, Loader2, Info, Mail, Phone, Link2, ChevronDown, Mic, Sparkles, Zap, RefreshCw, Plus, ArrowDownLeft, ArrowUpRight, PhoneCall, Video, StickyNote, Linkedin } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useNotesForDeal, useAddNote, useUpdateDeal, useDistinctOwners } from '@/hooks/useDeals';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getVerticalColors } from '@/lib/vertical-colors';
import { useGmailConnection } from '@/hooks/useGmailConnection';
import { useAuth } from '@/hooks/useAuth';
import type { Deal } from '@/components/DealCard';
import { DealContactsTab, useDealContacts } from '@/components/DealContactsTab';

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

const OWNER_OPTIONS = ['Alvaro', 'Andre', 'Samori'];

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

function EditableField({ icon: Icon, label, value, fieldName, dealId, type = 'text' }: {
  icon?: React.ElementType; label: string; value: string | number | null; fieldName: string; dealId: string; type?: 'text' | 'number';
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value ?? ''));
  const updateDeal = useUpdateDeal();

  // Sync when deal changes externally
  useEffect(() => {
    if (!editing) setVal(String(value ?? ''));
  }, [value, editing]);

  const handleSave = async () => {
    const parsed = type === 'number' ? (val.trim() ? Number(val) : null) : (val.trim() || null);
    try {
      await updateDeal.mutateAsync({ dealId, updates: { [fieldName]: parsed } });
      toast.success(`${label} updated`);
      setEditing(false);
    } catch {
      toast.error(`Failed to update ${label.toLowerCase()}`);
    }
  };

  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon ? <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" /> : <div className="w-4" />}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">{label}</p>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              value={val}
              onChange={(e) => setVal(e.target.value)}
              type={type}
              className="h-7 text-sm bg-secondary/40 border-border/40"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setVal(String(value ?? '')); setEditing(false); } }}
            />
            <Button size="sm" onClick={handleSave} disabled={updateDeal.isPending} className="h-7 text-xs px-2">
              {updateDeal.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setVal(String(value ?? '')); setEditing(false); }} className="h-7 text-xs px-2">✕</Button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="w-full text-left group/ef">
            <p className="text-sm text-foreground break-words">
              {value ?? <span className="text-muted-foreground/50 italic">Click to add…</span>}
            </p>
            <span className="text-[10px] text-muted-foreground/0 group-hover/ef:text-muted-foreground/40 transition-colors">Click to edit</span>
          </button>
        )}
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

function EditableNextSteps({ deal }: { deal: Deal }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(deal.next_steps || '');
  const updateDeal = useUpdateDeal();

  const handleSave = async () => {
    try {
      await updateDeal.mutateAsync({ dealId: deal.id, updates: { next_steps: value.trim() } });
      toast.success('Next steps updated');
      setEditing(false);
    } catch {
      toast.error('Failed to update');
    }
  };

  // Sync when deal changes
  if (!editing && value !== (deal.next_steps || '')) {
    setValue(deal.next_steps || '');
  }

  return (
    <div className="flex items-start gap-3 py-2.5">
      <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="min-h-[80px] resize-none bg-secondary/40 border-border/40 text-sm"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave(); }}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={updateDeal.isPending} className="h-7 text-xs gap-1">
                {updateDeal.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setValue(deal.next_steps || ''); setEditing(false); }} className="h-7 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full text-left group/ns"
          >
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {value || <span className="text-muted-foreground/50 italic">Click to add next steps…</span>}
            </p>
            <span className="text-[10px] text-muted-foreground/40 group-hover/ns:text-primary transition-colors">Click to edit</span>
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
  const navigate = useNavigate();
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

        <Separator className="my-3 bg-border/30" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">Next Steps</p>
        <EditableNextSteps deal={deal} />

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
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && notes.length === 0 && (
            <p className="text-xs text-muted-foreground/60 py-10 text-center">No notes yet — add one below</p>
          )}
          {!isLoading && notes.length > 0 && notes.map((note) => {
            const isTranscript = note.note_type === 'transcript';
            return (
              <div key={note.id} className={`rounded-lg border p-3 space-y-1.5 ${isTranscript ? 'bg-primary/5 border-primary/20' : 'bg-secondary/50 border-border/30'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isTranscript && <Mic className="h-3 w-3 text-primary" />}
                    {note.author && <span className="text-xs font-medium text-foreground">{note.author}</span>}
                    {isTranscript && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary">
                        Transcript
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 shrink-0">
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {note.content}
                </p>
              </div>
            );
          })}
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

const interactionIcons: Record<string, React.ElementType> = {
  email_sent: ArrowUpRight,
  email_received: ArrowDownLeft,
  call: PhoneCall,
  meeting: Video,
  note: StickyNote,
  linkedin: Linkedin,
};

const interactionLabels: Record<string, string> = {
  email_sent: 'Email Sent',
  email_received: 'Email Received',
  call: 'Call',
  meeting: 'Meeting',
  note: 'Note',
  linkedin: 'LinkedIn',
};

function TouchpointsTab({ dealId }: { dealId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isConnected, isCheckingConnection, connectedEmail, isSyncing, connectGmail, syncDealEmails } = useGmailConnection();
  const [showLogForm, setShowLogForm] = useState(false);
  const [logType, setLogType] = useState('note');
  const [logSubject, setLogSubject] = useState('');
  const [logBody, setLogBody] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  // Fetch deal_interactions
  const { data: interactions = [], isLoading: loadingInteractions } = useQuery({
    queryKey: ['deal-interactions', dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_interactions')
        .select('*')
        .eq('deal_id', dealId)
        .order('occurred_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch outreach_emails
  const { data: outreachEmails = [], isLoading: loadingOutreach } = useQuery({
    queryKey: ['outreach-emails', dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outreach_emails')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Auto-sync on mount if connected
  useEffect(() => {
    if (isConnected && dealId) {
      syncDealEmails(dealId);
    }
  }, [isConnected, dealId]);

  // Merge into unified timeline
  const timeline = [
    ...interactions.map((i) => ({
      id: i.id,
      type: i.interaction_type,
      subject: i.subject,
      body: i.body,
      date: i.occurred_at,
      source: i.source,
      contactEmail: i.contact_email,
    })),
    ...outreachEmails.map((e) => ({
      id: e.id,
      type: 'email_sent' as const,
      subject: e.subject,
      body: e.body,
      date: e.sent_at || e.created_at,
      source: 'outreach' as const,
      contactEmail: e.recipient_email,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isLoading = loadingInteractions || loadingOutreach;

  const handleLogInteraction = async () => {
    if (!user || !logBody.trim()) return;
    setIsLogging(true);
    try {
      const { error } = await supabase.from('deal_interactions').insert({
        deal_id: dealId,
        user_id: user.id,
        interaction_type: logType,
        subject: logSubject.trim() || null,
        body: logBody.trim(),
        source: 'manual',
        occurred_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Interaction logged');
      setLogSubject('');
      setLogBody('');
      setShowLogForm(false);
      queryClient.invalidateQueries({ queryKey: ['deal-interactions', dealId] });
    } catch {
      toast.error('Failed to log interaction');
    } finally {
      setIsLogging(false);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      {/* Gmail connection bar */}
      <div className="shrink-0 mb-3 space-y-2">
        {isCheckingConnection ? null : !isConnected ? (
          <Button size="sm" variant="outline" className="w-full gap-2 text-xs" onClick={connectGmail}>
            <Mail className="h-3.5 w-3.5" />
            Connect Gmail to sync emails
          </Button>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate">Connected: {connectedEmail}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 gap-1 text-[11px]"
              onClick={() => syncDealEmails(dealId)}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 text-xs"
            onClick={() => setShowLogForm(!showLogForm)}
          >
            <Plus className="h-3.5 w-3.5" />
            Log Interaction
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => navigate(`/agents/crm?dealId=${dealId}`)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Outreach
          </Button>
        </div>
      </div>

      {/* Log interaction form */}
      {showLogForm && (
        <div className="shrink-0 mb-3 rounded-lg border border-border/40 bg-secondary/30 p-3 space-y-2">
          <Select value={logType} onValueChange={setLogType}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="email_sent">Email Sent</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Subject (optional)"
            value={logSubject}
            onChange={(e) => setLogSubject(e.target.value)}
            className="h-8 text-xs"
          />
          <Textarea
            placeholder="Details…"
            value={logBody}
            onChange={(e) => setLogBody(e.target.value)}
            className="min-h-[60px] resize-none text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowLogForm(false)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleLogInteraction} disabled={isLogging || !logBody.trim()}>
              {isLogging && <Loader2 className="h-3 w-3 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 pb-4 pr-1">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && timeline.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <Mail className="h-8 w-8 mx-auto text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground/60">No touchpoints yet</p>
            </div>
          )}
          {!isLoading && timeline.map((item) => {
            const Icon = interactionIcons[item.type] || Mail;
            const label = interactionLabels[item.type] || item.type;
            const isGmail = item.source === 'gmail_sync';
            const isOutreach = item.source === 'outreach';

            return (
              <div key={item.id} className="rounded-lg border border-border/30 bg-secondary/30 p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium flex-1 truncate">{item.subject || label}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isGmail && <Badge variant="outline" className="text-[9px] h-4 px-1">Gmail</Badge>}
                    {isOutreach && <Badge variant="outline" className="text-[9px] h-4 px-1">Outreach</Badge>}
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                {item.body && (
                  <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{item.body}</p>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export function DealDetailPanel({ deal, open, onClose, uploadId }: Props) {
  const navigate = useNavigate();
  const { data: notes = [] } = useNotesForDeal(deal?.id ?? null);
  const { data: contacts = [] } = useDealContacts(deal?.id ?? null);
  const { data: emails = [] } = useQuery({
    queryKey: ['outreach-emails-count', deal?.id],
    queryFn: async () => {
      if (!deal) return [];
      const { data, error } = await supabase
        .from('outreach_emails')
        .select('id')
        .eq('deal_id', deal.id);
      if (error) throw error;
      return data;
    },
    enabled: !!deal,
  });
  const { data: interactionsCount = [] } = useQuery({
    queryKey: ['deal-interactions-count', deal?.id],
    queryFn: async () => {
      if (!deal) return [];
      const { data, error } = await supabase
        .from('deal_interactions')
        .select('id')
        .eq('deal_id', deal.id);
      if (error) throw error;
      return data;
    },
    enabled: !!deal,
  });
  const touchpointCount = emails.length + interactionsCount.length;

  if (!deal) return null;
  const name = [deal.first_name, deal.last_name].filter(Boolean).join(' ') || 'Unknown';

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 bg-background border-border/40 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-3 shrink-0 space-y-3">
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
          <Button
            size="sm"
            className="w-full gap-2 text-xs bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-sm"
            onClick={() => navigate(`/agents/crm?dealId=${deal.id}`)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Outreach with AI
          </Button>
        </SheetHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0 px-6 pb-6">
          <TabsList className="w-full shrink-0 bg-secondary/50">
            <TabsTrigger value="details" className="flex-1 gap-1.5 text-xs">
              <Info className="h-3.5 w-3.5" />
              Details
            </TabsTrigger>
            <TabsTrigger value="people" className="flex-1 gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              People
              {contacts.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">{contacts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              Notes
              {notes.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">{notes.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="touchpoints" className="flex-1 gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5" />
              Touchpoints
              {touchpointCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">{touchpointCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="flex-1 mt-4 min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col outline-none focus:ring-0">
            <DetailsTab deal={deal} uploadId={uploadId} />
          </TabsContent>
          <TabsContent value="people" className="flex-1 mt-4 min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col outline-none focus:ring-0">
            <DealContactsTab dealId={deal.id} deal={deal} />
          </TabsContent>
          <TabsContent value="notes" className="flex-1 mt-4 min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col outline-none focus:ring-0">
            <NotesTab dealId={deal.id} />
          </TabsContent>
          <TabsContent value="touchpoints" className="flex-1 mt-4 min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col outline-none focus:ring-0">
            <TouchpointsTab dealId={deal.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
