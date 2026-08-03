
REVOKE ALL ON FUNCTION public.snapshot_costos_producto() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_costos_producto() TO service_role;
