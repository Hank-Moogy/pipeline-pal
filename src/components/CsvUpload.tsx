import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseCsvFile, ParsedDeal } from '@/lib/csv-parser';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export function CsvUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [weekLabel, setWeekLabel] = useState(() => {
    const d = new Date();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return monday.toISOString().split('T')[0];
  });
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const handleUpload = useCallback(async () => {
    if (!file || !user) return;
    setUploading(true);
    setDone(false);

    try {
      const parsedDeals = await parseCsvFile(file);

      // Create upload record (for historical tracking)
      const { data: upload, error: uploadError } = await supabase
        .from('uploads')
        .insert({
          user_id: user.id,
          week_label: weekLabel,
          file_name: file.name,
          record_count: parsedDeals.length,
        })
        .select()
        .single();

      if (uploadError) throw uploadError;

      // Fetch all existing deals for this user to match against
      const { data: allUserDeals, error: allDealsError } = await supabase
        .from('deals')
        .select('id, external_id, first_name, last_name, company, status, prospect_owner, next_steps, description, upload_id, uploads!inner(user_id)')
        .eq('uploads.user_id', user.id);

      if (allDealsError) throw allDealsError;

      // Build lookup maps for matching
      const byExternalId = new Map<string, typeof allUserDeals[0]>();
      const byNameCompany = new Map<string, typeof allUserDeals[0]>();

      for (const deal of (allUserDeals || [])) {
        if (deal.external_id) {
          byExternalId.set(deal.external_id, deal);
        }
        const key = `${(deal.first_name || '').toLowerCase()}|${(deal.last_name || '').toLowerCase()}|${(deal.company || '').toLowerCase()}`;
        if (key !== '||') {
          byNameCompany.set(key, deal);
        }
      }

      const newDeals: ParsedDeal[] = [];
      const updates: { dealId: string; changes: Record<string, unknown> }[] = [];
      const notesToInsert: { deal_id: string; content: string; author: string; note_type: string }[] = [];

      for (const parsed of parsedDeals) {
        // Match by external_id first, then by name+company
        const existing =
          (parsed.external_id && byExternalId.get(parsed.external_id)) ||
          byNameCompany.get(
            `${parsed.first_name.toLowerCase()}|${parsed.last_name.toLowerCase()}|${parsed.company.toLowerCase()}`
          );

        if (existing) {
          // Build conservative update: only status, prospect_owner, next_steps (if changed)
          const changes: Record<string, unknown> = {};

          if (parsed.status && parsed.status !== existing.status) {
            changes.status = parsed.status;
          }
          if (parsed.prospect_owner && parsed.prospect_owner !== existing.prospect_owner) {
            changes.prospect_owner = parsed.prospect_owner;
          }
          if (parsed.next_steps && parsed.next_steps !== (existing.next_steps || '')) {
            changes.next_steps = parsed.next_steps;
          }

          if (Object.keys(changes).length > 0) {
            updates.push({ dealId: existing.id, changes });
          }

          // If CSV has a description that differs from existing, add as a note
          if (parsed.description && parsed.description !== (existing.description || '')) {
            notesToInsert.push({
              deal_id: existing.id,
              content: parsed.description,
              author: 'CSV Import',
              note_type: 'note',
            });
          }
        } else {
          newDeals.push(parsed);
        }
      }

      // Execute updates
      for (const { dealId, changes } of updates) {
        const { error } = await supabase.from('deals').update(changes).eq('id', dealId);
        if (error) console.error('Update deal error:', error);
      }

      // Insert new notes
      if (notesToInsert.length > 0) {
        const { error } = await supabase.from('deal_notes').insert(notesToInsert);
        if (error) console.error('Insert notes error:', error);
      }

      // Insert new deals in batches of 100
      const BATCH = 100;
      for (let i = 0; i < newDeals.length; i += BATCH) {
        const batch = newDeals.slice(i, i + BATCH).map((d: ParsedDeal) => ({
          upload_id: upload.id,
          ...d,
        }));
        const { error } = await supabase.from('deals').insert(batch);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['all-deals'] });

      const updatedCount = updates.length;
      const newCount = newDeals.length;
      const notesCount = notesToInsert.length;

      setDone(true);
      toast({
        title: 'Upload complete',
        description: `${newCount} new, ${updatedCount} updated, ${notesCount} notes added`,
      });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [file, user, weekLabel, queryClient, toast]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Week starting</label>
        <Input
          type="date"
          value={weekLabel}
          onChange={(e) => setWeekLabel(e.target.value)}
          className="bg-secondary/50"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">CSV File</label>
        <div className="relative">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setDone(false); }}
            className="block w-full cursor-pointer rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary"
          />
        </div>
      </div>
      <Button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full font-semibold"
      >
        {uploading ? (
          <span className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Processing…
          </span>
        ) : done ? (
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Uploaded!
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload & Process
          </span>
        )}
      </Button>
    </div>
  );
}
