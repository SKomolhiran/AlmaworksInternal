# ADR 002 — RLS for role-based access control

**Date:** [fill in]
**Status:** Accepted

## Decision
Use Supabase Row Level Security (RLS) policies as the primary access control mechanism.
Do not implement role checks in API routes or frontend components as the primary gate.

## RLS policy pattern
Every table follows this pattern:

```sql
-- Startups can only see/edit their own rows
create policy "startup_own" on [table]
  for all using (
    auth.uid() = user_id and
    (select role from users where id = auth.uid()) = 'startup'
  );

-- Admins can see and edit everything
create policy "admin_all" on [table]
  for all using (
    (select role from users where id = auth.uid()) = 'admin'
  );
```

## Consequences
- Security enforced at DB layer — even if frontend has a bug, data is protected
- Never use the Supabase service role key on the frontend
- Never call `supabase.rpc()` with `{ count: 'exact' }` to bypass RLS
- All new tables must have RLS enabled before going to production
