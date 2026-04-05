-- Add status and full_name columns to profiles (idempotent)
-- These were previously added via the Supabase dashboard; this migration
-- documents and re-applies them so the migration history is complete.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'::text
    CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]));

-- Fix handle_new_user trigger:
-- - Explicitly sets status = 'pending' for all new sign-ups
-- - Captures full_name from Google/OAuth metadata (raw_user_meta_data)
-- - Role defaults to 'startup'; admin can change it at approval time
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, email, role, status, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      (new.raw_user_meta_data->>'role')::public.user_role,
      'startup'::public.user_role
    ),
    'pending',
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    )
  );
  return new;
end;
$function$;
