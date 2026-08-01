-- 1) Ocultar costos de proveedor al público
DROP POLICY IF EXISTS "Precio de venta publico para calculo" ON public.codigos_proveedor;

-- La vista pública debe seguir funcionando sin acceso directo a la tabla
ALTER VIEW public.productos_con_precio SET (security_invoker = off);
GRANT SELECT ON public.productos_con_precio TO anon, authenticated;

-- 2) Comprobantes de pago no legibles públicamente
DROP POLICY IF EXISTS "Imagenes caelum lectura publica" ON storage.objects;

CREATE POLICY "Imagenes caelum lectura publica"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'caelum_imagenes'
  AND coalesce((storage.foldername(name))[1], '') <> 'comprobantes'
);