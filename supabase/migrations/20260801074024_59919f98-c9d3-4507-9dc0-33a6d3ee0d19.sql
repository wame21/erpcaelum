
GRANT USAGE ON SCHEMA private TO anon;

CREATE OR REPLACE FUNCTION private.precio_gramo(_codigo text)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.precio_venta_por_gramo FROM public.codigos_proveedor c WHERE c.codigo = _codigo
$$;
REVOKE ALL ON FUNCTION private.precio_gramo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.precio_gramo(text) TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.productos_con_precio;
CREATE VIEW public.productos_con_precio
WITH (security_invoker = on) AS
  SELECT p.id, p.nombre, p.descripcion, p.categoria, p.medida, p.grosor,
         p.peso_gramos, p.stock, p.imagen_path, p.activo, p.destacado,
         p.created_at, p.updated_at,
         round(p.peso_gramos * COALESCE(private.precio_gramo(p.codigo_proveedor), 0), 2) AS precio_final
  FROM public.productos p
  WHERE p.activo = true;

GRANT SELECT ON public.productos_con_precio TO anon, authenticated;
