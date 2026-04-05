-- Add is_active flag to profiles
-- When false, the user is blocked from logging in and is signed out of any active session.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
