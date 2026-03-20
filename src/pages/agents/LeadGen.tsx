import { useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AgentLayout } from "@/components/agents/AgentLayout";
import { AgentChat } from "@/components/agents/AgentChat";
import { ActionQueue, type QueueItem } from "@/components/agents/ActionQueue";
import { UserSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ToolCall } from "@/lib/agent-stream";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LeadGen() {
  const { user, loading } = useAuth();
  const [leads, setLeads] = useState<QueueItem[]>([]);
  const [rawLeads, setRawLeads] = useState<Record<string, any>>({});

  const handleToolCall = useCallback((tc: ToolCall) => {
    if (tc.name === "suggest_leads" && tc.arguments.leads) {
      const newLeads = (tc.arguments.leads as any[]).map((lead, i) => {
        const id = `lead-${Date.now()}-${i}`;
        setRawLeads((prev) => ({ ...prev, [id]: lead }));
        return {
          id,
          title: lead.contact_name || "Unknown",
          subtitle: `${lead.company || ""} · ${lead.job_title || ""}`.trim(),
          status: "pending",
          priority: "medium",
        };
      });
      setLeads((prev) => [...newLeads, ...prev]);
      toast.success(`${newLeads.length} lead(s) suggested`);
    }
  }, []);

  const handleApprove = useCallback(async (id: string) => {
    const lead = rawLeads[id];
    if (!lead || !user) return;

    const { error } = await supabase.from("lead_candidates").insert({
      user_id: user.id,
      company: lead.company,
      contact_name: lead.contact_name,
      email: lead.email,
      linkedin_url: lead.linkedin_url,
      job_title: lead.job_title,
      company_size: lead.company_size,
      vertical: lead.vertical,
      source: lead.source || "ai-agent",
      status: "approved",
    });

    if (error) {
      toast.error("Failed to save lead");
    } else {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: "approved" } : l)));
      toast.success("Lead approved");
    }
  }, [rawLeads, user]);

  const handleReject = useCallback(async (id: string, feedback?: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: "rejected" } : l)));
    toast.info("Lead rejected");
  }, []);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AgentLayout title="Lead Gen Agent" icon={<UserSearch className="h-5 w-5 text-primary" />}>
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="flex-1 min-w-0 border-r border-border/40">
          <AgentChat agentType="lead-gen" onToolCall={handleToolCall} />
        </div>
        <div className="w-full lg:w-[400px] shrink-0 overflow-y-auto p-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Suggested Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionQueue
                items={leads}
                onApprove={handleApprove}
                onReject={handleReject}
                emptyMessage="Chat with the agent to get lead suggestions"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AgentLayout>
  );
}
