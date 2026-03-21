

# Add `login_hint` and `hd` to Gmail OAuth URL

## Change

**File: `supabase/functions/gmail-auth/index.ts`**

After getting the authenticated user, extract their email and domain, then add `login_hint` and `hd` parameters to the Google OAuth URL. This dynamically works for any `@mago.studio` user (or any org domain).

```typescript
const userEmail = user.email;
const domain = userEmail?.split('@')[1];

const params = new URLSearchParams({
  // ...existing params...
  ...(userEmail && { login_hint: userEmail }),
  ...(domain && { hd: domain }),
});
```

Single file, ~3 lines added.

