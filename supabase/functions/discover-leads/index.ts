import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ICP_QUERIES = [
  "animation studio using AI rendering pipeline",
  "VFX studio hybrid production virtual production",
  "visual effects company AI-powered workflow automation",
  "animation studio machine learning accelerating pipeline",
  "VFX company real-time rendering Unreal Engine LED volume",
  "post-production studio AI compositing neural rendering",
  "animation studio AI upscaling denoising render farm",
  "VFX studio cloud rendering GPU pipeline 2024 2025",
  "animation company Series A B funding 2024 2025",
  "VFX studio London UK Europe",
  "animation studio Germany France Spain",
  "visual effects company AI transformation digital pipeline",
];

const NEGATIVE_KEYWORDS = [
  "runway", "pika", "synthesia", "heygen", "d-id", "wonder dynamics",
  "stability ai", "luma ai", "podcast", "music studio",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EXA_API_KEY = Deno.env.get("EXA_API_KEY");
    if (!EXA_API_KEY) throw new Error("EXA_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build search queries: user query + up to 3 ICP queries that overlap
    const queries = [query];
    const lowerQuery = query.toLowerCase();
    for (const icpQ of ICP_QUERIES) {
      if (queries.length >= 4) break;
      const words = icpQ.toLowerCase().split(/\s+/);
      if (words.some((w) => lowerQuery.includes(w))) {
        queries.push(icpQ);
      }
    }

    // Search Exa for companies
    const allResults: any[] = [];
    for (const q of queries) {
      try {
        const exaRes = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: {
            "x-api-key": EXA_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: q,
            type: "auto",
            category: "company",
            numResults: 10,
            contents: {
              highlights: { maxCharacters: 2000 },
            },
          }),
        });

        if (exaRes.ok) {
          const data = await exaRes.json();
          if (data.results) allResults.push(...data.results);
        }
      } catch (e) {
        console.error(`Exa search failed for query: ${q}`, e);
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = allResults.filter((r) => {
      const key = (r.url || "").replace(/\/$/, "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter out competitors/negatives
    const filtered = unique.filter((r) => {
      const text = `${r.title || ""} ${r.url || ""} ${(r.highlights || []).join(" ")}`.toLowerCase();
      return !NEGATIVE_KEYWORDS.some((kw) => text.includes(kw));
    });

    // Get existing leads for dedup
    const { data: existing } = await supabase
      .from("lead_candidates")
      .select("website, company")
      .eq("user_id", user.id);

    const existingWebsites = new Set((existing || []).map((e: any) => (e.website || "").toLowerCase().replace(/\/$/, "")));
    const existingCompanies = new Set((existing || []).map((e: any) => (e.company || "").toLowerCase()));

    // Build inserts
    const inserts = filtered
      .filter((r) => {
        const url = (r.url || "").toLowerCase().replace(/\/$/, "");
        const title = (r.title || "").toLowerCase();
        return !existingWebsites.has(url) && !existingCompanies.has(title);
      })
      .map((r) => ({
        user_id: user.id,
        company: r.title || "Unknown",
        website: r.url || null,
        source: "exa_discovery",
        status: "pending",
        research_depth: "basic",
        summary: (r.highlights || []).slice(0, 2).join(" ").slice(0, 500) || null,
      }));

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from("lead_candidates").insert(inserts);
      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to insert leads" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch the leads we just inserted (plus any recent pending)
    const { data: leads } = await supabase
      .from("lead_candidates")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);

    return new Response(JSON.stringify({ leads: leads || [], inserted: inserts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("discover-leads error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
