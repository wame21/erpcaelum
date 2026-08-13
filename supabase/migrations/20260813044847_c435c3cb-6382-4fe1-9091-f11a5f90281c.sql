CREATE TABLE IF NOT EXISTS public.imagenes_cache (
  path text PRIMARY KEY,
  bucket text NOT NULL DEFAULT 'caelum_productos',
  url text NOT NULL,
  expira_en timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.imagenes_cache TO anon;
GRANT SELECT ON public.imagenes_cache TO authenticated;
GRANT ALL ON public.imagenes_cache TO service_role;

ALTER TABLE public.imagenes_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enlaces de imagenes de catalogo son publicos"
ON public.imagenes_cache FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER imagenes_cache_updated_at
BEFORE UPDATE ON public.imagenes_cache
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admin sube imagenes de producto"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'caelum_productos' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin lee imagenes de producto"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'caelum_productos' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin actualiza imagenes de producto"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'caelum_productos' AND private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'caelum_productos' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin borra imagenes de producto"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'caelum_productos' AND private.has_role(auth.uid(), 'admin'::app_role));