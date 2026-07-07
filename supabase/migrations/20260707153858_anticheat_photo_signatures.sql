
-- Anti-cheat: per-photo perceptual hashes (weekly similarity penalty + weekly cap)
-- and device/IP signals for burner-account (Sybil) detection.
-- Both tables are written ONLY by the analyze-trash edge function (service role);
-- photo_signatures is readable by its owner, device_signals is service-role only.

CREATE TABLE IF NOT EXISTS public.photo_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  photo_id uuid,
  phash text NOT NULL,
  week_key text NOT NULL,
  device_hash text,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS photo_signatures_user_week_idx
  ON public.photo_signatures (user_id, week_key);
CREATE INDEX IF NOT EXISTS photo_signatures_device_week_idx
  ON public.photo_signatures (device_hash, week_key);

ALTER TABLE public.photo_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_signatures_select" ON public.photo_signatures
  FOR SELECT USING (auth.uid() = user_id);
-- no INSERT/UPDATE/DELETE policies: service role only

CREATE TABLE IF NOT EXISTS public.device_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_hash text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  report_count integer NOT NULL DEFAULT 0,
  flagged boolean NOT NULL DEFAULT false,
  UNIQUE (device_hash, user_id)
);

CREATE INDEX IF NOT EXISTS device_signals_device_idx
  ON public.device_signals (device_hash);

ALTER TABLE public.device_signals ENABLE ROW LEVEL SECURITY;
-- no policies at all: RLS deny-all for clients, service role bypasses
