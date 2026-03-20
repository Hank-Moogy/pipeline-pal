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
      const deals = await parseCsvFile(file);

      // Create upload record
      const { data: upload, error: uploadError } = await supabase
        .from('uploads')
        .insert({
          user_id: user.id,
          week_label: weekLabel,
          file_name: file.name,
          record_count: deals.length,
        })
        .select()
        .single();

      if (uploadError) throw uploadError;

      // Insert deals in batches of 100
      const BATCH = 100;
      for (let i = 0; i < deals.length; i += BATCH) {
        const batch = deals.slice(i, i + BATCH).map((d: ParsedDeal) => ({
          upload_id: upload.id,
          ...d,
        }));
        const { error } = await supabase.from('deals').insert(batch);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setDone(true);
      toast({ title: 'Upload complete', description: `${deals.length} deals imported for week ${weekLabel}` });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [file, user, weekLabel, queryClient, toast]);

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Upload Weekly CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}
