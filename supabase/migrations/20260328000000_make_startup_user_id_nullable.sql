-- user_id is not required for admin-created startups; founders are tracked via the founders JSONB array
ALTER TABLE public.startups ALTER COLUMN user_id DROP NOT NULL;
