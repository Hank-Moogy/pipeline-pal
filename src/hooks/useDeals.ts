import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UploadRecord {
  id: string;
  week_label: string;
  upload_date: string;
  file_name: string | null;
  record_count: number | null;
  created_at: string;
}

export function useUploads() {
  return useQuery({
    queryKey: ['uploads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uploads')
        .select('*')
        .order('upload_date', { ascending: false });
      if (error) throw error;
      return data as UploadRecord[];
    },
  });
}

export function useDealsForUpload(uploadId: string | null) {
  return useQuery({
    queryKey: ['deals', uploadId],
    queryFn: async () => {
      if (!uploadId) return [];
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('upload_id', uploadId);
      if (error) throw error;
      return data;
    },
    enabled: !!uploadId,
  });
}
