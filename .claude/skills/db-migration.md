# Skill: database migration

Use this skill for any change to the Supabase database schema.

## Rules (non-negotiable)
- NEVER manually edit files in `supabase/migrations/`
- NEVER run raw SQL against production without a migration file
- ALWAYS regenerate TypeScript types after any schema change
- ALWAYS test the migration locally before pushing

## Migration procedure

### Step 1 — Make schema changes in Supabase Studio (local)
```bash
supabase start         # ensure local Supabase is running
# open http://localhost:54323 → Table Editor → make your changes
```

### Step 2 — Generate the migration file
```bash
supabase db diff -f your_migration_name
# this creates supabase/migrations/[timestamp]_your_migration_name.sql
# review the generated file — do not edit it
```

### Step 3 — Regenerate TypeScript types
```bash
supabase gen types typescript --local > src/db/types.ts
```

### Step 4 — Test locally
```bash
supabase db reset      # applies all migrations from scratch
npm test               # run test suite
```

### Step 5 — Commit
Commit both the migration file and the updated `src/db/types.ts` together in the same commit.

## Common new table checklist
- [ ] Has `id uuid primary key default gen_random_uuid()`
- [ ] Has `created_at timestamptz default now()`
- [ ] Has `semester_id uuid references semesters(id)` (unless it IS the semesters table)
- [ ] RLS enabled: `alter table [table] enable row level security`
- [ ] RLS policies written for startup, mentor, and admin roles
