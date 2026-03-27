#!/bin/bash
# Hook: post-schema-change
# Run this manually after any Supabase schema change.
# Regenerates TypeScript types so the codebase stays in sync.

echo "Regenerating Supabase TypeScript types..."

supabase gen types typescript --local > src/db/types.ts

if [ $? -ne 0 ]; then
  echo "ERROR: Type generation failed. Is Supabase running? Try: supabase start"
  exit 1
fi

echo "Types regenerated at src/db/types.ts"
echo "Remember to commit src/db/types.ts alongside your migration file."
exit 0
