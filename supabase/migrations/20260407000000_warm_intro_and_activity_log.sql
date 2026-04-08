-- Feature 1: Warm Intro Tracking — add source_channel and referred_by to outreach
ALTER TABLE public.outreach
  ADD COLUMN IF NOT EXISTS source_channel text,
  ADD COLUMN IF NOT EXISTS referred_by text;

CREATE INDEX IF NOT EXISTS outreach_source_channel_idx ON public.outreach (source_channel);

-- Feature 2: Activity Log — new table for CRM-style timeline
CREATE TABLE public.outreach_activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_id uuid NOT NULL REFERENCES public.outreach(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES public.semesters(id),
  admin_id    uuid NOT NULL REFERENCES public.profiles(id),
  action_type text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can manage outreach activity"
  ON public.outreach_activity_log AS PERMISSIVE FOR ALL TO public
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'::public.user_role);

CREATE INDEX outreach_activity_log_outreach_idx ON public.outreach_activity_log (outreach_id);
CREATE INDEX outreach_activity_log_created_idx ON public.outreach_activity_log (created_at DESC);

-- Data migration: copy existing notes into activity log
-- NOTE: Attributes notes to the outreach row's admin_id (the creator), which may not be the
-- actual note author. This is an unavoidable approximation since no prior audit trail exists.
INSERT INTO public.outreach_activity_log (outreach_id, semester_id, admin_id, action_type, detail, created_at)
SELECT id, semester_id, admin_id, 'note_added', jsonb_build_object('text', notes), created_at
FROM public.outreach WHERE notes IS NOT NULL AND notes != '';
