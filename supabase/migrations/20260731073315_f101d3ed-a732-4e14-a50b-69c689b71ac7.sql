DROP POLICY IF EXISTS "Codigos son publicos para lectura" ON public.codigos_proveedor;

REVOKE SELECT ON public.codigos_proveedor FROM anon;

DROP VIEW IF EXISTS public.productos_con_precio;

CREATE VIEW public.productos_con_precio
WITH (security_invoker = off) AS
SELECT p.id,
       p.nombre,
       p.descripcion,
       p.categoria,
       p.medida,
       p.grosor,
       p.peso_gramos,
       p.imagen_path,
       p.activo,
       p.destacado,
       p.created_at,
       p.updated_at,
       round(p.peso_gramos * c.precio_venta_por_gramo, 2) AS precio_final
FROM public.productos p
JOIN public.codigos_proveedor c ON c.codigo = p.codigo_proveedor
WHERE p.activo = true;

GRANT SELECT ON public.productos_con_precio TO anon, authenticated;
GRANT ALL ON public.productos_con_precio TO service_role;