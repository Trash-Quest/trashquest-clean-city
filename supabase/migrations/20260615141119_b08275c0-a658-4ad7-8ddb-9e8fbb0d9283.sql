
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS tambon text,
  ADD COLUMN IF NOT EXISTS amphoe text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS geocode_source text;

CREATE INDEX IF NOT EXISTS reports_lat_lng_idx ON public.reports (latitude, longitude);
CREATE INDEX IF NOT EXISTS reports_province_idx ON public.reports (province);
CREATE INDEX IF NOT EXISTS reports_tambon_idx ON public.reports (tambon);

CREATE OR REPLACE FUNCTION public.distance_meters(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) RETURNS double precision
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT 2 * 6371000 * asin(
    sqrt(
      sin(radians((lat2 - lat1) / 2)) ^ 2 +
      cos(radians(lat1)) * cos(radians(lat2)) *
      sin(radians((lng2 - lng1) / 2)) ^ 2
    )
  );
$$;

CREATE TABLE IF NOT EXISTS public.duplicate_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  month_key text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS duplicate_attempts_user_month_idx
  ON public.duplicate_attempts (user_id, month_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.duplicate_attempts TO authenticated;
GRANT ALL ON public.duplicate_attempts TO service_role;

ALTER TABLE public.duplicate_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own duplicate attempts"
  ON public.duplicate_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own duplicate attempts"
  ON public.duplicate_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own duplicate attempts"
  ON public.duplicate_attempts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_duplicate_attempts_updated_at
  BEFORE UPDATE ON public.duplicate_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
