CREATE TABLE public.tejidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tejidos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tejidos TO authenticated;
GRANT ALL ON public.tejidos TO service_role;

ALTER TABLE public.tejidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tejidos activos son publicos" ON public.tejidos
  FOR SELECT TO anon, authenticated USING (activo = true);

CREATE POLICY "Solo admin administra tejidos" ON public.tejidos
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tejidos_updated_at BEFORE UPDATE ON public.tejidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tejidos (nombre) VALUES ('barbado'), ('figaro'), ('chino');

DROP VIEW public.productos_con_precio;

ALTER TABLE public.productos ALTER COLUMN tejido TYPE text USING tejido::text;
ALTER TABLE public.config_margenes ALTER COLUMN tejido TYPE text USING tejido::text;

CREATE VIEW public.productos_con_precio WITH (security_invoker = on) AS
 SELECT id, sku, nombre, descripcion, categoria, medida, grosor, tejido, peso_gramos,
    stock, imagen_path, activo, destacado, created_at, updated_at,
    round(COALESCE(precio_venta, 0::numeric), 2) AS precio_final
   FROM public.productos p
  WHERE activo = true;

GRANT SELECT ON public.productos_con_precio TO anon, authenticated;
GRANT ALL ON public.productos_con_precio TO service_role;