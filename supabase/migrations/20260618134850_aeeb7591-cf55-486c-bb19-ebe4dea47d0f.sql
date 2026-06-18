
REVOKE EXECUTE ON FUNCTION public.join_meeting(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_meeting(UUID) TO authenticated;
