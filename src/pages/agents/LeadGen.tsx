import { useState, useCallback, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AgentLayout } from "@/components/agents/AgentLayout";
import { LeadFilters, emptyFilters, type LeadFilterValues } from "@/components/agents/lead-gen/LeadFilters";
import { LeadSearchCenter } from "@/components/agents/lead-gen/LeadSearchCenter";
import { LeadResultsTable, SearchLoadingAnimation, type LeadResult } from "@/components/agents/lead-gen/LeadResultsTable";
import { UserSearch, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function SaveAsICPButton({ query, onSave }: { query: string; onSave: (name: string, query: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <Bookmark className="h-3.5 w-3.5" />
          Save as ICP
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <p className="text-xs font-medium mb-2 text-foreground">Name this ICP</p>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Enterprise CTOs in SaaS"
          className="text-xs h-8 mb-2"
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              onSave(name.trim(), query);
              setName("");
              setOpen(false);
            }
          }}
        />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" className="h-7 text-xs" disabled={!name.trim()} onClick={() => { onSave(name.trim(), query); setName(""); setOpen(false); }}>Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
  const [lastQuery, setLastQuery] = useState("");
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [generatingOutreachId, setGeneratingOutreachId] = useState<string | undefined>();

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
        { user_id: user.id, agent_type: "lead-gen-icps", settings: { icps, recent } as any },
        { onConflict: "user_id,agent_type" }
      );
    },
    [user]
  );

  const handleSearch = useCallback(
    async (query: string) => {
      if (!user) return;
      setIsSearching(true);
      setHasSearched(true);
      setLeads([]);
      setLastQuery(query);

      const newRecent = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 10);
      setRecentSearches(newRecent);
      persistSettings(savedICPs, newRecent);

      try {
        const { data, error } = await supabase.functions.invoke("discover-leads", {
          body: { query },
        });

        if (error) throw error;

        const rawLeads = (data?.leads || []).map((l: any) => ({
          id: l.id,
          company: l.company || "",
          contact_name: l.contact_name || "",
          job_title: l.job_title || "",
          email: l.email || "",
          linkedin_url: l.linkedin_url || "",
          company_size: l.company_size || "",
          vertical: l.vertical || "",
          location: l.location || "",
          source: l.source || "",
          status: l.status || "pending",
          summary: l.summary,
          fit_score: l.fit_score,
          fit_reason: l.fit_reason,
          pain_points: l.pain_points,
          tech_stack: l.tech_stack,
          product_hooks: l.product_hooks,
          champions: l.champions,
          recent_signals: l.recent_signals,
          research_depth: l.research_depth,
          last_enriched_at: l.last_enriched_at,
          studio_type: l.studio_type,
          website: l.website,
          region: l.region,
          employee_count: l.employee_count,
          funding_stage: l.funding_stage,
        })) as LeadResult[];

        setLeads(rawLeads);
        toast.success(`${data?.inserted || 0} new leads discovered`);
      } catch (e: any) {
        console.error("Search error:", e);
        toast.error(e.message || "Search failed");
      } finally {
        setIsSearching(false);
      }
    },
    [user, recentSearches, savedICPs, persistSettings]
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

  const handleEnrich = useCallback(
    async (id: string) => {
      setEnrichingIds((prev) => new Set(prev).add(id));
      try {
        const { data, error } = await supabase.functions.invoke("enrich-lead", {
          body: { leadId: id },
        });
        if (error) throw error;

        const enrichment = data?.enriched?.[0] as Record<string, unknown> | undefined;
        if (enrichment) {
          setLeads((prev) =>
            prev.map((l) =>
              l.id === id
                ? { ...l, ...enrichment, research_depth: "enriched" as const, last_enriched_at: new Date().toISOString() }
                : l
            )
          );
          toast.success("Lead enriched");
        }
      } catch (e: any) {
        toast.error(e.message || "Enrichment failed");
      } finally {
        setEnrichingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      }
    },
    []
  );

  const handleBulkEnrich = useCallback(
    async (ids: string[]) => {
      setEnrichingIds(new Set(ids));
      try {
        const { data, error } = await supabase.functions.invoke("enrich-lead", {
          body: { leadIds: ids },
        });
        if (error) throw error;

        const enrichedMap = new Map((data?.enriched || []).map((e: any) => [e.id, e as Record<string, unknown>]));
        setLeads((prev) =>
          prev.map((l) => {
            const e = enrichedMap.get(l.id) as Record<string, unknown> | undefined;
            return e ? { ...l, ...e, research_depth: "enriched" as const, last_enriched_at: new Date().toISOString() } : l;
          })
        );
        toast.success(`${data?.total || 0} leads enriched`);
      } catch (e: any) {
        toast.error(e.message || "Bulk enrichment failed");
      } finally {
        setEnrichingIds(new Set());
      }
    },
    []
  );

  const handleGenerateOutreach = useCallback(
    async (id: string) => {
      setGeneratingOutreachId(id);
      try {
        const { data, error } = await supabase.functions.invoke("generate-outreach", {
          body: { leadId: id },
        });
        if (error) throw error;

        toast.success("Outreach email drafted", { description: data?.email?.subject });
      } catch (e: any) {
        toast.error(e.message || "Outreach generation failed");
      } finally {
        setGeneratingOutreachId(undefined);
      }
    },
    []
  );

  const handleApprove = useCallback(
    async (id: string) => {
      const lead = leads.find((l) => l.id === id);
      if (!lead || !user) return;

      const { error } = await supabase.from("lead_candidates").update({ status: "approved" }).eq("id", id);

      if (error) {
        toast.error("Failed to approve lead");
      } else {
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: "approved" } : l)));
        toast.success("Lead approved");
      }
    },
    [leads, user]
  );

  const handleReject = useCallback((id: string, reason?: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: "rejected", rejectionReason: reason } : l)));
    toast.info(reason ? `Lead rejected: ${reason}` : "Lead rejected");
  }, []);

  const handleBulkAddToPipe = useCallback(
    async (ids: string[]) => {
      if (!user) return;
      const { error } = await supabase
        .from("lead_candidates")
        .update({ status: "approved" })
        .in("id", ids);

      if (error) {
        toast.error("Failed to add leads to pipe");
      } else {
        setLeads((prev) =>
          prev.map((l) => (ids.includes(l.id) && l.status === "pending" ? { ...l, status: "approved" } : l))
        );
        toast.success(`${ids.length} lead${ids.length !== 1 ? "s" : ""} added to pipe`);
      }
    },
    [user]
  );

  // Apply client-side filters
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (filters.studioType && filters.studioType !== "all" && l.studio_type && l.studio_type !== filters.studioType) return false;
      if (filters.fitScoreMin > 0 && (l.fit_score || 0) < filters.fitScoreMin) return false;
      if (filters.region && filters.region !== "all" && l.region && !l.region.toLowerCase().includes(filters.region.toLowerCase())) return false;
      return true;
    });
  }, [leads, filters]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AgentLayout title="Lead Gen Agent" icon={<UserSearch className="h-5 w-5 text-primary" />}>
      <div className="flex-1 flex min-h-0">
        <div className="w-[260px] shrink-0 border-r border-border/40 bg-card/50 overflow-y-auto hidden lg:block">
          <LeadFilters filters={filters} onChange={setFilters} />
        </div>

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
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setHasSearched(false); setLeads([]); setLastQuery(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← New search
                </button>
                <SaveAsICPButton query={lastQuery} onSave={handleSaveICP} />
              </div>

              {isSearching && <SearchLoadingAnimation />}
              <LeadResultsTable
                leads={filteredLeads}
                onApprove={handleApprove}
                onReject={handleReject}
                onBulkAddToPipe={handleBulkAddToPipe}
                onEnrich={handleEnrich}
                onBulkEnrich={handleBulkEnrich}
                onGenerateOutreach={handleGenerateOutreach}
                enrichingIds={enrichingIds}
                generatingOutreachId={generatingOutreachId}
              />
            </div>
          )}
        </div>
      </div>
    </AgentLayout>
  );
}
