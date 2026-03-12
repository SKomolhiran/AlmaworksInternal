# Skill: new feature playbook

Use this skill when starting any new feature on the Almaworks platform.

## Before writing any code

1. Identify which user roles are affected: startup | mentor | admin | all
2. Check if a new database table or column is needed
   - If yes: does it need `semester_id`? (almost always yes)
   - If yes: create migration via `supabase db diff` after schema change in Supabase Studio
   - If yes: regenerate types `supabase gen types typescript --local > src/db/types.ts`
3. Check if RLS policies are needed for new tables
   - Startups: can only read/write their own rows
   - Mentors: can only read/write their own rows
   - Admins: full access to all rows
4. Check if this feature touches `src/auth/` or `src/db/` — if so, read their local CLAUDE.md first

## Implementation order

1. Database schema change (if needed) + migration
2. RLS policies
3. TypeScript types regeneration
4. API route handler in `src/api/`
5. React component in `src/components/`
6. Page in `src/pages/`
7. Test
8. Run `npm run lint` — fix all errors before marking done

## Semester-awareness check
Ask before finishing: does this feature need to be filtered by the active semester?
If the feature shows or stores mentor/startup/session data, the answer is almost always yes.
Use `semesters.is_active = true` to get the current semester.
