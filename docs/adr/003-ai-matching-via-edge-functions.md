# ADR 003 — AI matching via Supabase Edge Functions

**Date:** [fill in]
**Status:** Accepted

## Decision
Run the AI mentor-matching engine and gap analysis as Supabase Edge Functions,
not as a separate AI microservice or directly from the frontend.

## Why Edge Functions
- Co-located with the database — low-latency access to mentor/startup data
- Secrets (LLM API keys) stay server-side — never exposed to the browser
- No separate service to deploy or maintain
- Invokable from the frontend via `supabase.functions.invoke()`

## Matching engine logic (src/ai/match.ts)
Input: startup_id, semester_id
Process:
  1. Fetch startup's preferred_tags and semester_goals
  2. Fetch all mentors available on the startup's available session dates
  3. Score each mentor: overlap between startup preferred_tags and mentor expertise_tags
  4. Send top candidates + startup context to LLM for a ranked recommendation with reasoning
Output: ranked list of mentors with compatibility scores and reasoning

## Gap analysis logic (src/ai/gap-analysis.ts)
Input: semester_id
Process:
  1. Aggregate all startup preferred_tags for the semester
  2. Aggregate all mentor expertise_tags for the semester
  3. Find tags present in startup needs but underrepresented in mentor pool
  4. Send to LLM for recruiting recommendations
Output: list of missing expertise areas with suggested mentor profiles to recruit

## Consequences
- All LLM calls MUST go through src/ai/ — never call LLM from a component or API route
- Prompt templates are versioned files in src/ai/prompts/ — not inline strings
- AI layer has a fallback: if Edge Function fails, return unranked mentor list
