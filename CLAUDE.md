# Almaworks Mentor-Startup Platform

## Why this exists
Almaworks runs a mentorship program connecting mentors and startups each semester.
This platform replaces manual scheduling and scattered spreadsheets with a centralized
web tool. Mentors and startups can log in, discover each other, and request sessions.
The Almaworks admin team manages scheduling, outreach, and program operations.

## What this system does
- Mentor and startup profiles with expertise tags and semester history
- Startup-facing mentor directory (searchable, filterable, cross-semester)
- Session request flow: startup requests → admin approves → GCal invite sent
- Semester schedule page visible to all users (week-by-week, role-aware)
- Admin tools: schedule manager, reach out tracker, onboarding form triggers
- AI matching engine: ranks mentor-startup fit by expertise + availability
- AI gap analysis: identifies missing mentor profiles for recruiting

## Tech stack
- Frontend: React + Next.js (TypeScript)
- Backend / DB / Auth: Supabase (Postgres, RLS, Edge Functions, Realtime, Storage)
- AI: Supabase Edge Functions calling an LLM API (OpenAI or Anthropic)
- Hosting: Vercel (frontend), Supabase cloud (backend)

## Repo map
```
CLAUDE.md              ← you are here (repo memory)
GETTING_STARTED.md     ← bootstrap instructions (read once, then ignore)
.claude/
  skills/              ← reusable expert modes for common workflows
  hooks/               ← deterministic guardrails (run regardless of context)
docs/
  architecture.md      ← system architecture overview
  adr/                 ← engineering decision records
src/
  auth/                ← authentication + RLS (SHARP EDGE — see local CLAUDE.md)
  db/                  ← database types, migrations, seed (SHARP EDGE)
  ai/                  ← matching engine + gap analysis (all LLM calls live here)
  api/                 ← REST API route handlers
  components/          ← shared React components
  pages/               ← Next.js pages
```

## Key commands
```bash
# Start local Supabase
supabase start

# Start dev server
npm run dev

# Regenerate TypeScript types from Supabase schema (run after any schema change)
supabase gen types typescript --local > src/db/types.ts

# Run tests
npm test

# Run linter
npm run lint
```

## Non-negotiable rules
1. Every table in Supabase MUST have a `semester_id` foreign key (except `semesters` itself)
2. Never bypass Row Level Security (RLS) — all access control goes through Supabase RLS policies
3. Never hand-edit files in `supabase/migrations/` — always use `supabase db diff`
4. All LLM API calls must go through `src/ai/` — never call the LLM directly from a component or page
5. TypeScript strict mode is on — no `any` types
6. Run `npm run lint` before every commit
