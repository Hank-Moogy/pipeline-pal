import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  User, Plus, Star, Mail, Phone, Briefcase, Linkedin, Loader2, Trash2, Pencil, Crown, Building2,
} from 'lucide-react';
import { toast } from 'sonner';

export interface DealContact {
  id: string;
  deal_id: string;
  is_champion: boolean;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
}

export function useDealContacts(dealId: string | null) {
  return useQuery({
    queryKey: ['deal_contacts', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const { data, error } = await supabase
        .from('deal_contacts')
        .select('*')
        .eq('deal_id', dealId)
        .order('is_champion', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as DealContact[];
    },
    enabled: !!dealId,
  });
}

const emptyContact = {
  first_name: '',
  last_name: '',
  job_title: '',
  email: '',
  phone: '',
  linkedin_url: '',
  company: '',
  notes: '',
  is_champion: false,
};

function ContactProfileDialog({
  contact,
  open,
  onClose,
}: {
  contact: DealContact;
  open: boolean;
  onClose: () => void;
}) {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {name}
            {contact.is_champion && (
              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] gap-1">
                <Crown className="h-3 w-3" /> Champion
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {contact.job_title && (
            <InfoRow icon={Briefcase} label="Title" value={contact.job_title} />
          )}
          {contact.company && (
            <InfoRow icon={Building2} label="Company" value={contact.company} />
          )}
          {contact.email && (
            <InfoRow icon={Mail} label="Email" value={
              <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a>
            } />
          )}
          {contact.phone && (
            <InfoRow icon={Phone} label="Phone" value={
              <a href={`tel:${contact.phone}`} className="text-primary hover:underline">{contact.phone}</a>
            } />
          )}
          {contact.linkedin_url && (
            <InfoRow icon={Linkedin} label="LinkedIn" value={
              <a
                href={contact.linkedin_url.startsWith('http') ? contact.linkedin_url : `https://${contact.linkedin_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate block"
              >
                {contact.linkedin_url.replace(/https?:\/\/(www\.)?/, '')}
              </a>
            } />
          )}
          {contact.notes && (
            <>
              <Separator className="bg-border/30" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70 mb-1">Notes</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{contact.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{label}</p>
        <div className="text-sm text-foreground">{value}</div>
      </div>
    </div>
  );
}

function ContactFormDialog({
  open,
  onClose,
  dealId,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  dealId: string;
  existing?: DealContact | null;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(
    existing
      ? {
          first_name: existing.first_name || '',
          last_name: existing.last_name || '',
          job_title: existing.job_title || '',
          email: existing.email || '',
          phone: existing.phone || '',
          linkedin_url: existing.linkedin_url || '',
          company: existing.company || '',
          notes: existing.notes || '',
          is_champion: existing.is_champion,
        }
      : { ...emptyContact },
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.first_name.trim() && !form.last_name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        const { error } = await supabase
          .from('deal_contacts')
          .update({
            first_name: form.first_name.trim() || null,
            last_name: form.last_name.trim() || null,
            job_title: form.job_title.trim() || null,
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            linkedin_url: form.linkedin_url.trim() || null,
            company: form.company.trim() || null,
            notes: form.notes.trim() || null,
            is_champion: form.is_champion,
          })
          .eq('id', existing.id);
        if (error) throw error;
        toast.success('Contact updated');
      } else {
        // If setting as champion, unset others first
        if (form.is_champion) {
          await supabase
            .from('deal_contacts')
            .update({ is_champion: false })
            .eq('deal_id', dealId)
            .eq('is_champion', true);
        }
        const { error } = await supabase.from('deal_contacts').insert({
          deal_id: dealId,
          first_name: form.first_name.trim() || null,
          last_name: form.last_name.trim() || null,
          job_title: form.job_title.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          linkedin_url: form.linkedin_url.trim() || null,
          company: form.company.trim() || null,
          notes: form.notes.trim() || null,
          is_champion: form.is_champion,
        });
        if (error) throw error;
        toast.success('Contact added');
      }
      queryClient.invalidateQueries({ queryKey: ['deal_contacts', dealId] });
      onClose();
    } catch {
      toast.error('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="First name" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} className="bg-secondary/40 border-border/40" />
          <Input placeholder="Last name" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} className="bg-secondary/40 border-border/40" />
          <Input placeholder="Job title" value={form.job_title} onChange={(e) => set('job_title', e.target.value)} className="col-span-2 bg-secondary/40 border-border/40" />
          <Input placeholder="Company" value={form.company} onChange={(e) => set('company', e.target.value)} className="col-span-2 bg-secondary/40 border-border/40" />
          <Input placeholder="Email" value={form.email} onChange={(e) => set('email', e.target.value)} className="col-span-2 bg-secondary/40 border-border/40" />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="bg-secondary/40 border-border/40" />
          <Input placeholder="LinkedIn URL" value={form.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} className="bg-secondary/40 border-border/40" />
          <Input placeholder="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} className="col-span-2 bg-secondary/40 border-border/40" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={form.is_champion}
            onChange={(e) => set('is_champion', e.target.checked)}
            className="rounded border-border"
          />
          <Crown className="h-4 w-4 text-amber-500" />
          Set as Champion (main point of contact)
        </label>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {existing ? 'Save' : 'Add Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DealForContacts {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  company?: string | null;
  linkedin_url?: string | null;
}

export function DealContactsTab({ dealId, deal }: { dealId: string; deal?: DealForContacts | null }) {
  const queryClient = useQueryClient();
  const { data: contacts = [], isLoading } = useDealContacts(dealId);
  const [seeding, setSeeding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editContact, setEditContact] = useState<DealContact | null>(null);
  const [viewContact, setViewContact] = useState<DealContact | null>(null);

  // Auto-seed primary contact from deal fields when contacts list is empty
  useEffect(() => {
    if (isLoading || seeding || contacts.length > 0) return;
    if (!deal) return;
    const hasName = (deal.first_name?.trim() || deal.last_name?.trim());
    if (!hasName) return;
    setSeeding(true);
    supabase.from('deal_contacts').insert({
      deal_id: dealId,
      first_name: deal.first_name?.trim() || null,
      last_name: deal.last_name?.trim() || null,
      email: deal.email?.trim() || null,
      phone: deal.phone?.trim() || null,
      job_title: deal.job_title?.trim() || null,
      company: deal.company?.trim() || null,
      linkedin_url: deal.linkedin_url?.trim() || null,
      is_champion: true,
    }).then(({ error }) => {
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['deal_contacts', dealId] });
      }
      setSeeding(false);
    });
  }, [isLoading, contacts.length, deal, dealId, seeding, queryClient]);

  const handleSetChampion = async (contactId: string) => {
    // Unset all, then set this one
    await supabase.from('deal_contacts').update({ is_champion: false }).eq('deal_id', dealId);
    await supabase.from('deal_contacts').update({ is_champion: true }).eq('id', contactId);
    queryClient.invalidateQueries({ queryKey: ['deal_contacts', dealId] });
    toast.success('Champion updated');
  };

  const handleDelete = async (contactId: string) => {
    const { error } = await supabase.from('deal_contacts').delete().eq('id', contactId);
    if (error) {
      toast.error('Failed to delete');
    } else {
      queryClient.invalidateQueries({ queryKey: ['deal_contacts', dealId] });
      toast.success('Contact removed');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="space-y-2 pb-4 pr-1">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && contacts.length === 0 && (
            <p className="text-xs text-muted-foreground/60 py-10 text-center">No contacts yet — add one below</p>
          )}
          {contacts.map((c) => {
            const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unknown';
            return (
              <div
                key={c.id}
                className="rounded-lg border border-border/30 bg-secondary/50 p-3 space-y-1 hover:bg-secondary/70 transition-colors cursor-pointer group"
                onClick={() => setViewContact(c)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      c.is_champion ? 'bg-amber-500/15 text-amber-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      {c.is_champion ? <Crown className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">{name}</p>
                        {c.is_champion && (
                          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] px-1.5 h-4">
                            Champion
                          </Badge>
                        )}
                      </div>
                      {c.job_title && (
                        <p className="text-[11px] text-muted-foreground truncate">{c.job_title}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    {!c.is_champion && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Set as Champion" onClick={() => handleSetChampion(c.id)}>
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditContact(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {(c.email || c.phone) && (
                  <div className="flex items-center gap-3 pl-10 text-[11px] text-muted-foreground">
                    {c.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" /> {c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" /> {c.phone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border/40 pt-3">
        <Button size="sm" className="w-full gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Contact
        </Button>
      </div>

      {showAdd && (
        <ContactFormDialog open dealId={dealId} onClose={() => setShowAdd(false)} />
      )}
      {editContact && (
        <ContactFormDialog open dealId={dealId} existing={editContact} onClose={() => setEditContact(null)} />
      )}
      {viewContact && (
        <ContactProfileDialog contact={viewContact} open onClose={() => setViewContact(null)} />
      )}
    </div>
  );
}
