DROP VIEW IF EXISTS public.productos_con_precio;

CREATE VIEW public.productos_con_precio
WITH (security_invoker = on) AS
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

REVOKE SELECT ON public.codigos_proveedor FROM anon, authenticated;
GRANT SELECT (codigo, precio_venta_por_gramo) ON public.codigos_proveedor TO anon;
GRANT SELECT (codigo, descripcion, costo_por_gramo, precio_venta_por_gramo) ON public.codigos_proveedor TO authenticated;

CREATE POLICY "Precio de venta publico para calculo"
  ON public.codigos_proveedor FOR SELECT
  TO anon, authenticated
  USING (true);