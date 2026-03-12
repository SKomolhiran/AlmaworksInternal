# Skill: code review

Use this skill when reviewing any pull request or code change on the Almaworks platform.

## Checklist

### Security
- [ ] No RLS policies bypassed or disabled
- [ ] No hardcoded API keys, secrets, or Supabase service role keys
- [ ] Auth checks present on all API routes
- [ ] User input validated before hitting the database

### Database
- [ ] All new tables include `semester_id uuid references semesters(id)`
- [ ] Migrations generated via `supabase db diff`, not hand-written
- [ ] TypeScript types regenerated: `supabase gen types typescript --local > src/db/types.ts`
- [ ] No `SELECT *` in production queries — always specify columns

### AI / Matching
- [ ] LLM calls only inside `src/ai/`
- [ ] Prompt templates not hardcoded inline — use versioned templates in `src/ai/prompts/`
- [ ] Edge function errors handled gracefully — fallback if AI is unavailable

### Frontend
- [ ] Role-based rendering correct (startup vs mentor vs admin views)
- [ ] "Unassigned" session slots hidden from non-admin users
- [ ] Semester filter defaults to current active semester
- [ ] No mentor/startup data exposed outside authenticated routes

### General
- [ ] No `any` TypeScript types introduced
- [ ] Component has a corresponding test if it contains business logic
- [ ] Lint passes: `npm run lint`
