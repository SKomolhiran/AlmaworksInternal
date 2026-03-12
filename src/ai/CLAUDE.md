# CLAUDE.md — src/ai/ (SHARP EDGE)

> This folder owns all LLM calls, prompt templates, and AI logic.
> Read this before making any changes here.

## What lives here
- `match.ts` — mentor-startup matching Edge Function
- `gap-analysis.ts` — mentor pool gap analysis Edge Function
- `prompts/` — versioned prompt templates (never inline)

## Non-negotiable rules
1. ALL LLM API calls must live in this folder — never call the LLM from a component, page, or API route
2. Prompt templates are files in `src/ai/prompts/` — never hardcode prompt strings inline
3. Every AI function must have a fallback — if the LLM call fails, return a safe degraded result
4. Never log full prompt content in production — it may contain sensitive startup/mentor data
5. LLM API keys are Supabase secrets — never put them in .env.local or commit them

## Invoking from frontend
```typescript
const { data, error } = await supabase.functions.invoke('match-mentors', {
  body: { startup_id: '...', semester_id: '...' }
})
```

## Adding a new AI feature
1. Create a new Edge Function file in this folder
2. Create a prompt template in `src/ai/prompts/`
3. Add fallback logic
4. Deploy: `supabase functions deploy your-function-name`
5. Document the input/output shape in a comment at the top of the file

## Current functions
| Function | Input | Output |
|---|---|---|
| `match-mentors` | startup_id, semester_id | Ranked mentor list with scores + reasoning |
| `gap-analysis` | semester_id | Missing expertise areas + recruiting recommendations |
