
-- Restrict public read access on profiles and meeting_participants.
-- The app requires login (Google), so anonymous users never need to read these.

DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_authenticated_read"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "participants_public_read" ON public.meeting_participants;
CREATE POLICY "participants_authenticated_read"
ON public.meeting_participants
FOR SELECT
TO authenticated
USING (true);

-- Also restrict meetings list to authenticated (consistency: app is login-gated)
DROP POLICY IF EXISTS "meetings_public_read" ON public.meetings;
CREATE POLICY "meetings_authenticated_read"
ON public.meetings
FOR SELECT
TO authenticated
USING (true);

-- Revoke anon Data API access (only authenticated needs it)
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.meeting_participants FROM anon;
REVOKE SELECT ON public.meetings FROM anon;

-- Lock down SECURITY DEFINER join_meeting: revoke from PUBLIC/anon, grant only to authenticated.
-- (Function performs its own auth.uid() check and atomic capacity validation; intentional pattern.)
REVOKE ALL ON FUNCTION public.join_meeting(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_meeting(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.join_meeting(uuid) TO authenticated;
