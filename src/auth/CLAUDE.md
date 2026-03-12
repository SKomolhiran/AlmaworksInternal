# CLAUDE.md — src/auth/ (SHARP EDGE)

> This folder controls authentication and role-based access.
> Read this before making any changes here.

## What lives here
- Supabase Auth configuration and helpers
- Role checking utilities
- JWT claims shape
- Auth middleware for API routes

## The role enum
There are exactly 3 roles. Do not add new roles without an ADR and team discussion.
```typescript
type Role = 'mentor' | 'startup' | 'admin'
```
Role is stored in `users.role` and embedded in the JWT via a Supabase Auth hook.

## Non-negotiable rules
1. NEVER disable or bypass RLS policies — see docs/adr/002-rls-for-role-access.md
2. NEVER use the Supabase service role key on the frontend or in client-side code
3. NEVER expose user data across roles — a startup must never see another startup's private data
4. All role checks in UI components are secondary gates only — RLS is the primary gate
5. JWT shape: `{ sub: uuid, role: Role, semester_id: uuid }` — do not add fields without updating RLS policies

## Common mistakes to avoid
- Using `.auth.admin` methods from the frontend — server-side only
- Forgetting to check `semester_id` when checking role — a user may be active in one semester but not another
- Caching auth state without invalidating on role change
