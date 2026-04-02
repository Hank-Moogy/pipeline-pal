

## Fix: Allow Team Members to Update Deals

### Problem
The `deals` table UPDATE RLS policy restricts updates to only the user who created the upload. When Alvaro (a different user) tries to edit a deal's email, the update returns 0 rows due to RLS, and `.single()` throws a 406 error.

### Current Policy
```sql
-- UPDATE policy checks: uploads.user_id = auth.uid()
-- Only the upload creator can edit deals
```

### Solution
Create a migration to replace the restrictive UPDATE policy with one that allows all authenticated users to update deals — matching the existing SELECT policy pattern (team-wide read is already `true`).

```sql
DROP POLICY "Authenticated users can update own deals" ON public.deals;

CREATE POLICY "Authenticated users can update all deals"
ON public.deals
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
```

### Why This Is Safe
- The app is a team CRM — everyone should be able to update any deal
- SELECT already allows all authenticated users to view all deals
- INSERT is still scoped to upload ownership (appropriate since uploads are user-specific)

### Files Changed
- 1 new database migration only — no code changes needed

