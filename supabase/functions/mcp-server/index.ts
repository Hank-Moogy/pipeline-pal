import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const app = new Hono();

// Auth middleware
app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return next();

  const authHeader = c.req.header("Authorization");
  const token = Deno.env.get("MCP_AUTH_TOKEN");

  if (!token || authHeader !== `Bearer ${token}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

const mcpServer = new McpServer({
  name: "mago-pipeline",
  version: "1.0.0",
});

// Tool 1: Pipeline Summary
mcpServer.tool("get_pipeline_summary", {
  description:
    "Get an overview of the pipeline: deal counts by status, total value, stale deal count, and deals grouped by owner.",
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async () => {
    const sb = getSupabase();
    const { data: deals, error } = await sb
      .from("deals")
      .select("id, company, status, deal_value, prospect_owner, last_interaction");

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }

    const now = new Date();
    const statusCounts: Record<string, number> = {};
    const statusValues: Record<string, number> = {};
    const ownerCounts: Record<string, number> = {};
    let totalValue = 0;
    let staleDealCount = 0;

    for (const d of deals || []) {
      const status = d.status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      statusValues[status] = (statusValues[status] || 0) + (d.deal_value || 0);
      totalValue += d.deal_value || 0;

      const owner = d.prospect_owner || "Unassigned";
      ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;

      if (d.last_interaction) {
        const daysSince = Math.floor(
          (now.getTime() - new Date(d.last_interaction).getTime()) / 86400000
        );
        if (daysSince >= 7) staleDealCount++;
      } else {
        staleDealCount++;
      }
    }

    const summary = {
      total_deals: (deals || []).length,
      total_value_eur: totalValue,
      stale_deals_7_plus_days: staleDealCount,
      by_status: Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        value_eur: statusValues[status] || 0,
      })),
      by_owner: Object.entries(ownerCounts).map(([owner, count]) => ({
        owner,
        count,
      })),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
    };
  },
});

// Tool 2: Stale Deals
mcpServer.tool("get_stale_deals", {
  description:
    "List deals with no interaction in N days (default 7), sorted by deal value descending. Useful for identifying urgent follow-ups.",
  inputSchema: {
    type: "object",
    properties: {
      days_threshold: {
        type: "number",
        description: "Number of days without interaction to consider stale (default 7)",
      },
    },
  },
  handler: async ({ days_threshold }) => {
    const threshold = days_threshold ?? 7;
    const sb = getSupabase();
    const { data: deals, error } = await sb
      .from("deals")
      .select(
        "id, company, first_name, last_name, status, deal_value, prospect_owner, last_interaction, next_steps"
      );

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }

    const now = new Date();
    const stale = (deals || [])
      .map((d) => {
        const daysSince = d.last_interaction
          ? Math.floor(
              (now.getTime() - new Date(d.last_interaction).getTime()) / 86400000
            )
          : null;
        return { ...d, days_since_interaction: daysSince };
      })
      .filter(
        (d) =>
          d.days_since_interaction === null || d.days_since_interaction >= threshold
      )
      .sort((a, b) => (b.deal_value || 0) - (a.deal_value || 0));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              threshold_days: threshold,
              count: stale.length,
              deals: stale.map((d) => ({
                company: d.company,
                contact: `${d.first_name || ""} ${d.last_name || ""}`.trim(),
                status: d.status,
                deal_value_eur: d.deal_value,
                owner: d.prospect_owner,
                days_since_interaction: d.days_since_interaction ?? "never",
                next_steps: d.next_steps,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  },
});

// Tool 3: Deal Details
mcpServer.tool("get_deal_details", {
  description:
    "Get full context for a specific deal by company name or deal ID: contacts, notes, and recent interactions.",
  inputSchema: {
    type: "object",
    properties: {
      company_name: {
        type: "string",
        description: "Company name to search for (partial match)",
      },
      deal_id: {
        type: "string",
        description: "Exact deal UUID",
      },
    },
  },
  handler: async ({ company_name, deal_id }) => {
    const sb = getSupabase();
    let deal;

    if (deal_id) {
      const { data } = await sb.from("deals").select("*").eq("id", deal_id).single();
      deal = data;
    } else if (company_name) {
      const { data } = await sb
        .from("deals")
        .select("*")
        .ilike("company", `%${company_name}%`)
        .limit(1)
        .single();
      deal = data;
    } else {
      return {
        content: [
          { type: "text", text: "Please provide either company_name or deal_id." },
        ],
      };
    }

    if (!deal) {
      return { content: [{ type: "text", text: "Deal not found." }] };
    }

    // Fetch contacts, notes, interactions in parallel
    const [contactsRes, notesRes, interactionsRes] = await Promise.all([
      sb.from("deal_contacts").select("*").eq("deal_id", deal.id),
      sb
        .from("deal_notes")
        .select("*")
        .eq("deal_id", deal.id)
        .order("created_at", { ascending: false })
        .limit(10),
      sb
        .from("deal_interactions")
        .select("*")
        .eq("deal_id", deal.id)
        .order("occurred_at", { ascending: false })
        .limit(20),
    ]);

    const result = {
      deal: {
        id: deal.id,
        company: deal.company,
        contact: `${deal.first_name || ""} ${deal.last_name || ""}`.trim(),
        email: deal.email,
        status: deal.status,
        deal_value_eur: deal.deal_value,
        actual_acv_eur: deal.actual_acv,
        owner: deal.prospect_owner,
        vertical: deal.company_vertical,
        company_size: deal.company_size,
        last_interaction: deal.last_interaction,
        next_steps: deal.next_steps,
        lost_reason: deal.lost_reason,
        strongest_connection: deal.strongest_connection,
        description: deal.description,
      },
      contacts: (contactsRes.data || []).map((c) => ({
        name: `${c.first_name || ""} ${c.last_name || ""}`.trim(),
        job_title: c.job_title,
        email: c.email,
        is_champion: c.is_champion,
        notes: c.notes,
        linkedin: c.linkedin_url,
      })),
      recent_notes: (notesRes.data || []).map((n) => ({
        type: n.note_type,
        content: n.content,
        author: n.author,
        date: n.created_at,
      })),
      recent_interactions: (interactionsRes.data || []).map((i) => ({
        type: i.interaction_type,
        source: i.source,
        subject: i.subject,
        contact: i.contact_email,
        date: i.occurred_at,
        body_preview: i.body?.substring(0, 200),
      })),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
});

// Tool 4: Suggest Next Actions
mcpServer.tool("suggest_next_actions", {
  description:
    "Get a prioritized list of deals needing follow-up, ranked by urgency (staleness × deal value). Returns reasoning for each.",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Max number of actions to return (default 10)",
      },
    },
  },
  handler: async ({ limit }) => {
    const maxActions = limit ?? 10;
    const sb = getSupabase();
    const { data: deals, error } = await sb
      .from("deals")
      .select(
        "id, company, first_name, last_name, status, deal_value, prospect_owner, last_interaction, next_steps, strongest_connection"
      )
      .not("status", "in", '("Closed Won","Closed Lost","Lost")');

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }

    const now = new Date();
    const scored = (deals || [])
      .map((d) => {
        const daysSince = d.last_interaction
          ? Math.floor(
              (now.getTime() - new Date(d.last_interaction).getTime()) / 86400000
            )
          : 999;
        const urgencyScore = daysSince * (d.deal_value || 1);

        let reason = "";
        if (daysSince >= 14)
          reason = `Critical: No interaction in ${daysSince} days`;
        else if (daysSince >= 7)
          reason = `Stale: No interaction in ${daysSince} days`;
        else if (daysSince === 999) reason = "No recorded interaction ever";
        else reason = `${daysSince} days since last interaction`;

        if (d.deal_value && d.deal_value >= 50000) reason += ` — high-value deal (€${d.deal_value.toLocaleString()})`;

        return {
          company: d.company,
          contact: `${d.first_name || ""} ${d.last_name || ""}`.trim(),
          status: d.status,
          deal_value_eur: d.deal_value,
          owner: d.prospect_owner,
          days_since_interaction: daysSince === 999 ? "never" : daysSince,
          next_steps: d.next_steps,
          strongest_connection: d.strongest_connection,
          urgency_score: urgencyScore,
          reason,
        };
      })
      .sort((a, b) => b.urgency_score - a.urgency_score)
      .slice(0, maxActions);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { actions: scored.map(({ urgency_score, ...rest }) => rest) },
            null,
            2
          ),
        },
      ],
    };
  },
});

// Tool 5: Search Deals
mcpServer.tool({
  name: "search_deals",
  description:
    "Search deals by company name, owner, status, or vertical. Returns matching deals with key fields.",
  inputSchema: {
    type: "object",
    properties: {
      company: {
        type: "string",
        description: "Company name (partial match)",
      },
      owner: {
        type: "string",
        description: "Prospect owner name (partial match)",
      },
      status: {
        type: "string",
        description: "Exact status filter",
      },
      vertical: {
        type: "string",
        description: "Company vertical (partial match)",
      },
    },
  },
  handler: async ({ company, owner, status, vertical }) => {
    const sb = getSupabase();
    let query = sb
      .from("deals")
      .select(
        "id, company, first_name, last_name, status, deal_value, prospect_owner, company_vertical, last_interaction, next_steps"
      );

    if (company) query = query.ilike("company", `%${company}%`);
    if (owner) query = query.ilike("prospect_owner", `%${owner}%`);
    if (status) query = query.eq("status", status);
    if (vertical) query = query.ilike("company_vertical", `%${vertical}%`);

    const { data, error } = await query.limit(50);

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }

    const results = (data || []).map((d) => ({
      id: d.id,
      company: d.company,
      contact: `${d.first_name || ""} ${d.last_name || ""}`.trim(),
      status: d.status,
      deal_value_eur: d.deal_value,
      owner: d.prospect_owner,
      vertical: d.company_vertical,
      last_interaction: d.last_interaction,
      next_steps: d.next_steps,
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ count: results.length, deals: results }, null, 2),
        },
      ],
    };
  },
});

// Shared helper: resolve deal by ID or company name
async function resolveDeal(sb: ReturnType<typeof getSupabase>, { deal_id, company_name }: { deal_id?: string; company_name?: string }) {
  if (deal_id) {
    const { data, error } = await sb.from("deals").select("*").eq("id", deal_id).single();
    if (error) return { deal: null, error: error.message };
    return { deal: data, error: null };
  }
  if (company_name) {
    const { data, error } = await sb.from("deals").select("*").ilike("company", `%${company_name}%`).limit(1).single();
    if (error) return { deal: null, error: error.message };
    return { deal: data, error: null };
  }
  return { deal: null, error: "Please provide either deal_id or company_name." };
}

// Tool 6: Update Deal Status
mcpServer.tool({
  name: "update_deal_status",
  description: "Update a deal's status (e.g. move to Negotiation, Closed Won, Closed Lost). Provide deal_id or company_name.",
  inputSchema: {
    type: "object",
    properties: {
      deal_id: { type: "string", description: "Exact deal UUID" },
      company_name: { type: "string", description: "Company name (partial match)" },
      new_status: { type: "string", description: "New status value" },
      lost_reason: { type: "string", description: "Reason if closing as lost" },
    },
    required: ["new_status"],
  },
  handler: async ({ deal_id, company_name, new_status, lost_reason }) => {
    const sb = getSupabase();
    const { deal, error } = await resolveDeal(sb, { deal_id, company_name });
    if (!deal) return { content: [{ type: "text", text: error || "Deal not found." }] };

    const oldStatus = deal.status;
    const updates: Record<string, unknown> = { status: new_status };
    if (lost_reason) updates.lost_reason = lost_reason;

    const { error: updateError } = await sb.from("deals").update(updates).eq("id", deal.id);
    if (updateError) return { content: [{ type: "text", text: `Error: ${updateError.message}` }] };

    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, company: deal.company, old_status: oldStatus, new_status }, null, 2) }],
    };
  },
});

// Tool 7: Add Deal Note
mcpServer.tool({
  name: "add_deal_note",
  description: "Add a note to a deal. Provide deal_id or company_name.",
  inputSchema: {
    type: "object",
    properties: {
      deal_id: { type: "string", description: "Exact deal UUID" },
      company_name: { type: "string", description: "Company name (partial match)" },
      content: { type: "string", description: "Note content" },
      author: { type: "string", description: "Author name (optional)" },
    },
    required: ["content"],
  },
  handler: async ({ deal_id, company_name, content, author }) => {
    const sb = getSupabase();
    const { deal, error } = await resolveDeal(sb, { deal_id, company_name });
    if (!deal) return { content: [{ type: "text", text: error || "Deal not found." }] };

    const { error: insertError } = await sb.from("deal_notes").insert({
      deal_id: deal.id,
      content,
      author: author || "MCP",
    });
    if (insertError) return { content: [{ type: "text", text: `Error: ${insertError.message}` }] };

    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, company: deal.company, note_preview: content.substring(0, 100) }, null, 2) }],
    };
  },
});

// Tool 8: Add Interaction
mcpServer.tool({
  name: "add_interaction",
  description: "Log an interaction (email, call, meeting) on a deal. Provide deal_id or company_name.",
  inputSchema: {
    type: "object",
    properties: {
      deal_id: { type: "string", description: "Exact deal UUID" },
      company_name: { type: "string", description: "Company name (partial match)" },
      interaction_type: { type: "string", description: "Type: email, call, meeting, or other" },
      subject: { type: "string", description: "Subject line" },
      body: { type: "string", description: "Body / details (optional)" },
      contact_email: { type: "string", description: "Contact email (optional)" },
      occurred_at: { type: "string", description: "ISO date when it happened (default: now)" },
      user_id: { type: "string", description: "User UUID to attribute (optional, fetches first profile if omitted)" },
    },
    required: ["interaction_type", "subject"],
  },
  handler: async ({ deal_id, company_name, interaction_type, subject, body, contact_email, occurred_at, user_id }) => {
    const sb = getSupabase();
    const { deal, error } = await resolveDeal(sb, { deal_id, company_name });
    if (!deal) return { content: [{ type: "text", text: error || "Deal not found." }] };

    let resolvedUserId = user_id;
    if (!resolvedUserId) {
      const { data: profile } = await sb.from("profiles").select("user_id").limit(1).single();
      resolvedUserId = profile?.user_id;
    }
    if (!resolvedUserId) return { content: [{ type: "text", text: "Could not resolve a user_id. Please provide one." }] };

    const { error: insertError } = await sb.from("deal_interactions").insert({
      deal_id: deal.id,
      user_id: resolvedUserId,
      interaction_type,
      subject,
      body: body || null,
      contact_email: contact_email || null,
      occurred_at: occurred_at || new Date().toISOString(),
      source: "mcp",
    });
    if (insertError) return { content: [{ type: "text", text: `Error: ${insertError.message}` }] };

    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, company: deal.company, interaction_type, subject }, null, 2) }],
    };
  },
});

// Tool 9: Get Deal Quotes
mcpServer.tool({
  name: "get_deal_quotes",
  description: "Get all quotes attached to a deal. Provide deal_id or company_name.",
  inputSchema: {
    type: "object",
    properties: {
      deal_id: { type: "string", description: "Exact deal UUID" },
      company_name: { type: "string", description: "Company name (partial match)" },
    },
  },
  handler: async ({ deal_id, company_name }) => {
    const sb = getSupabase();
    const { deal, error } = await resolveDeal(sb, { deal_id, company_name });
    if (!deal) return { content: [{ type: "text", text: error || "Deal not found." }] };

    const { data: quotes, error: qError } = await sb
      .from("quotes")
      .select("id, quote_number, quote_name, quote_type, status, total_arr, total_onetime, total_year1, valid_until, line_items, created_at")
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: false });

    if (qError) return { content: [{ type: "text", text: `Error: ${qError.message}` }] };

    const result = {
      company: deal.company,
      quote_count: (quotes || []).length,
      quotes: (quotes || []).map((q) => ({
        quote_number: q.quote_number,
        name: q.quote_name,
        type: q.quote_type,
        status: q.status,
        total_arr_eur: q.total_arr,
        total_onetime_eur: q.total_onetime,
        total_year1_eur: q.total_year1,
        valid_until: q.valid_until,
        created_at: q.created_at,
        line_items_count: Array.isArray(q.line_items) ? q.line_items.length : 0,
      })),
    };

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
});

// MCP transport
const transport = new StreamableHttpTransport();

app.all("/*", async (c) => {
  return await transport.handleRequest(c.req.raw, mcpServer);
});

Deno.serve(app.fetch);
