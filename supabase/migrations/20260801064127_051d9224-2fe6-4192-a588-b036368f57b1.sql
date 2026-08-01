ALTER VIEW public.productos_con_precio SET (security_invoker = on);
REVOKE ALL ON public.codigos_proveedor FROM anon;
GRANT SELECT (codigo, precio_venta_por_gramo) ON public.codigos_proveedor TO anon;
CREATE POLICY "Precio de venta publico para calculo"
  ON public.codigos_proveedor FOR SELECT TO anon USING (true);