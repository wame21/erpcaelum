ALTER VIEW public.productos_con_precio SET (security_invoker = on);

REVOKE SELECT ON public.codigos_proveedor FROM anon, authenticated;

-- Público: solo columnas no sensibles
GRANT SELECT (codigo, descripcion, precio_venta_por_gramo) ON public.codigos_proveedor TO anon;
-- Autenticados: las políticas limitan las filas a administradores
GRANT SELECT ON public.codigos_proveedor TO authenticated;
GRANT ALL ON public.codigos_proveedor TO service_role;

DROP POLICY IF EXISTS "Precio de venta publico para calculo" ON public.codigos_proveedor;
CREATE POLICY "Precio de venta publico para calculo"
ON public.codigos_proveedor
FOR SELECT
TO anon
USING (true);