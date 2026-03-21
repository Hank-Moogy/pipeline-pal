

# Fix: gmail-auth edge function using wrong env var

## Problem
The `gmail-auth` edge function creates a Supabase client with `SUPABASE_PUBLISHABLE_KEY`, but in the edge function runtime the correct environment variable is `SUPABASE_ANON_KEY`. This causes the "supabaseKey is required" error.

## Fix
**File: `supabase/functions/gmail-auth/index.ts`** (line ~22)

Change:
```typescript
Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
```
To:
```typescript
Deno.env.get("SUPABASE_ANON_KEY")
```

Single line change, no other modifications needed.

