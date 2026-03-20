

# Agents Hub — Implementation Plan

This is a large feature set. I'll break it into manageable implementation chunks, starting with the database foundation and working up to the UI.

## Phase 1: Database Migrations

Create all 8 tables + enable pgvector in a single migration:

1. **Enable pgvector** — `CREATE EXTENSION IF NOT EXISTS vector`
2. **`agent_memories`** — id, user_id, agent_type, memory_type, content, embedding (vector(768)), metadata (jsonb), created_at + IVFFlat index
3. **`agent_conversations`** — id, user_id, agent_type, role, content, metadata (jsonb), created_at
4. **`lead_candidates`** — id, user_id, company, contact_name, email, linkedin_url, job_title, company_size, vertical, source, status (default 'pending'), rejection_reason, feedback, created_at
5. **`agent_settings`** — id, user_id, agent_type, settings (jsonb), updated_at
6. **`pipeline_actions`** — id, user_id, deal_id (FK deals nullable), action_type, summary, priority, status (default 'pending'), created_at
7. **`outreach_emails`** — id, user_id, deal_id (nullable), recipient_email, recipient_name, subject, body, status (default 'draft'), sequence_id (nullable), sequence_step, created_at, sent_at
8. **`email_sequences`** — id, user_id, name, steps (jsonb), created_at
9. **`social_content`** — id, user_id, platform (default 'linkedin'), post_text, image_url, status (default 'draft'), variant_group, created_at

All tables get RLS: `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE.

Create `match_agent_memories` database function for similarity search.

## Phase 2: Edge Functions

### `agent-embed` 
- Thin wrapper calling Lovable AI gateway to generate embeddings
- Accepts text, returns vector(768)

### `agent-chat`
- Receives `{ agentType, messages, context }`
- Loads relevant memories via `match_agent_memories`
- Builds agent-specific system prompt with memory context
- Streams response via Lovable AI gateway (`google/gemini-3-flash-preview`)
- Post-response: extracts facts/preferences and stores as new memories
- Handles 429/402 errors properly

## Phase 3: Shared UI Components

### `AgentChat` — Reusable streaming chat panel
- Message list with markdown rendering
- Input with send button
- Streams from `agent-chat` edge function
- Persists messages to `agent_conversations`

### `AgentLayout` — Page wrapper
- Back-to-hub navigation, agent name/icon header
- Memory indicator showing stored memory count

### `ActionQueue` — Reusable approve/reject/feedback table
- Used by Lead Gen, CRM, and Social agents
- Feedback on rejection stores to `agent_memories`

## Phase 4: Routing & Navigation

- Add routes: `/agents`, `/agents/lead-gen`, `/agents/pipeline`, `/agents/crm`, `/agents/social`
- Add "Agents" nav link to Pipeline and Dashboard headers (alongside existing Dashboard/Pipeline links)

## Phase 5: Agent Hub Page (`/agents`)

- 4 cards with icon, title, description, and "Open" button
- Links to each agent sub-page

## Phase 6: Lead Gen Agent

- Split layout: chat (left) + results table (right)
- ICP Settings drawer saved to `agent_settings`
- Results table from `lead_candidates` with approve/reject + feedback
- Approved leads can be pushed to `deals`

## Phase 7: Pipeline Manager Agent

- Chat with auto-injected pipeline context (deal counts, stale deals, totals)
- Action queue from `pipeline_actions`
- "Generate Report" button for markdown summaries

## Phase 8: CRM Agent + Deal Panel Integration

- Supports `?dealId=xxx` query param to pre-load deal context
- Email queue table from `outreach_emails`
- Sequence builder using `email_sequences`
- Add "Generate Outreach" button to `DealDetailPanel` Details tab → navigates to `/agents/crm?dealId={id}`

## Phase 9: Social Media Agent

- Chat for content ideation
- Content queue from `social_content`
- Mocked image generation (placeholder images)
- Approve/reject workflow per content item

## Technical Notes

- All AI via Lovable AI gateway — `LOVABLE_API_KEY` already provisioned
- Provider-agnostic architecture: `agent-chat` edge function structured with `getProviderConfig()` helper for future OpenAI/Anthropic swap
- Memory extraction: secondary LLM call after each turn extracts facts as JSON → embeds → stores
- Image generation mocked with placeholders
- Email sending mocked (status changes only)

