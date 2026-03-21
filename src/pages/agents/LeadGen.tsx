import { useState, useCallback, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AgentLayout } from "@/components/agents/AgentLayout";
import { LeadFilters, emptyFilters, type LeadFilterValues } from "@/components/agents/lead-gen/LeadFilters";
import { LeadSearchCenter } from "@/components/agents/lead-gen/LeadSearchCenter";
import { LeadResultsTable, SearchLoadingAnimation, type LeadResult } from "@/components/agents/lead-gen/LeadResultsTable";
import { UserSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ToolCall } from "@/lib/agent-stream";
import { streamAgentChat } from "@/lib/agent-stream";

interface SavedICP {
  id: string;
  name: string;
  query: string;
  createdAt: string;
}

export default function LeadGen() {
  const { user, loading } = useAuth();
  const [filters, setFilters] = useState<LeadFilterValues>(emptyFilters);
  const [leads, setLeads] = useState<LeadResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedICPs, setSavedICPs] = useState<SavedICP[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load saved ICPs from agent_settings
  useEffect(() => {
    if (!user) return;
    supabase
      .from("agent_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("agent_type", "lead-gen-icps")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.settings) {
          const settings = data.settings as Record<string, unknown>;
          setSavedICPs((settings.icps as SavedICP[]) || []);
          setRecentSearches((settings.recent as string[]) || []);
        }
      });
  }, [user]);

  const persistSettings = useCallback(
    async (icps: SavedICP[], recent: string[]) => {
      if (!user) return;
      await supabase.from("agent_settings").upsert(
        {
          user_id: user.id,
          agent_type: "lead-gen-icps",
          settings: { icps, recent } as any,
        },
        { onConflict: "user_id,agent_type" }
      );
    },
    [user]
  );

  const buildContextFromFilters = (query: string): string => {
    const parts = [query];
    if (filters.jobTitles.length) parts.push(`Job titles: ${filters.jobTitles.join(", ")}`);
    if (filters.locations.length) parts.push(`Locations: ${filters.locations.join(", ")}`);
    if (filters.industries.length) parts.push(`Industries: ${filters.industries.join(", ")}`);
    if (filters.companySizeMin || filters.companySizeMax)
      parts.push(`Company size: ${filters.companySizeMin || "any"} – ${filters.companySizeMax || "any"}`);
    if (filters.revenueMin || filters.revenueMax)
      parts.push(`Revenue: ${filters.revenueMin || "any"} – ${filters.revenueMax || "any"}`);
    return parts.join("\n");
  };

  const handleSearch = useCallback(
    async (query: string) => {
      if (!user) return;
      setIsSearching(true);
      setHasSearched(true);
      setLeads([]);

      // Update recent searches
      const newRecent = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 10);
      setRecentSearches(newRecent);
      persistSettings(savedICPs, newRecent);

      const fullQuery = buildContextFromFilters(query);

      try {
        await streamAgentChat({
          agentType: "lead-gen",
          messages: [
            {
              role: "user",
              content: `Find leads matching this criteria:\n${fullQuery}\n\nPlease use the suggest_leads tool to return structured results.`,
            },
          ],
          onDelta: () => {},
          onToolCall: (tc: ToolCall) => {
            if (tc.name === "suggest_leads" && tc.arguments.leads) {
              const newLeads = (tc.arguments.leads as any[]).map((lead, i) => ({
                id: `lead-${Date.now()}-${i}`,
                company: lead.company || "",
                contact_name: lead.contact_name || "Unknown",
                job_title: lead.job_title || "",
                email: lead.email || "",
                linkedin_url: lead.linkedin_url || "",
                company_size: lead.company_size || "",
                vertical: lead.vertical || "",
                source: lead.source || "ai-agent",
                status: "pending" as const,
              }));
              setLeads((prev) => [...prev, ...newLeads]);
            }
          },
          onDone: () => setIsSearching(false),
          onError: (err) => {
            toast.error(err);
            setIsSearching(false);
          },
        });
      } catch {
        toast.error("Search failed");
        setIsSearching(false);
      }
    },
    [user, filters, recentSearches, savedICPs, persistSettings]
  );

  const handleSaveICP = useCallback(
    async (name: string, query: string) => {
      const icp: SavedICP = { id: `icp-${Date.now()}`, name, query, createdAt: new Date().toISOString() };
      const updated = [icp, ...savedICPs];
      setSavedICPs(updated);
      persistSettings(updated, recentSearches);
      toast.success(`ICP "${name}" saved`);
    },
    [savedICPs, recentSearches, persistSettings]
  );

  const handleApprove = useCallback(
    async (id: string) => {
      const lead = leads.find((l) => l.id === id);
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
        source: lead.source,
        status: "approved",
      });

      if (error) {
        toast.error("Failed to save lead");
      } else {
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: "approved" } : l)));
        toast.success("Lead approved");
      }
    },
    [leads, user]
  );

  const handleReject = useCallback((id: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: "rejected" } : l)));
    toast.info("Lead rejected");
  }, []);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AgentLayout title="Lead Gen Agent" icon={<UserSearch className="h-5 w-5 text-primary" />}>
      <div className="flex-1 flex min-h-0">
        {/* Left: Filters sidebar */}
        <div className="w-[260px] shrink-0 border-r border-border/40 bg-card/50 overflow-y-auto hidden lg:block">
          <LeadFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Center: Search + Results */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {!hasSearched ? (
            <LeadSearchCenter
              onSearch={handleSearch}
              isSearching={isSearching}
              savedICPs={savedICPs}
              recentSearches={recentSearches}
              onSaveICP={handleSaveICP}
              onLoadICP={(icp) => handleSearch(icp.query)}
              onLoadRecent={(q) => handleSearch(q)}
            />
          ) : (
            <div className="p-6 space-y-4">
              {/* Compact search bar when results are shown */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setHasSearched(false);
                    setLeads([]);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← New search
                </button>
                <span className="text-xs text-muted-foreground">
                  {leads.length} result{leads.length !== 1 ? "s" : ""} found
                </span>
              </div>

              {isSearching && <SearchLoadingAnimation />}
              <LeadResultsTable leads={leads} onApprove={handleApprove} onReject={handleReject} />
            </div>
          )}
        </div>
      </div>
    </AgentLayout>
  );
}
