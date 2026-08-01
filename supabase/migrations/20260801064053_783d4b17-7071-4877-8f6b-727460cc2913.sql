DROP POLICY IF EXISTS "Precio de venta publico para calculo" ON public.codigos_proveedor;
REVOKE ALL ON public.codigos_proveedor FROM anon;
GRANT SELECT ON public.codigos_proveedor TO authenticated;
GRANT ALL ON public.codigos_proveedor TO service_role;
ALTER VIEW public.productos_con_precio SET (security_invoker = off);
GRANT SELECT ON public.productos_con_precio TO anon, authenticated;