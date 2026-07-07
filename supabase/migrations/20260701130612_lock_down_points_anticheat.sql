
-- 1. Lock increment_user_points to service_role only (edge function path)
REVOKE EXECUTE ON FUNCTION public.increment_user_points(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_user_points(uuid, integer) TO service_role;
ALTER FUNCTION public.increment_user_points(uuid, integer) SET search_path = public;

-- 2. handle_new_user / rls_auto_enable: not meant to be called directly via RPC
--    (triggers still fire fine without public EXECUTE grants)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- 3. reports: remove the overly-permissive UPDATE policy that was silently
--    overriding the intended deny-all policy (user_cannot_update_reports).
--    Client can no longer update points_awarded/status/anything on reports.
DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;

-- 4. profiles: keep username self-editable, but hard-lock total_points/level
--    at the trigger level so no client-side UPDATE can change them, no
--    matter what value is submitted in the request.
DROP POLICY IF EXISTS "user_update_own_profile" ON public.profiles;
CREATE POLICY "user_update_own_profile_safe"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.protect_profile_scoring_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.total_points := OLD.total_points;
    NEW.level := OLD.level;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_scoring_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_scoring_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_scoring_fields();

-- 5. storage: bucket is already public=true, so photo display via
--    photo_url/public_url does not need this SELECT policy. Removing it
--    stops anyone from listing/enumerating every file in the bucket.
DROP POLICY IF EXISTS "Public can view photos" ON storage.objects;
