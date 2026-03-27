# ADR 001 — Supabase over custom backend

**Date:** [fill in]
**Status:** Accepted
**Decided by:** [fill in]

## Context
We needed a backend solution for a small student team with limited time.
Options considered: custom Node.js/Express API, Django REST, Supabase.

## Decision
Use Supabase for everything: database, auth, storage, edge functions, and realtime.

## Reasons
- Built-in auth with role-based JWT claims — no custom auth middleware needed
- Row Level Security (RLS) enforces access control at the database layer
- Edge Functions handle AI matching without a separate server
- Realtime subscriptions power live schedule updates
- TypeScript type generation keeps frontend and DB in sync
- Student team can ship faster without managing a separate API server

## Trade-offs
- Less control over backend logic than a custom API
- Edge Functions have cold start latency — acceptable for AI matching (not real-time)
- Vendor lock-in to Supabase — acceptable for this project scope

## Consequences
All backend logic lives in Supabase. The frontend talks directly to Supabase
via the JS client. Complex business logic (AI matching) lives in Edge Functions.
