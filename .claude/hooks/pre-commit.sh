#!/bin/bash
# Hook: pre-commit
# Runs automatically before every commit.
# Blocks the commit if lint or type check fails.

echo "Running pre-commit checks..."

# 1. Lint
npm run lint
if [ $? -ne 0 ]; then
  echo "BLOCKED: Lint errors found. Fix before committing."
  exit 1
fi

# 2. TypeScript type check
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "BLOCKED: TypeScript errors found. Fix before committing."
  exit 1
fi

# 3. Block direct edits to migration files (should be generated, not hand-written)
MIGRATION_CHANGES=$(git diff --cached --name-only | grep "supabase/migrations/")
if [ -n "$MIGRATION_CHANGES" ]; then
  echo ""
  echo "WARNING: You are committing changes to migration files:"
  echo "$MIGRATION_CHANGES"
  echo ""
  echo "Migrations should be generated via 'supabase db diff', not hand-edited."
  echo "If you generated this via the CLI, type 'yes' to confirm and continue."
  read -r confirmation
  if [ "$confirmation" != "yes" ]; then
    echo "BLOCKED: Commit cancelled."
    exit 1
  fi
fi

echo "Pre-commit checks passed."
exit 0
