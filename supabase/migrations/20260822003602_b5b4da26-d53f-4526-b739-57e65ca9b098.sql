DROP POLICY IF EXISTS "Enlaces de imagenes de catalogo son publicos" ON public.imagenes_cache;
REVOKE ALL ON public.imagenes_cache FROM anon, authenticated;
GRANT ALL ON public.imagenes_cache TO service_role;
ALTER TABLE public.imagenes_cache ENABLE ROW LEVEL SECURITY;